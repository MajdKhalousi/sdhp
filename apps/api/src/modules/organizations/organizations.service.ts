import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { PaginatedResponse } from '../../common/types/paginated-response.type';
import { OrganizationQueryDto } from './dto/organization-query.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OnboardOrganizationDto } from './dto/onboard-organization.dto';
import { AuditLogsWriterService, toSnapshot } from '../audit-logs/audit-logs-writer.service';

// Fields returned in every organization response — deletedAt is never exposed.
const SELECT = {
  id: true,
  name: true,
  nameAr: true,
  type: true,
  phone: true,
  email: true,
  address: true,
  logoUrl: true,
  isActive: true,
  settings: true,
  createdAt: true,
  updatedAt: true,
} as const;

// Mirrors BranchesService's SELECT — duplicated here so onboard() can run
// the branch create inside the same Prisma transaction client.
const BRANCH_SELECT = {
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

// Mirrors UsersService's SELECT (minus passwordHash) — duplicated here so
// onboard() can run the admin user create inside the same transaction client.
const ADMIN_SELECT = {
  id: true,
  organizationId: true,
  branchId: true,
  phone: true,
  email: true,
  firstName: true,
  lastName: true,
  firstNameAr: true,
  lastNameAr: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const BCRYPT_ROUNDS = 12;

// Basic (non-status) fields eligible for the ORGANIZATION_UPDATED audit diff.
const BASIC_FIELDS = ['name', 'nameAr', 'type', 'phone', 'email', 'address', 'logoUrl'] as const;

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private auditWriter: AuditLogsWriterService,
  ) {}

  async findAll(query: OrganizationQueryDto, user: JwtPayload): Promise<PaginatedResponse<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where =
      user.role === UserRole.SUPER_ADMIN
        ? { deletedAt: null }
        : { id: user.organizationId, deletedAt: null };

    const [data, total] = await Promise.all([
      this.prisma.organization.findMany({ where, select: SELECT, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.organization.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string, user: JwtPayload) {
    this.assertAccess(id, user);

    const org = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
      select: SELECT,
    });

    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  create(dto: CreateOrganizationDto) {
    return this.prisma.organization.create({
      data: dto,
      select: SELECT,
    });
  }

  // Creates organization + initial branch + initial ORG_ADMIN atomically.
  // UsersService.create()/BranchesService.create() are not reused here because
  // both operate on the singleton PrismaService, not a transaction-scoped client.
  async onboard(dto: OnboardOrganizationDto, caller: JwtPayload) {
    const passwordHash = await bcrypt.hash(dto.initialAdmin.password, BCRYPT_ROUNDS);

    let result: {
      organization: Prisma.OrganizationGetPayload<{ select: typeof SELECT }>;
      branch: Prisma.BranchGetPayload<{ select: typeof BRANCH_SELECT }>;
      admin: Prisma.UserGetPayload<{ select: typeof ADMIN_SELECT }>;
    };

    try {
      result = await this.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name: dto.name,
            nameAr: dto.nameAr,
            type: dto.type,
            phone: dto.phone,
            email: dto.email,
            address: dto.address,
          },
          select: SELECT,
        });

        const branch = await tx.branch.create({
          data: {
            name: dto.initialBranch.name,
            nameAr: dto.initialBranch.nameAr,
            phone: dto.initialBranch.phone,
            address: dto.initialBranch.address,
            organizationId: organization.id,
          },
          select: BRANCH_SELECT,
        });

        const admin = await tx.user.create({
          data: {
            firstName: dto.initialAdmin.firstName,
            lastName: dto.initialAdmin.lastName,
            firstNameAr: dto.initialAdmin.firstNameAr,
            lastNameAr: dto.initialAdmin.lastNameAr,
            phone: dto.initialAdmin.phone,
            email: dto.initialAdmin.email,
            passwordHash,
            role: UserRole.ORG_ADMIN,
            branchId: null,
            isActive: true,
            organizationId: organization.id,
          },
          select: ADMIN_SELECT,
        });

        return { organization, branch, admin };
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const target = e.meta?.target;
        const targetStr = Array.isArray(target) ? target.join(',') : typeof target === 'string' ? target : '';
        if (targetStr.includes('phone')) {
          throw new ConflictException('A user with this phone number already exists');
        }
        if (targetStr.includes('email')) {
          throw new ConflictException('A user with this email already exists');
        }
        throw new ConflictException('A user with this phone or email already exists');
      }
      throw e;
    }

    await this.auditWriter.log({
      caller,
      action: 'ORGANIZATION_CREATED',
      resource: 'organization',
      resourceId: result.organization.id,
      newData: toSnapshot(result.organization),
    });
    await this.auditWriter.log({
      caller,
      action: 'BRANCH_CREATED',
      resource: 'branch',
      resourceId: result.branch.id,
      newData: toSnapshot(result.branch),
    });
    await this.auditWriter.log({
      caller,
      action: 'USER_CREATED',
      resource: 'user',
      resourceId: result.admin.id,
    });

    return result;
  }

  async update(id: string, dto: UpdateOrganizationDto, user: JwtPayload) {
    this.assertAccess(id, user);

    if (dto.isActive !== undefined && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can change organization status');
    }

    const existing = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
      select: SELECT,
    });
    if (!existing) throw new NotFoundException('Organization not found');

    const updated = await this.prisma.organization.update({
      where: { id },
      data: dto,
      select: SELECT,
    });

    const oldBasics: Record<string, unknown> = {};
    const newBasics: Record<string, unknown> = {};
    for (const field of BASIC_FIELDS) {
      if (dto[field] !== undefined && existing[field] !== updated[field]) {
        oldBasics[field] = existing[field];
        newBasics[field] = updated[field];
      }
    }

    if (Object.keys(newBasics).length > 0) {
      await this.auditWriter.log({
        caller: user,
        action: 'ORGANIZATION_UPDATED',
        resource: 'organization',
        resourceId: updated.id,
        oldData: toSnapshot(oldBasics),
        newData: toSnapshot(newBasics),
      });
    }

    if (dto.isActive !== undefined && existing.isActive !== updated.isActive) {
      await this.auditWriter.log({
        caller: user,
        action: 'ORGANIZATION_STATUS_CHANGED',
        resource: 'organization',
        resourceId: updated.id,
        oldData: toSnapshot({ isActive: existing.isActive }),
        newData: toSnapshot({ isActive: updated.isActive }),
      });
    }

    return updated;
  }

  async remove(id: string) {
    const exists = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Organization not found');

    await this.prisma.organization.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // Throws 403 if a non-SUPER_ADMIN accesses an org that is not their own.
  // SUPER_ADMIN is always allowed — the bypass here mirrors the RolesGuard bypass.
  private assertAccess(orgId: string, user: JwtPayload): void {
    if (user.role === UserRole.SUPER_ADMIN) return;
    if (user.organizationId !== orgId) {
      throw new ForbiddenException('Access to this organization is not allowed');
    }
  }
}
