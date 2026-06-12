import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, ClinicPatientLinkType, ClinicPatientStatus, InvoiceStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { PaginatedResponse } from '../../common/types/paginated-response.type';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientQueryDto } from './dto/patient-query.dto';
import { DuplicateCheckQueryDto } from './dto/duplicate-check-query.dto';
import { PlatformCandidateQueryDto } from './dto/platform-candidate-query.dto';
import { AuditLogsWriterService, toSnapshot } from '../audit-logs/audit-logs-writer.service';
import { MedicalTimelineWriterService } from '../medical-timeline/medical-timeline-writer.service';
import { MedicalTimelineEventType } from '@prisma/client';
import { assertPatientLinkedToOrg } from '../../common/helpers/patient-access.helper';

const SELECT = {
  id: true,
  organizationId: true,
  mrn: true,
  firstName: true,
  lastName: true,
  firstNameAr: true,
  lastNameAr: true,
  fatherName: true,
  fatherNameAr: true,
  motherName: true,
  motherNameAr: true,
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

type PatientSummary = PatientRecord & {
  lastVisitAt: Date | null;
  nextAppointmentAt: Date | null;
  hasOutstanding: boolean;
};

@Injectable()
export class PatientsService {
  constructor(
    private prisma: PrismaService,
    private auditWriter: AuditLogsWriterService,
    private timelineWriter: MedicalTimelineWriterService,
  ) {}

  async findAll(query: PatientQueryDto, caller: JwtPayload): Promise<PaginatedResponse<PatientSummary>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const baseWhere: Prisma.PatientWhereInput =
      caller.role === UserRole.SUPER_ADMIN
        ? { deletedAt: null }
        : {
            deletedAt: null,
            clinicLinks: {
              some: {
                organizationId: caller.organizationId,
                status:         ClinicPatientStatus.ACTIVE,
                deletedAt:      null,
              },
            },
          };

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

    if (data.length === 0) {
      return { data: [], total, page, limit };
    }

    const patientIds = data.map((p) => p.id);
    const now = new Date();

    const [visitSummaries, apptSummaries, outstandingPatients] = await Promise.all([
      this.prisma.encounter.groupBy({
        by: ['patientId'],
        where: { patientId: { in: patientIds }, deletedAt: null },
        _max: { createdAt: true },
      }),
      this.prisma.appointment.groupBy({
        by: ['patientId'],
        where: {
          patientId: { in: patientIds },
          scheduledAt: { gt: now },
          status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
        },
        _min: { scheduledAt: true },
      }),
      this.prisma.invoice.findMany({
        where: {
          patientId: { in: patientIds },
          status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] },
        },
        select: { patientId: true },
        distinct: ['patientId'],
      }),
    ]);

    const lastVisitMap  = new Map(visitSummaries.map((v) => [v.patientId, v._max.createdAt]));
    const nextApptMap   = new Map(apptSummaries.map((a) => [a.patientId, a._min.scheduledAt]));
    const outstandingSet = new Set(outstandingPatients.map((o) => o.patientId));

    const enrichedData: PatientSummary[] = data.map((patient) => ({
      ...patient,
      lastVisitAt:       lastVisitMap.get(patient.id)  ?? null,
      nextAppointmentAt: nextApptMap.get(patient.id)   ?? null,
      hasOutstanding:    outstandingSet.has(patient.id),
    }));

    return { data: enrichedData, total, page, limit };
  }

  async findOne(id: string, caller: JwtPayload) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, deletedAt: null },
      select: SELECT,
    });

    if (!patient) throw new NotFoundException('Patient not found');
    await assertPatientLinkedToOrg(this.prisma, patient.id, caller);
    return patient;
  }

  async checkDuplicate(query: DuplicateCheckQueryDto, caller: JwtPayload) {
    type DuplicateReason = 'nationalId' | 'phone' | 'name' | 'nameAndDob';

    const orgWhere: Prisma.PatientWhereInput =
      caller.role === UserRole.SUPER_ADMIN
        ? {}
        : { organizationId: caller.organizationId };

    const firstName  = query.firstName.replace(/\s+/g, ' ').trim();
    const lastName   = query.lastName.replace(/\s+/g, ' ').trim();
    const nationalId = query.nationalId?.replace(/\s+/g, ' ').trim() || undefined;
    const phoneDigits = query.phone?.replace(/\D/g, '') || undefined;
    const phoneSuffix = phoneDigits && phoneDigits.length >= 9 ? phoneDigits.slice(-9) : undefined;

    const orConditions: Prisma.PatientWhereInput[] = [
      {
        firstName: { equals: firstName, mode: 'insensitive' },
        lastName:  { equals: lastName,  mode: 'insensitive' },
      },
      {
        firstNameAr: { equals: firstName, mode: 'insensitive' },
        lastNameAr:  { equals: lastName,  mode: 'insensitive' },
      },
    ];

    if (nationalId) {
      orConditions.push({ nationalId: { equals: nationalId, mode: 'insensitive' } });
    }
    if (phoneSuffix) {
      orConditions.push({ phone: { contains: phoneSuffix } });
    }

    const DUP_SELECT = {
      id: true,
      mrn: true,
      firstName: true,
      lastName: true,
      firstNameAr: true,
      lastNameAr: true,
      phone: true,
      dateOfBirth: true,
      nationalId: true,
      isActive: true,
      deletedAt: true,
    } as const;

    const candidates = await this.prisma.patient.findMany({
      where: { ...orgWhere, OR: orConditions },
      select: DUP_SELECT,
    });

    let linkedPatientIds = new Set<string>();
    if (caller.role !== UserRole.SUPER_ADMIN && candidates.length > 0) {
      const links = await this.prisma.clinicPatient.findMany({
        where: {
          patientId: { in: candidates.map((c) => c.id) },
          organizationId: caller.organizationId,
          status: ClinicPatientStatus.ACTIVE,
          deletedAt: null,
        },
        select: { patientId: true },
      });
      linkedPatientIds = new Set(links.map((l) => l.patientId));
    }

    const matches = candidates.map((c) => {
      const reasons: DuplicateReason[] = [];

      if (nationalId && c.nationalId) {
        if (c.nationalId.replace(/\s+/g, ' ').trim().toLowerCase() === nationalId.toLowerCase()) {
          reasons.push('nationalId');
        }
      }

      if (phoneSuffix && c.phone) {
        const cDigits = c.phone.replace(/\D/g, '');
        if (cDigits.length >= 9 && cDigits.slice(-9) === phoneSuffix) {
          reasons.push('phone');
        }
      }

      const firstMatch =
        c.firstName.toLowerCase() === firstName.toLowerCase() ||
        Boolean(c.firstNameAr && c.firstNameAr.toLowerCase() === firstName.toLowerCase());
      const lastMatch =
        c.lastName.toLowerCase() === lastName.toLowerCase() ||
        Boolean(c.lastNameAr && c.lastNameAr.toLowerCase() === lastName.toLowerCase());

      if (firstMatch && lastMatch) {
        const cDob = c.dateOfBirth ? c.dateOfBirth.toISOString().split('T')[0] : null;
        if (query.dateOfBirth && cDob === query.dateOfBirth) {
          reasons.push('nameAndDob');
        } else {
          reasons.push('name');
        }
      }

      return {
        id: c.id,
        mrn: c.mrn,
        firstName: c.firstName,
        lastName: c.lastName,
        firstNameAr: c.firstNameAr,
        lastNameAr: c.lastNameAr,
        phone: c.phone,
        dateOfBirth: c.dateOfBirth ? c.dateOfBirth.toISOString().split('T')[0] : null,
        isActive: c.isActive,
        isArchived: c.deletedAt !== null,
        isAlreadyLinked: linkedPatientIds.has(c.id),
        reasons,
      };
    });

    return { matches };
  }

  async findPlatformCandidates(query: PlatformCandidateQueryDto, caller: JwtPayload) {
    if (caller.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Not allowed for this role');
    }

    const nationalId = query.nationalId?.replace(/\s+/g, ' ').trim() || undefined;
    const phoneDigits = query.phone?.replace(/\D/g, '') || undefined;
    const phoneSuffix = phoneDigits && phoneDigits.length >= 9 ? phoneDigits.slice(-9) : undefined;

    if (!nationalId && !phoneSuffix) {
      throw new BadRequestException('At least one of phone or nationalId is required');
    }

    const orConditions: Prisma.PatientWhereInput[] = [];
    if (nationalId) {
      orConditions.push({ nationalId: { equals: nationalId, mode: 'insensitive' } });
    }
    if (phoneSuffix) {
      orConditions.push({ phone: { contains: phoneSuffix } });
    }

    const PLATFORM_SELECT = {
      firstName:   true,
      firstNameAr: true,
      lastName:    true,
      lastNameAr:  true,
      phone:       true,
      dateOfBirth: true,
      nationalId:  true,
    } as const;

    const rows = await this.prisma.patient.findMany({
      where: {
        deletedAt: null,
        OR: orConditions,
        NOT: {
          clinicLinks: {
            some: {
              organizationId: caller.organizationId,
              status:         ClinicPatientStatus.ACTIVE,
              deletedAt:      null,
            },
          },
        },
      },
      select: PLATFORM_SELECT,
      take: 5,
    });

    const candidates = rows.map((r) => {
      const nationalIdMatch =
        nationalId &&
        r.nationalId &&
        r.nationalId.replace(/\s+/g, ' ').trim().toLowerCase() === nationalId.toLowerCase();

      const cDigits     = r.phone?.replace(/\D/g, '') ?? '';
      const matchReason: 'nationalId' | 'phone' = nationalIdMatch ? 'nationalId' : 'phone';
      const phoneLastFour = cDigits.length >= 4 ? cDigits.slice(-4) : null;

      return {
        firstName:         r.firstName   || null,
        firstNameAr:       r.firstNameAr || null,
        lastNameInitial:   r.lastName?.[0]?.toUpperCase()  ?? null,
        lastNameArInitial: r.lastNameAr?.[0] ?? null,
        phoneLastFour,
        birthYear:         r.dateOfBirth ? new Date(r.dateOfBirth).getFullYear() : null,
        matchReason,
      };
    });

    return { candidates };
  }

  async create(dto: CreatePatientDto, caller: JwtPayload) {
    const organizationId = await this.resolveOrgId(dto.organizationId, caller);
    const mrn = dto.mrn ?? await this.generateMrn(organizationId);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const patient = await tx.patient.create({
          data: {
            organizationId,
            mrn,
            firstName: dto.firstName,
            lastName: dto.lastName,
            firstNameAr: dto.firstNameAr,
            lastNameAr: dto.lastNameAr,
            fatherName: dto.fatherName,
            fatherNameAr: dto.fatherNameAr,
            motherName: dto.motherName,
            motherNameAr: dto.motherNameAr,
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

        await tx.clinicPatient.create({
          data: {
            organizationId,
            patientId:             patient.id,
            mrn:                   patient.mrn,
            localNotes:            patient.notes ?? null,
            linkType:              ClinicPatientLinkType.CLINIC_CREATED,
            status:                ClinicPatientStatus.ACTIVE,
            consentGiven:          false,
            consentAt:             null,
            linkedAt:              patient.createdAt,
            linkedById:            caller.sub,
            lastVisitAt:           null,
            registrationSource:    null,
            verificationCodeHash:  null,
            verificationExpiresAt: null,
            deletedAt:             null,
          },
        });

        return patient;
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
    await assertPatientLinkedToOrg(this.prisma, patient.id, caller);

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
    await assertPatientLinkedToOrg(this.prisma, patient.id, caller);

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
