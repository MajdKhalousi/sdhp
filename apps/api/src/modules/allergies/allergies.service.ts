import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { CreateAllergyDto } from './dto/create-allergy.dto';
import { UpdateAllergyDto } from './dto/update-allergy.dto';

const PATIENT_SELECT = {
  id: true,
  organizationId: true,
  mrn: true,
  firstName: true,
  lastName: true,
} as const;

const ALLERGY_SELECT = {
  id: true,
  patientId: true,
  substance: true,
  reaction: true,
  severity: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AllergiesService {
  constructor(private prisma: PrismaService) {}

  async findAll(patientId: string, caller: JwtPayload) {
    await this.resolvePatient(patientId, caller);
    return this.prisma.allergy.findMany({
      where: { patientId },
      select: ALLERGY_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(patientId: string, dto: CreateAllergyDto, caller: JwtPayload) {
    await this.resolvePatient(patientId, caller);
    return this.prisma.allergy.create({
      data: { patientId, ...dto },
      select: ALLERGY_SELECT,
    });
  }

  async update(patientId: string, id: string, dto: UpdateAllergyDto, caller: JwtPayload) {
    await this.resolvePatient(patientId, caller);
    await this.resolveAllergy(id, patientId);
    return this.prisma.allergy.update({
      where: { id },
      data: dto,
      select: ALLERGY_SELECT,
    });
  }

  async remove(patientId: string, id: string, caller: JwtPayload) {
    await this.resolvePatient(patientId, caller);
    await this.resolveAllergy(id, patientId);
    // Allergy has no deletedAt — this is a hard delete.
    await this.prisma.allergy.delete({ where: { id } });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async resolvePatient(patientId: string, caller: JwtPayload) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
      select: PATIENT_SELECT,
    });
    if (!patient) throw new NotFoundException('Patient not found');
    if (caller.role !== UserRole.SUPER_ADMIN && patient.organizationId !== caller.organizationId) {
      throw new ForbiddenException('Cannot access patient from another organization');
    }
    return patient;
  }

  private async resolveAllergy(id: string, patientId: string) {
    const allergy = await this.prisma.allergy.findFirst({
      where: { id, patientId },
      select: { id: true },
    });
    if (!allergy) throw new NotFoundException('Allergy not found');
    return allergy;
  }
}
