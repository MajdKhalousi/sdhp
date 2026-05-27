import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClinicalReportStatus, MedicalTimelineEventType, UserRole } from '@prisma/client';
import { MedicalTimelineWriterService } from '../medical-timeline/medical-timeline-writer.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { CreateClinicalReportDto } from './dto/create-clinical-report.dto';
import { UpdateClinicalReportDto } from './dto/update-clinical-report.dto';
import { QueryClinicalReportsDto } from './dto/query-clinical-reports.dto';

// ── Select constants ───────────────────────────────────────────────────────

const CREATED_BY_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  role: true,
} as const;

const PATIENT_SELECT = {
  id: true,
  mrn: true,
  firstName: true,
  lastName: true,
  organizationId: true,
} as const;

const ENCOUNTER_SELECT = {
  id: true,
  organizationId: true,
  patientId: true,
  startedAt: true,
} as const;

const REPORT_SELECT = {
  id: true,
  organizationId: true,
  patientId: true,
  encounterId: true,
  createdById: true,
  title: true,
  content: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  patient: { select: PATIENT_SELECT },
  encounter: { select: ENCOUNTER_SELECT },
  createdBy: { select: CREATED_BY_SELECT },
} as const;

// ── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class ClinicalReportsService {
  constructor(
    private prisma: PrismaService,
    private timelineWriter: MedicalTimelineWriterService,
  ) {}

  async create(dto: CreateClinicalReportDto, caller: JwtPayload) {
    const orgId = caller.role === UserRole.SUPER_ADMIN
      ? await this.resolveOrgFromPatient(dto.patientId)
      : caller.organizationId;

    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, deletedAt: null },
      select: { id: true, organizationId: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    if (patient.organizationId !== orgId) {
      throw new ForbiddenException('Patient does not belong to this organization');
    }

    await this.assertEncounterBelongsToOrgAndPatient(dto.encounterId, orgId, dto.patientId);

    const report = await this.prisma.clinicalReport.create({
      data: {
        organizationId: orgId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        createdById: caller.sub,
        title: dto.title,
        content: dto.content,
        status: dto.status ?? ClinicalReportStatus.DRAFT,
      },
      select: REPORT_SELECT,
    });

    void this.timelineWriter.log({
      organizationId: orgId,
      patientId: dto.patientId,
      eventType: MedicalTimelineEventType.CLINICAL_REPORT_CREATED,
      createdById: caller.sub,
      metadata: {
        reportId: report.id,
        title: report.title,
        status: report.status,
        encounterId: report.encounterId,
      },
    });

    return report;
  }

  async findAll(query: QueryClinicalReportsDto, caller: JwtPayload) {
    const orgId = this.resolveReadOrgId(query, caller);

    return this.prisma.clinicalReport.findMany({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
        ...(query.patientId ? { patientId: query.patientId } : {}),
        ...(query.encounterId ? { encounterId: query.encounterId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.createdById ? { createdById: query.createdById } : {}),
        deletedAt: null,
      },
      select: REPORT_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, caller: JwtPayload) {
    const report = await this.fetchReport(id);
    this.assertOrgAccess(report, caller);
    return report;
  }

  async findByPatient(patientId: string, caller: JwtPayload) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
      select: { id: true, organizationId: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    if (caller.role !== UserRole.SUPER_ADMIN && patient.organizationId !== caller.organizationId) {
      throw new ForbiddenException('Cannot access patient from another organization');
    }

    return this.prisma.clinicalReport.findMany({
      where: { patientId, deletedAt: null },
      select: REPORT_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdateClinicalReportDto, caller: JwtPayload) {
    const report = await this.fetchReport(id);
    this.assertOrgAccess(report, caller);

    if (caller.role === UserRole.DOCTOR && report.createdById !== caller.sub) {
      throw new ForbiddenException('Doctors can only edit their own clinical reports');
    }

    if (report.status === ClinicalReportStatus.FINALIZED) {
      throw new ForbiddenException('Finalized reports cannot be modified');
    }

    return this.prisma.clinicalReport.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      select: REPORT_SELECT,
    });
  }

  async remove(id: string, caller: JwtPayload) {
    const report = await this.fetchReport(id);
    this.assertOrgAccess(report, caller);

    if (caller.role === UserRole.DOCTOR && report.createdById !== caller.sub) {
      throw new ForbiddenException('Doctors can only delete their own clinical reports');
    }

    if (report.status === ClinicalReportStatus.FINALIZED) {
      throw new ForbiddenException('Finalized reports cannot be deleted');
    }

    return this.prisma.clinicalReport.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: REPORT_SELECT,
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async resolveOrgFromPatient(patientId: string): Promise<string> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
      select: { organizationId: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    return patient.organizationId;
  }

  private resolveReadOrgId(query: QueryClinicalReportsDto, caller: JwtPayload): string | undefined {
    if (caller.role === UserRole.SUPER_ADMIN) return query.organizationId;
    if (query.organizationId && query.organizationId !== caller.organizationId) {
      throw new ForbiddenException('Cannot access clinical reports for another organization');
    }
    return caller.organizationId;
  }

  private async fetchReport(id: string) {
    const report = await this.prisma.clinicalReport.findFirst({
      where: { id, deletedAt: null },
      select: REPORT_SELECT,
    });
    if (!report) throw new NotFoundException('Clinical report not found');
    return report;
  }

  private assertOrgAccess(report: { organizationId: string }, caller: JwtPayload): void {
    if (caller.role !== UserRole.SUPER_ADMIN && report.organizationId !== caller.organizationId) {
      throw new ForbiddenException('Cannot access clinical report from another organization');
    }
  }

  private async assertEncounterBelongsToOrgAndPatient(
    encounterId: string,
    orgId: string,
    patientId: string,
  ): Promise<void> {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, organizationId: orgId, patientId, deletedAt: null },
      select: { id: true },
    });
    if (!encounter) {
      throw new BadRequestException('Encounter does not belong to this organization and patient');
    }
  }
}
