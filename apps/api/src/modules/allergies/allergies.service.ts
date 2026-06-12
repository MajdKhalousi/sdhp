import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { assertPatientLinkedToOrg } from '../../common/helpers/patient-access.helper';
import { CreateAllergyDto } from './dto/create-allergy.dto';
import { UpdateAllergyDto } from './dto/update-allergy.dto';
import { AuditLogsWriterService, toSnapshot } from '../audit-logs/audit-logs-writer.service';

const PATIENT_SELECT = { id: true } as const;

const ALLERGY_SELECT = {
  id: true,
  patientId: true,
  substance: true,
  reaction: true,
  severity: true,
  createdAt: true,
  updatedAt: true,
} as const;

// Includes soft-delete fields for internal use (snapshots, resolve).
const ALLERGY_FULL_SELECT = {
  ...ALLERGY_SELECT,
  deletedAt: true,
  deletedBy: true,
} as const;

@Injectable()
export class AllergiesService {
  constructor(
    private prisma: PrismaService,
    private auditWriter: AuditLogsWriterService,
  ) {}

  async findAll(patientId: string, caller: JwtPayload) {
    await this.resolvePatient(patientId, caller);
    return this.prisma.allergy.findMany({
      where: { patientId, deletedAt: null },
      select: ALLERGY_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(patientId: string, dto: CreateAllergyDto, caller: JwtPayload) {
    await this.resolvePatient(patientId, caller);
    const result = await this.prisma.allergy.create({
      data: { patientId, ...dto },
      select: ALLERGY_SELECT,
    });
    await this.auditWriter.log({
      caller,
      action: 'CREATE',
      resource: 'allergy',
      resourceId: result.id,
      newData: toSnapshot(result),
    });
    return result;
  }

  async update(patientId: string, id: string, dto: UpdateAllergyDto, caller: JwtPayload) {
    await this.resolvePatient(patientId, caller);
    const before = await this.resolveAllergy(id, patientId);
    const result = await this.prisma.allergy.update({
      where: { id },
      data: dto,
      select: ALLERGY_SELECT,
    });
    await this.auditWriter.log({
      caller,
      action: 'UPDATE',
      resource: 'allergy',
      resourceId: id,
      oldData: toSnapshot(before),
      newData: toSnapshot(result),
    });
    return result;
  }

  async remove(patientId: string, id: string, caller: JwtPayload) {
    await this.resolvePatient(patientId, caller);
    const before = await this.resolveAllergy(id, patientId);
    await this.prisma.allergy.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: caller.sub },
    });
    await this.auditWriter.log({
      caller,
      action: 'SOFT_DELETE',
      resource: 'allergy',
      resourceId: id,
      oldData: toSnapshot(before),
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async resolvePatient(patientId: string, caller: JwtPayload): Promise<void> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
      select: PATIENT_SELECT,
    });
    if (!patient) throw new NotFoundException('Patient not found');
    await assertPatientLinkedToOrg(this.prisma, patientId, caller);
  }

  private async resolveAllergy(id: string, patientId: string) {
    const allergy = await this.prisma.allergy.findFirst({
      where: { id, patientId, deletedAt: null },
      select: ALLERGY_FULL_SELECT,
    });
    if (!allergy) throw new NotFoundException('Allergy not found');
    return allergy;
  }
}
