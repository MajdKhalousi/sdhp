import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SELECT = {
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

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll(user: JwtPayload) {
    const where =
      user.role === UserRole.SUPER_ADMIN
        ? { deletedAt: null }
        : { organizationId: user.organizationId, deletedAt: null };

    return this.prisma.user.findMany({
      where,
      select: SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: JwtPayload) {
    const found = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: SELECT,
    });

    if (!found) throw new NotFoundException('User not found');
    this.assertOwnership(found.organizationId, user);
    return found;
  }

  async create(dto: CreateUserDto, user: JwtPayload) {
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
        throw new ForbiddenException('Cannot create a user for another organization');
      }
      organizationId = user.organizationId;

      if (dto.role === UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Cannot assign SUPER_ADMIN role');
      }
    }

    if (dto.branchId) {
      await this.assertBranchBelongsToOrg(dto.branchId, organizationId);
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    try {
      return await this.prisma.user.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          firstNameAr: dto.firstNameAr,
          lastNameAr: dto.lastNameAr,
          phone: dto.phone,
          email: dto.email,
          passwordHash,
          role: dto.role,
          branchId: dto.branchId,
          isActive: dto.isActive,
          organizationId,
        },
        select: SELECT,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('A user with this phone or email already exists');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateUserDto, user: JwtPayload) {
    const found = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, organizationId: true },
    });

    if (!found) throw new NotFoundException('User not found');
    this.assertOwnership(found.organizationId, user);

    if (user.role !== UserRole.SUPER_ADMIN && dto.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot assign SUPER_ADMIN role');
    }

    if (dto.branchId) {
      await this.assertBranchBelongsToOrg(dto.branchId, found.organizationId);
    }

    const { password, ...rest } = dto;
    const data: Prisma.UserUpdateInput = { ...rest };

    if (password) {
      data.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        select: SELECT,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('A user with this phone or email already exists');
      }
      throw e;
    }
  }

  async remove(id: string, user: JwtPayload) {
    const found = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, organizationId: true },
    });

    if (!found) throw new NotFoundException('User not found');
    this.assertOwnership(found.organizationId, user);

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  private assertOwnership(userOrgId: string, caller: JwtPayload): void {
    if (caller.role === UserRole.SUPER_ADMIN) return;
    if (userOrgId !== caller.organizationId) {
      throw new ForbiddenException('Access to this user is not allowed');
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
