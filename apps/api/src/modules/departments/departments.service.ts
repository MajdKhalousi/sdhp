import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { PaginatedResponse } from '../../common/types/paginated-response.type';
import { DepartmentQueryDto } from './dto/department-query.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

const SELECT = {
  id: true,
  organizationId: true,
  branchId: true,
  name: true,
  nameAr: true,
  code: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: DepartmentQueryDto, user: JwtPayload): Promise<PaginatedResponse<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where =
      user.role === UserRole.SUPER_ADMIN
        ? { deletedAt: null }
        : { organizationId: user.organizationId, deletedAt: null };

    const [data, total] = await Promise.all([
      this.prisma.department.findMany({ where, select: SELECT, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.department.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string, user: JwtPayload) {
    const dept = await this.prisma.department.findFirst({
      where: { id, deletedAt: null },
      select: SELECT,
    });

    if (!dept) throw new NotFoundException('Department not found');
    this.assertOwnership(dept.organizationId, user);
    return dept;
  }

  async create(dto: CreateDepartmentDto, user: JwtPayload) {
    let organizationId: string;

    if (user.role === UserRole.SUPER_ADMIN) {
      if (!dto.organizationId) {
        throw new BadRequestException('organizationId is required for SUPER_ADMIN');
      }
      const orgExists = await this.prisma.organization.findFirst({
        where: { id: dto.organizationId, deletedAt: null },
        select: { id: true },
      });
      if (!orgExists) throw new NotFoundException('Organization not found');
      organizationId = dto.organizationId;
    } else {
      if (dto.organizationId && dto.organizationId !== user.organizationId) {
        throw new ForbiddenException('Cannot create a department for another organization');
      }
      organizationId = user.organizationId;
    }

    if (dto.branchId) {
      await this.assertBranchBelongsToOrg(dto.branchId, organizationId);
    }

    return this.prisma.department.create({
      data: {
        name: dto.name,
        nameAr: dto.nameAr,
        code: dto.code,
        isActive: dto.isActive,
        branchId: dto.branchId,
        organizationId,
      },
      select: SELECT,
    });
  }

  async update(id: string, dto: UpdateDepartmentDto, user: JwtPayload) {
    const dept = await this.prisma.department.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, organizationId: true },
    });

    if (!dept) throw new NotFoundException('Department not found');
    this.assertOwnership(dept.organizationId, user);

    if (dto.branchId) {
      await this.assertBranchBelongsToOrg(dto.branchId, dept.organizationId);
    }

    return this.prisma.department.update({
      where: { id },
      data: dto,
      select: SELECT,
    });
  }

  async remove(id: string, user: JwtPayload) {
    const dept = await this.prisma.department.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, organizationId: true },
    });

    if (!dept) throw new NotFoundException('Department not found');
    this.assertOwnership(dept.organizationId, user);

    await this.prisma.department.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  private assertOwnership(deptOrgId: string, user: JwtPayload): void {
    if (user.role === UserRole.SUPER_ADMIN) return;
    if (deptOrgId !== user.organizationId) {
      throw new ForbiddenException('Access to this department is not allowed');
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
}
