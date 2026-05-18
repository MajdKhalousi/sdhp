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
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';

// Safe user fields — passwordHash is never selected.
const USER_SELECT = {
  id: true,
  organizationId: true,
  branchId: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  role: true,
  isActive: true,
} as const;

const SELECT = {
  id: true,
  userId: true,
  departmentId: true,
  specialization: true,
  licenseNumber: true,
  consultationMinutes: true,
  maxPatientsPerDay: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  user: { select: USER_SELECT },
} as const;

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  findAll(caller: JwtPayload) {
    const where =
      caller.role === UserRole.SUPER_ADMIN
        ? { deletedAt: null }
        : { user: { organizationId: caller.organizationId }, deletedAt: null };

    return this.prisma.doctor.findMany({
      where,
      select: SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, caller: JwtPayload) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id, deletedAt: null },
      select: SELECT,
    });

    if (!doctor) throw new NotFoundException('Doctor not found');
    this.assertOwnership(doctor.user.organizationId, caller);
    return doctor;
  }

  async create(dto: CreateDoctorDto, caller: JwtPayload) {
    const organizationId = await this.resolveOrgId(dto.organizationId, caller);

    // Validate the linked User.
    const linkedUser = await this.prisma.user.findFirst({
      where: { id: dto.userId, deletedAt: null },
      select: { id: true, organizationId: true, role: true, isActive: true },
    });

    if (!linkedUser) throw new NotFoundException('User not found');
    if (!linkedUser.isActive) throw new BadRequestException('User is inactive');
    if (linkedUser.role !== UserRole.DOCTOR) {
      throw new BadRequestException('Linked user must have role DOCTOR');
    }
    if (linkedUser.organizationId !== organizationId) {
      throw new ForbiddenException('User does not belong to this organization');
    }

    if (dto.departmentId) {
      await this.assertDeptBelongsToOrg(dto.departmentId, organizationId);
    }

    try {
      return await this.prisma.doctor.create({
        data: {
          userId: dto.userId,
          departmentId: dto.departmentId,
          specialization: dto.specialization,
          licenseNumber: dto.licenseNumber,
          consultationMinutes: dto.consultationMinutes,
          maxPatientsPerDay: dto.maxPatientsPerDay,
          isActive: dto.isActive,
        },
        select: SELECT,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('A doctor profile already exists for this user');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateDoctorDto, caller: JwtPayload) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, user: { select: { organizationId: true } } },
    });

    if (!doctor) throw new NotFoundException('Doctor not found');
    this.assertOwnership(doctor.user.organizationId, caller);

    if (dto.departmentId) {
      await this.assertDeptBelongsToOrg(dto.departmentId, doctor.user.organizationId);
    }

    return this.prisma.doctor.update({
      where: { id },
      data: dto,
      select: SELECT,
    });
  }

  async remove(id: string, caller: JwtPayload) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, user: { select: { organizationId: true } } },
    });

    if (!doctor) throw new NotFoundException('Doctor not found');
    this.assertOwnership(doctor.user.organizationId, caller);

    await this.prisma.doctor.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  private assertOwnership(doctorOrgId: string, caller: JwtPayload): void {
    if (caller.role === UserRole.SUPER_ADMIN) return;
    if (doctorOrgId !== caller.organizationId) {
      throw new ForbiddenException('Access to this doctor profile is not allowed');
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
      throw new ForbiddenException('Cannot create a doctor profile for another organization');
    }
    return caller.organizationId;
  }

  private async assertDeptBelongsToOrg(departmentId: string, organizationId: string): Promise<void> {
    const dept = await this.prisma.department.findFirst({
      where: { id: departmentId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!dept) {
      throw new BadRequestException(
        'Department does not belong to this organization or does not exist',
      );
    }
  }
}
