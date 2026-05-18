import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

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

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  findAll(user: JwtPayload) {
    if (user.role === UserRole.SUPER_ADMIN) {
      return this.prisma.organization.findMany({
        where: { deletedAt: null },
        select: SELECT,
        orderBy: { createdAt: 'desc' },
      });
    }

    // ORG_ADMIN: scoped to their own organization only.
    return this.prisma.organization.findMany({
      where: { id: user.organizationId, deletedAt: null },
      select: SELECT,
    });
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

  async update(id: string, dto: UpdateOrganizationDto, user: JwtPayload) {
    this.assertAccess(id, user);

    const exists = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Organization not found');

    return this.prisma.organization.update({
      where: { id },
      data: dto,
      select: SELECT,
    });
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
