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
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

const SELECT = {
  id: true,
  organizationId: true,
  mrn: true,
  firstName: true,
  lastName: true,
  firstNameAr: true,
  lastNameAr: true,
  dateOfBirth: true,
  gender: true,
  phone: true,
  email: true,
  nationalId: true,
  bloodType: true,
  address: true,
  emergencyName: true,
  emergencyPhone: true,
  isActive: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  findAll(caller: JwtPayload) {
    const where =
      caller.role === UserRole.SUPER_ADMIN
        ? { deletedAt: null }
        : { organizationId: caller.organizationId, deletedAt: null };

    return this.prisma.patient.findMany({
      where,
      select: SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, caller: JwtPayload) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, deletedAt: null },
      select: SELECT,
    });

    if (!patient) throw new NotFoundException('Patient not found');
    this.assertOwnership(patient.organizationId, caller);
    return patient;
  }

  async create(dto: CreatePatientDto, caller: JwtPayload) {
    const organizationId = await this.resolveOrgId(dto.organizationId, caller);
    const mrn = dto.mrn ?? this.generateMrn();

    try {
      return await this.prisma.patient.create({
        data: {
          organizationId,
          mrn,
          firstName: dto.firstName,
          lastName: dto.lastName,
          firstNameAr: dto.firstNameAr,
          lastNameAr: dto.lastNameAr,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          gender: dto.gender,
          phone: dto.phone,
          email: dto.email,
          nationalId: dto.nationalId,
          bloodType: dto.bloodType,
          address: dto.address,
          emergencyName: dto.emergencyName,
          emergencyPhone: dto.emergencyPhone,
          notes: dto.notes,
          isActive: dto.isActive,
        },
        select: SELECT,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('A patient with this MRN already exists in this organization');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdatePatientDto, caller: JwtPayload) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, organizationId: true },
    });

    if (!patient) throw new NotFoundException('Patient not found');
    this.assertOwnership(patient.organizationId, caller);

    const { ...data } = dto;

    return this.prisma.patient.update({
      where: { id },
      data: {
        ...data,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
      select: SELECT,
    });
  }

  async remove(id: string, caller: JwtPayload) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, organizationId: true },
    });

    if (!patient) throw new NotFoundException('Patient not found');
    this.assertOwnership(patient.organizationId, caller);

    await this.prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  private assertOwnership(patientOrgId: string, caller: JwtPayload): void {
    if (caller.role === UserRole.SUPER_ADMIN) return;
    if (patientOrgId !== caller.organizationId) {
      throw new ForbiddenException('Access to this patient is not allowed');
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
      throw new ForbiddenException('Cannot create a patient for another organization');
    }
    return caller.organizationId;
  }

  private generateMrn(): string {
    const date = new Date();
    const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `P-${yyyymmdd}-${rand}`;
  }
}
