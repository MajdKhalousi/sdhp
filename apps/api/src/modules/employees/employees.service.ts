import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { PaginatedResponse } from '../../common/types/paginated-response.type';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { AuditLogsWriterService, toSnapshot } from '../audit-logs/audit-logs-writer.service';

// Never select passwordHash — only the minimal fields a staff/HR screen needs
// to display "this profile is linked to account X".
const LINKED_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  firstNameAr: true,
  lastNameAr: true,
  phone: true,
  email: true,
  role: true,
  isActive: true,
  organizationId: true,
} as const;

const SELECT = {
  id: true,
  organizationId: true,
  userId: true,
  branchId: true,
  departmentId: true,
  firstName: true,
  lastName: true,
  firstNameAr: true,
  lastNameAr: true,
  jobTitle: true,
  departmentFreeText: true,
  phone: true,
  email: true,
  nationalId: true,
  dateOfBirth: true,
  gender: true,
  address: true,
  hireDate: true,
  contractStartAt: true,
  contractEndAt: true,
  employmentStatus: true,
  baseSalary: true,
  currency: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  user: { select: LINKED_USER_SELECT },
} as const;

type EmployeeRecord = Prisma.EmployeeProfileGetPayload<{ select: typeof SELECT }>;

@Injectable()
export class EmployeesService {
  constructor(
    private prisma: PrismaService,
    private auditWriter: AuditLogsWriterService,
  ) {}

  async findAll(query: EmployeeQueryDto, caller: JwtPayload): Promise<PaginatedResponse<EmployeeRecord>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.EmployeeProfileWhereInput = {
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.employmentStatus ? { employmentStatus: query.employmentStatus } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(caller.role === UserRole.SUPER_ADMIN
        ? (query.organizationId ? { organizationId: query.organizationId } : {})
        : { organizationId: caller.organizationId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.employeeProfile.findMany({ where, select: SELECT, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.employeeProfile.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string, caller: JwtPayload) {
    const found = await this.prisma.employeeProfile.findFirst({
      where: { id, deletedAt: null },
      select: SELECT,
    });

    if (!found) throw new NotFoundException('Employee profile not found');
    this.assertOwnership(found.organizationId, caller);
    return found;
  }

  async create(dto: CreateEmployeeDto, caller: JwtPayload) {
    const organizationId = await this.resolveOrgId(dto.organizationId, caller);

    if (dto.branchId) {
      await this.assertBranchBelongsToOrg(dto.branchId, organizationId);
    }
    if (dto.departmentId) {
      await this.assertDepartmentBelongsToOrg(dto.departmentId, organizationId);
    }

    const linkUserId = dto.userId ?? undefined;
    if (linkUserId) {
      await this.assertUserLinkable(linkUserId, organizationId);
    }

    try {
      const result = await this.prisma.employeeProfile.create({
        data: {
          organizationId,
          userId: linkUserId,
          branchId: dto.branchId,
          departmentId: dto.departmentId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          firstNameAr: dto.firstNameAr,
          lastNameAr: dto.lastNameAr,
          jobTitle: dto.jobTitle,
          departmentFreeText: dto.departmentFreeText,
          phone: dto.phone,
          email: dto.email,
          nationalId: dto.nationalId,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          gender: dto.gender,
          address: dto.address,
          hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
          contractStartAt: dto.contractStartAt ? new Date(dto.contractStartAt) : undefined,
          contractEndAt: dto.contractEndAt ? new Date(dto.contractEndAt) : undefined,
          employmentStatus: dto.employmentStatus,
          baseSalary: dto.baseSalary,
          currency: dto.currency,
          notes: dto.notes,
        },
        select: SELECT,
      });

      await this.auditWriter.log({
        caller,
        action: 'EMPLOYEE_PROFILE_CREATED',
        resource: 'employee_profile',
        resourceId: result.id,
        newData: toSnapshot({
          firstName: result.firstName,
          lastName: result.lastName,
          jobTitle: result.jobTitle,
          employmentStatus: result.employmentStatus,
          userId: result.userId,
        }),
      });

      if (linkUserId) {
        await this.auditWriter.log({
          caller,
          action: 'EMPLOYEE_PROFILE_LINKED_TO_USER',
          resource: 'employee_profile',
          resourceId: result.id,
          newData: toSnapshot({ userId: linkUserId }),
        });
      }

      return result;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('This user is already linked to another employee profile');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateEmployeeDto, caller: JwtPayload) {
    const found = await this.prisma.employeeProfile.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, organizationId: true, userId: true, baseSalary: true },
    });

    if (!found) throw new NotFoundException('Employee profile not found');
    this.assertOwnership(found.organizationId, caller);

    if (dto.branchId) {
      await this.assertBranchBelongsToOrg(dto.branchId, found.organizationId);
    }
    if (dto.departmentId) {
      await this.assertDepartmentBelongsToOrg(dto.departmentId, found.organizationId);
    }

    let userLinkChange: 'linked' | 'unlinked' | null = null;
    if (dto.userId !== undefined) {
      if (dto.userId === null) {
        if (found.userId !== null) userLinkChange = 'unlinked';
      } else {
        if (dto.userId !== found.userId) {
          await this.assertUserLinkable(dto.userId, found.organizationId, id);
          userLinkChange = 'linked';
        }
      }
    }

    const salaryChanging = dto.baseSalary !== undefined &&
      Number(dto.baseSalary) !== (found.baseSalary === null ? null : Number(found.baseSalary));

    const { userId, ...rest } = dto;

    try {
      const result = await this.prisma.employeeProfile.update({
        where: { id },
        data: {
          ...rest,
          ...(userId !== undefined ? { userId } : {}),
          dateOfBirth: dto.dateOfBirth !== undefined ? (dto.dateOfBirth ? new Date(dto.dateOfBirth) : null) : undefined,
          hireDate: dto.hireDate !== undefined ? (dto.hireDate ? new Date(dto.hireDate) : null) : undefined,
          contractStartAt: dto.contractStartAt !== undefined ? (dto.contractStartAt ? new Date(dto.contractStartAt) : null) : undefined,
          contractEndAt: dto.contractEndAt !== undefined ? (dto.contractEndAt ? new Date(dto.contractEndAt) : null) : undefined,
        },
        select: SELECT,
      });

      if (salaryChanging) {
        await this.auditWriter.log({
          caller,
          action: 'EMPLOYEE_PROFILE_UPDATED',
          resource: 'employee_profile',
          resourceId: id,
          oldData: toSnapshot({ baseSalary: found.baseSalary }),
          newData: toSnapshot({ baseSalary: result.baseSalary }),
        });
      } else {
        await this.auditWriter.log({
          caller,
          action: 'EMPLOYEE_PROFILE_UPDATED',
          resource: 'employee_profile',
          resourceId: id,
        });
      }

      if (userLinkChange === 'linked') {
        await this.auditWriter.log({
          caller,
          action: 'EMPLOYEE_PROFILE_LINKED_TO_USER',
          resource: 'employee_profile',
          resourceId: id,
          newData: toSnapshot({ userId: result.userId }),
        });
      } else if (userLinkChange === 'unlinked') {
        await this.auditWriter.log({
          caller,
          action: 'EMPLOYEE_PROFILE_UNLINKED_FROM_USER',
          resource: 'employee_profile',
          resourceId: id,
          oldData: toSnapshot({ userId: found.userId }),
        });
      }

      return result;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('This user is already linked to another employee profile');
      }
      throw e;
    }
  }

  async remove(id: string, caller: JwtPayload) {
    const found = await this.prisma.employeeProfile.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, organizationId: true },
    });

    if (!found) throw new NotFoundException('Employee profile not found');
    this.assertOwnership(found.organizationId, caller);

    await this.prisma.employeeProfile.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditWriter.log({
      caller,
      action: 'EMPLOYEE_PROFILE_DEACTIVATED',
      resource: 'employee_profile',
      resourceId: id,
    });
  }

  private assertOwnership(profileOrgId: string, caller: JwtPayload): void {
    if (caller.role === UserRole.SUPER_ADMIN) return;
    if (profileOrgId !== caller.organizationId) {
      throw new ForbiddenException('Access to this employee profile is not allowed');
    }
  }

  private async resolveOrgId(dtoOrgId: string | undefined, caller: JwtPayload): Promise<string> {
    if (caller.role === UserRole.SUPER_ADMIN) {
      if (!dtoOrgId) throw new BadRequestException('organizationId is required for SUPER_ADMIN');
      const org = await this.prisma.organization.findFirst({
        where: { id: dtoOrgId, deletedAt: null },
        select: { id: true },
      });
      if (!org) throw new NotFoundException('Organization not found');
      return dtoOrgId;
    }

    if (dtoOrgId && dtoOrgId !== caller.organizationId) {
      throw new ForbiddenException('Cannot create an employee profile for another organization');
    }
    return caller.organizationId;
  }

  private async assertUserLinkable(userId: string, organizationId: string, excludeProfileId?: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, organizationId: true },
    });
    if (!user) throw new NotFoundException('Linked user not found');
    if (user.organizationId !== organizationId) {
      throw new ForbiddenException('Linked user must belong to the same organization as the employee profile');
    }

    const existingLink = await this.prisma.employeeProfile.findFirst({
      where: {
        userId,
        deletedAt: null,
        ...(excludeProfileId ? { id: { not: excludeProfileId } } : {}),
      },
      select: { id: true },
    });
    if (existingLink) {
      throw new ConflictException('This user is already linked to another employee profile');
    }
  }

  private async assertBranchBelongsToOrg(branchId: string, organizationId: string): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!branch) {
      throw new BadRequestException('Branch does not belong to this organization or does not exist');
    }
  }

  private async assertDepartmentBelongsToOrg(departmentId: string, organizationId: string): Promise<void> {
    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!department) {
      throw new BadRequestException('Department does not belong to this organization or does not exist');
    }
  }
}
