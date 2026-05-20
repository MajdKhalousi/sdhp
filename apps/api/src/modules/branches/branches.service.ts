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
import { BranchQueryDto } from './dto/branch-query.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

// Fields returned in every branch response — deletedAt is never exposed.
const SELECT = {
  id: true,
  organizationId: true,
  name: true,
  nameAr: true,
  phone: true,
  address: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: BranchQueryDto, user: JwtPayload): Promise<PaginatedResponse<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where =
      user.role === UserRole.SUPER_ADMIN
        ? { deletedAt: null }
        : { organizationId: user.organizationId, deletedAt: null };

    const [data, total] = await Promise.all([
      this.prisma.branch.findMany({ where, select: SELECT, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.branch.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string, user: JwtPayload) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, deletedAt: null },
      select: SELECT,
    });

    if (!branch) throw new NotFoundException('Branch not found');
    this.assertOwnership(branch.organizationId, user);
    return branch;
  }

  async create(dto: CreateBranchDto, user: JwtPayload) {
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
      // ORG_ADMIN: org is always their own. If they supply a different one, reject it.
      if (dto.organizationId && dto.organizationId !== user.organizationId) {
        throw new ForbiddenException('Cannot create a branch for another organization');
      }
      organizationId = user.organizationId;
    }

    return this.prisma.branch.create({
      data: {
        name: dto.name,
        nameAr: dto.nameAr,
        phone: dto.phone,
        address: dto.address,
        organizationId,
      },
      select: SELECT,
    });
  }

  async update(id: string, dto: UpdateBranchDto, user: JwtPayload) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, organizationId: true },
    });

    if (!branch) throw new NotFoundException('Branch not found');
    this.assertOwnership(branch.organizationId, user);

    return this.prisma.branch.update({
      where: { id },
      data: dto,
      select: SELECT,
    });
  }

  async remove(id: string, user: JwtPayload) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, organizationId: true },
    });

    if (!branch) throw new NotFoundException('Branch not found');
    this.assertOwnership(branch.organizationId, user);

    await this.prisma.branch.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // Throws 403 if ORG_ADMIN tries to operate on a branch outside their organization.
  private assertOwnership(branchOrgId: string, user: JwtPayload): void {
    if (user.role === UserRole.SUPER_ADMIN) return;
    if (branchOrgId !== user.organizationId) {
      throw new ForbiddenException('Access to this branch is not allowed');
    }
  }
}
