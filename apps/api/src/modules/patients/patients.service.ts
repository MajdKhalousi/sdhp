import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { PaginatedResponse } from '../../common/types/paginated-response.type';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientQueryDto } from './dto/patient-query.dto';
import { AuditLogsWriterService, toSnapshot } from '../audit-logs/audit-logs-writer.service';
import { MedicalTimelineWriterService } from '../medical-timeline/medical-timeline-writer.service';
import { MedicalTimelineEventType } from '@prisma/client';

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
  city: true,
  chronicDiseases: true,
  emergencyName: true,
  emergencyPhone: true,
  isActive: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const;

type PatientRecord = Prisma.PatientGetPayload<{ select: typeof SELECT }>;

@Injectable()
export class PatientsService {
  constructor(
    private prisma: PrismaService,
    private auditWriter: AuditLogsWriterService,
    private timelineWriter: MedicalTimelineWriterService,
  ) {}

  async findAll(query: PatientQueryDto, caller: JwtPayload): Promise<PaginatedResponse<PatientRecord>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const baseWhere: Prisma.PatientWhereInput =
      caller.role === UserRole.SUPER_ADMIN
        ? { deletedAt: null }
        : { organizationId: caller.organizationId, deletedAt: null };

    const searchRaw = (query.search ?? '').replace(/\s+/g, ' ').trim();
    const tokens = searchRaw ? searchRaw.split(' ') : [];

    const where: Prisma.PatientWhereInput =
      tokens.length === 0
        ? baseWhere
        : {
            ...baseWhere,
            AND: tokens.map((token) => ({
              OR: [
                { firstName:   { contains: token, mode: 'insensitive' } },
                { lastName:    { contains: token, mode: 'insensitive' } },
                { firstNameAr: { contains: token, mode: 'insensitive' } },
                { lastNameAr:  { contains: token, mode: 'insensitive' } },
                { mrn:         { contains: token, mode: 'insensitive' } },
                { phone:       { contains: token } },
                { nationalId:  { contains: token, mode: 'insensitive' } },
              ],
            })),
          };

    const [data, total] = await Promise.all([
      this.prisma.patient.findMany({ where, select: SELECT, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.patient.count({ where }),
    ]);

    return { data, total, page, limit };
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
    const mrn = dto.mrn ?? await this.generateMrn(organizationId);

    try {
      const result = await this.prisma.patient.create({
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
          city: dto.city,
          chronicDiseases: dto.chronicDiseases,
          emergencyName: dto.emergencyName,
          emergencyPhone: dto.emergencyPhone,
          notes: dto.notes,
          isActive: dto.isActive,
        },
        select: SELECT,
      });
      await this.auditWriter.log({
        caller,
        action: 'CREATE',
        resource: 'patient',
        resourceId: result.id,
        newData: toSnapshot(result),
      });
      await this.timelineWriter.log({
        organizationId,
        patientId: result.id,
        eventType: MedicalTimelineEventType.PATIENT_CREATED,
        createdById: caller.sub,
        metadata: { mrn: result.mrn },
      });
      return result;
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
      select: SELECT,
    });

    if (!patient) throw new NotFoundException('Patient not found');
    this.assertOwnership(patient.organizationId, caller);

    const { ...data } = dto;

    const result = await this.prisma.patient.update({
      where: { id },
      data: {
        ...data,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
      select: SELECT,
    });
    await this.auditWriter.log({
      caller,
      action: 'UPDATE',
      resource: 'patient',
      resourceId: id,
      oldData: toSnapshot(patient),
      newData: toSnapshot(result),
    });
    await this.timelineWriter.log({
      organizationId: patient.organizationId,
      patientId: id,
      eventType: MedicalTimelineEventType.PATIENT_UPDATED,
      createdById: caller.sub,
      metadata: { fields: Object.keys(dto) },
    });
    return result;
  }

  async remove(id: string, caller: JwtPayload) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, deletedAt: null },
      select: SELECT,
    });

    if (!patient) throw new NotFoundException('Patient not found');
    this.assertOwnership(patient.organizationId, caller);

    await this.prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.auditWriter.log({
      caller,
      action: 'SOFT_DELETE',
      resource: 'patient',
      resourceId: id,
      oldData: toSnapshot(patient),
    });
    await this.timelineWriter.log({
      organizationId: patient.organizationId,
      patientId: id,
      eventType: MedicalTimelineEventType.PATIENT_ARCHIVED,
      createdById: caller.sub,
      metadata: null,
    });
  }

  private assertOwnership(patientOrgId: string, caller: JwtPayload): void {
    if (caller.role === UserRole.SUPER_ADMIN) return;
    if (patientOrgId !== caller.organizationId) {
      throw new NotFoundException('Patient not found');
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

    return caller.organizationId;
  }

  private async generateMrn(organizationId: string): Promise<string> {
    // Find the highest-numbered MRN in this org (format MRN-NNNNNN).
    // Lexicographic DESC works correctly because all suffixes are zero-padded to 6 digits.
    const last = await this.prisma.patient.findFirst({
      where: { organizationId, mrn: { startsWith: 'MRN-' } },
      orderBy: { mrn: 'desc' },
      select: { mrn: true },
    });
    let next = 1;
    if (last?.mrn) {
      const n = parseInt(last.mrn.slice(4), 10);
      if (!isNaN(n)) next = n + 1;
    }
    return `MRN-${String(next).padStart(6, '0')}`;
  }
}
