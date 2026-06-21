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
import { CreateEmployeeDto, CreateEmployeeAccountDto, EmployeeAccountMode } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { AuditLogsWriterService, toSnapshot } from '../audit-logs/audit-logs-writer.service';
import { UsersService } from '../users/users.service';

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

// ACCOUNTANT keeps read access to Employees for billing/accounting context
// (e.g. resolving who an invoice or payment is associated with), but must
// not receive compensation or identity-document fields — those are HR data,
// not billing data, mirroring the existing, deliberate exclusion of
// ACCOUNTANT from Employee Documents and Payroll.
type AccountantSafeEmployeeRecord = Omit<EmployeeRecord, 'baseSalary' | 'nationalId' | 'dateOfBirth' | 'address'>;

@Injectable()
export class EmployeesService {
  constructor(
    private prisma: PrismaService,
    private auditWriter: AuditLogsWriterService,
    private usersService: UsersService,
  ) {}

  async findAll(
    query: EmployeeQueryDto,
    caller: JwtPayload,
  ): Promise<PaginatedResponse<EmployeeRecord | AccountantSafeEmployeeRecord>> {
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

    const sanitized = data.map((record) => this.redactForAccountant(record, caller));
    return { data: sanitized, total, page, limit };
  }

  async findOne(id: string, caller: JwtPayload, options?: { includeDeleted?: boolean }) {
    const found = await this.prisma.employeeProfile.findFirst({
      where: { id, ...(options?.includeDeleted ? {} : { deletedAt: null }) },
      select: SELECT,
    });

    if (!found) throw new NotFoundException('Employee profile not found');
    this.assertOwnership(found.organizationId, caller);
    return this.redactForAccountant(found, caller);
  }

  async create(dto: CreateEmployeeDto, caller: JwtPayload) {
    const organizationId = await this.resolveOrgId(dto.organizationId, caller);

    if (dto.branchId) {
      await this.assertBranchBelongsToOrg(dto.branchId, organizationId);
    }
    if (dto.departmentId) {
      await this.assertDepartmentBelongsToOrg(dto.departmentId, organizationId);
    }

    const accountMode = this.resolveAccountMode(dto);

    if (accountMode === EmployeeAccountMode.NONE) {
      if (dto.userId) throw new BadRequestException('userId must not be provided when accountMode is NONE');
      if (dto.account) throw new BadRequestException('account must not be provided when accountMode is NONE');
      return this.createProfileOnly(dto, caller, organizationId, undefined);
    }

    if (accountMode === EmployeeAccountMode.LINK_EXISTING) {
      if (!dto.userId) throw new BadRequestException('userId is required when accountMode is LINK_EXISTING');
      if (dto.account) throw new BadRequestException('account must not be provided when accountMode is LINK_EXISTING');
      await this.assertUserLinkable(dto.userId, organizationId);
      return this.createProfileOnly(dto, caller, organizationId, dto.userId);
    }

    // CREATE_NEW
    if (dto.userId) throw new BadRequestException('userId must not be provided when accountMode is CREATE_NEW');
    if (!dto.account) throw new BadRequestException('account is required when accountMode is CREATE_NEW');
    return this.createProfileWithNewAccount(dto, caller, organizationId, dto.account);
  }

  // Backward-compatible inference: existing callers never send accountMode.
  // userId present -> LINK_EXISTING (today's behavior); no userId -> NONE
  // (today's behavior). An explicit accountMode always wins.
  private resolveAccountMode(dto: CreateEmployeeDto): EmployeeAccountMode {
    if (dto.accountMode) return dto.accountMode;
    return dto.userId ? EmployeeAccountMode.LINK_EXISTING : EmployeeAccountMode.NONE;
  }

  // NONE and LINK_EXISTING — identical to the pre-146B create() body.
  private async createProfileOnly(
    dto: CreateEmployeeDto,
    caller: JwtPayload,
    organizationId: string,
    linkUserId: string | undefined,
  ) {
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

  // CREATE_NEW — User and EmployeeProfile created in one Prisma transaction.
  // If the User insert fails (e.g. duplicate phone/email), the transaction
  // never reaches the EmployeeProfile insert. If the EmployeeProfile insert
  // fails for any reason, the User insert rolls back too — no orphan User
  // can result from this path. Audit logs are written only after the
  // transaction has committed, so a rolled-back attempt never produces a
  // log claiming something was created.
  private async createProfileWithNewAccount(
    dto: CreateEmployeeDto,
    caller: JwtPayload,
    organizationId: string,
    account: CreateEmployeeAccountDto,
  ) {
    const { profile, newUser } = await this.prisma.$transaction(async (tx) => {
      let createdUser;
      try {
        createdUser = await this.usersService.createForEmployeeLink(
          account,
          caller,
          organizationId,
          {
            firstName: dto.firstName,
            lastName: dto.lastName,
            firstNameAr: dto.firstNameAr,
            lastNameAr: dto.lastNameAr,
          },
          tx,
        );
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          throw new ConflictException('A user with this phone or email already exists');
        }
        throw e;
      }

      try {
        const createdProfile = await tx.employeeProfile.create({
          data: {
            organizationId,
            userId: createdUser.id,
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
        return { profile: createdProfile, newUser: createdUser };
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          throw new ConflictException('This user is already linked to another employee profile');
        }
        throw e;
      }
    });

    await this.auditWriter.log({
      caller,
      action: 'USER_CREATED',
      resource: 'user',
      resourceId: newUser.id,
    });
    await this.auditWriter.log({
      caller,
      action: 'EMPLOYEE_PROFILE_CREATED',
      resource: 'employee_profile',
      resourceId: profile.id,
      newData: toSnapshot({
        firstName: profile.firstName,
        lastName: profile.lastName,
        jobTitle: profile.jobTitle,
        employmentStatus: profile.employmentStatus,
        userId: profile.userId,
      }),
    });
    await this.auditWriter.log({
      caller,
      action: 'EMPLOYEE_PROFILE_LINKED_TO_USER',
      resource: 'employee_profile',
      resourceId: profile.id,
      newData: toSnapshot({ userId: profile.userId }),
    });

    return profile;
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

  // Restore is the exact inverse of remove() above — it only clears
  // deletedAt. employmentStatus is left exactly as it was (remove() never
  // touches it either), so a profile that was ON_LEAVE/TERMINATED before
  // being archived comes back in that same state, not silently reset to
  // ACTIVE. No deletedAt filter in the lookup — restore must be able to
  // find the record regardless of its current soft-delete state.
  async restore(id: string, caller: JwtPayload) {
    const found = await this.prisma.employeeProfile.findFirst({
      where: { id },
      select: { id: true, organizationId: true, deletedAt: true, employmentStatus: true },
    });

    if (!found) throw new NotFoundException('Employee profile not found');
    this.assertOwnership(found.organizationId, caller);

    const result = await this.prisma.employeeProfile.update({
      where: { id },
      data: { deletedAt: null },
      select: SELECT,
    });

    await this.auditWriter.log({
      caller,
      action: 'EMPLOYEE_PROFILE_RESTORED',
      resource: 'employee_profile',
      resourceId: id,
      oldData: toSnapshot({ deletedAt: found.deletedAt, employmentStatus: found.employmentStatus }),
      newData: toSnapshot({ deletedAt: result.deletedAt, employmentStatus: result.employmentStatus }),
    });

    return result;
  }

  private redactForAccountant(
    record: EmployeeRecord,
    caller: JwtPayload,
  ): EmployeeRecord | AccountantSafeEmployeeRecord {
    if (caller.role !== UserRole.ACCOUNTANT) return record;
    const { baseSalary, nationalId, dateOfBirth, address, ...safe } = record;
    return safe;
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
