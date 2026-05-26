import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import {
  EncounterEventData,
  LabOrderEventData,
  MedicalFileEventData,
  PatientTimelineResponse,
  PrescriptionEventData,
  RadiologyOrderEventData,
  TimelineEvent,
  TimelineEventSource,
  TimelineEventType,
} from '../../common/types/timeline-event.type';
import { PatientTimelineQueryDto } from './dto/patient-timeline-query.dto';

// ── Select constants ───────────────────────────────────────────────────────────

const PATIENT_SELECT = {
  id: true,
  organizationId: true,
  mrn: true,
  firstName: true,
  lastName: true,
} as const;

const DOCTOR_REF_SELECT = {
  id: true,
  specialization: true,
  user: { select: { id: true, firstName: true, lastName: true } },
} as const;

const ENCOUNTER_TIMELINE_SELECT = {
  id: true,
  startedAt: true,
  endedAt: true,
  chiefComplaint: true,
  diagnosis: true,       // fetched to compute hasDiagnosis; not returned in response
  diagnosisCode: true,
  notes: true,
  treatmentPlan: true,
  followUpDate: true,
  updatedAt: true,
  doctor: { select: DOCTOR_REF_SELECT },
} as const;

const PRESCRIPTION_TIMELINE_SELECT = {
  id: true,
  encounterId: true,
  medication: true,
  dosage: true,
  frequency: true,
  duration: true,
  createdAt: true,
} as const;

const LAB_ORDER_TIMELINE_SELECT = {
  id: true,
  testName: true,
  testCode: true,
  status: true,
  priority: true,
  encounterId: true,
  createdAt: true,
  orderedBy: { select: DOCTOR_REF_SELECT },
} as const;

const RADIOLOGY_ORDER_TIMELINE_SELECT = {
  id: true,
  modality: true,
  bodyPart: true,
  status: true,
  priority: true,
  encounterId: true,
  createdAt: true,
  orderedBy: { select: DOCTOR_REF_SELECT },
} as const;

const MEDICAL_FILE_TIMELINE_SELECT = {
  id: true,
  category: true,
  mimeType: true,
  sizeBytes: true,
  description: true,
  encounterId: true,
  createdAt: true,
  uploadedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
} as const;

// ── Source metadata ────────────────────────────────────────────────────────────

const SOURCES: Record<TimelineEventType, TimelineEventSource> = {
  [TimelineEventType.ENCOUNTER]:        { module: 'encounters',    entity: 'Encounter' },
  [TimelineEventType.PRESCRIPTION]:     { module: 'prescriptions', entity: 'Prescription' },
  [TimelineEventType.LAB_ORDER]:        { module: 'labs',          entity: 'LabOrder' },
  [TimelineEventType.RADIOLOGY_ORDER]:  { module: 'radiology',     entity: 'RadiologyOrder' },
  [TimelineEventType.MEDICAL_FILE]:     { module: 'medical-files', entity: 'MedicalFile' },
};

const ALL_EVENT_TYPES: TimelineEventType[] = Object.values(TimelineEventType);

type DateRangeFilter = { gte?: Date; lte?: Date };

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable()
export class MedicalTimelineService {
  constructor(private prisma: PrismaService) {}

  async getPatientTimeline(
    patientId: string,
    query: PatientTimelineQueryDto,
    caller: JwtPayload,
  ): Promise<PatientTimelineResponse> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
      select: PATIENT_SELECT,
    });
    if (!patient) throw new NotFoundException('Patient not found');
    this.assertPatientAccess(patient.organizationId, caller);

    const { organizationId } = patient;
    const types = query.types ?? ALL_EVENT_TYPES;
    const dateFilter = this.buildDateFilter(query.from, query.to);

    const fetchers: Promise<TimelineEvent[]>[] = [];
    if (types.includes(TimelineEventType.ENCOUNTER))
      fetchers.push(this.fetchEncounters(patientId, organizationId, dateFilter));
    if (types.includes(TimelineEventType.PRESCRIPTION))
      fetchers.push(this.fetchPrescriptions(patientId, dateFilter));
    if (types.includes(TimelineEventType.LAB_ORDER))
      fetchers.push(this.fetchLabOrders(patientId, organizationId, dateFilter));
    if (types.includes(TimelineEventType.RADIOLOGY_ORDER))
      fetchers.push(this.fetchRadiologyOrders(patientId, organizationId, dateFilter));
    if (types.includes(TimelineEventType.MEDICAL_FILE))
      fetchers.push(this.fetchMedicalFiles(patientId, organizationId, dateFilter));

    const allEvents = (await Promise.all(fetchers)).flat();
    allEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    return {
      patient: {
        id: patient.id,
        mrn: patient.mrn,
        firstName: patient.firstName,
        lastName: patient.lastName,
      },
      data: allEvents.slice(skip, skip + limit),
      total: allEvents.length,
      page,
      limit,
    };
  }

  // ── Private fetch methods ──────────────────────────────────────────────────

  private async fetchEncounters(
    patientId: string,
    organizationId: string,
    dateFilter: DateRangeFilter | undefined,
  ): Promise<TimelineEvent[]> {
    const rows = await this.prisma.encounter.findMany({
      where: {
        patientId,
        organizationId,
        deletedAt: null,
        ...(dateFilter ? { startedAt: dateFilter } : {}),
      },
      select: ENCOUNTER_TIMELINE_SELECT,
    });

    return rows.map((e): TimelineEvent => ({
      type: TimelineEventType.ENCOUNTER,
      id: e.id,
      timestamp: e.startedAt,
      source: SOURCES[TimelineEventType.ENCOUNTER],
      data: {
        startedAt: e.startedAt,
        endedAt: e.endedAt,
        chiefComplaint: e.chiefComplaint,
        diagnosisCode: e.diagnosisCode,
        hasDiagnosis: e.diagnosis !== null || e.diagnosisCode !== null,
        notes: e.notes,
        treatmentPlan: e.treatmentPlan,
        followUpDate: e.followUpDate,
        updatedAt: e.updatedAt,
        doctor: {
          id: e.doctor.id,
          firstName: e.doctor.user.firstName,
          lastName: e.doctor.user.lastName,
          specialization: e.doctor.specialization,
        },
      } satisfies EncounterEventData,
    }));
  }

  private async fetchPrescriptions(
    patientId: string,
    dateFilter: DateRangeFilter | undefined,
  ): Promise<TimelineEvent[]> {
    const rows = await this.prisma.prescription.findMany({
      where: {
        deletedAt: null,
        encounter: { patientId, deletedAt: null },
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      select: PRESCRIPTION_TIMELINE_SELECT,
    });

    return rows.map((p): TimelineEvent => ({
      type: TimelineEventType.PRESCRIPTION,
      id: p.id,
      timestamp: p.createdAt,
      source: SOURCES[TimelineEventType.PRESCRIPTION],
      data: {
        encounterId: p.encounterId,
        medication: p.medication,
        dosage: p.dosage,
        frequency: p.frequency,
        duration: p.duration,
        createdAt: p.createdAt,
      } satisfies PrescriptionEventData,
    }));
  }

  private async fetchLabOrders(
    patientId: string,
    organizationId: string,
    dateFilter: DateRangeFilter | undefined,
  ): Promise<TimelineEvent[]> {
    const rows = await this.prisma.labOrder.findMany({
      where: {
        patientId,
        organizationId,
        deletedAt: null,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      select: LAB_ORDER_TIMELINE_SELECT,
    });

    return rows.map((l): TimelineEvent => ({
      type: TimelineEventType.LAB_ORDER,
      id: l.id,
      timestamp: l.createdAt,
      source: SOURCES[TimelineEventType.LAB_ORDER],
      data: {
        testName: l.testName,
        testCode: l.testCode,
        status: l.status,
        priority: l.priority,
        encounterId: l.encounterId,
        createdAt: l.createdAt,
        orderedBy: {
          id: l.orderedBy.id,
          firstName: l.orderedBy.user.firstName,
          lastName: l.orderedBy.user.lastName,
          specialization: l.orderedBy.specialization,
        },
      } satisfies LabOrderEventData,
    }));
  }

  private async fetchRadiologyOrders(
    patientId: string,
    organizationId: string,
    dateFilter: DateRangeFilter | undefined,
  ): Promise<TimelineEvent[]> {
    const rows = await this.prisma.radiologyOrder.findMany({
      where: {
        patientId,
        organizationId,
        deletedAt: null,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      select: RADIOLOGY_ORDER_TIMELINE_SELECT,
    });

    return rows.map((r): TimelineEvent => ({
      type: TimelineEventType.RADIOLOGY_ORDER,
      id: r.id,
      timestamp: r.createdAt,
      source: SOURCES[TimelineEventType.RADIOLOGY_ORDER],
      data: {
        modality: r.modality,
        bodyPart: r.bodyPart,
        status: r.status,
        priority: r.priority,
        encounterId: r.encounterId,
        createdAt: r.createdAt,
        orderedBy: {
          id: r.orderedBy.id,
          firstName: r.orderedBy.user.firstName,
          lastName: r.orderedBy.user.lastName,
          specialization: r.orderedBy.specialization,
        },
      } satisfies RadiologyOrderEventData,
    }));
  }

  private async fetchMedicalFiles(
    patientId: string,
    organizationId: string,
    dateFilter: DateRangeFilter | undefined,
  ): Promise<TimelineEvent[]> {
    const rows = await this.prisma.medicalFile.findMany({
      where: {
        patientId,
        organizationId,
        deletedAt: null,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      select: MEDICAL_FILE_TIMELINE_SELECT,
    });

    return rows.map((f): TimelineEvent => ({
      type: TimelineEventType.MEDICAL_FILE,
      id: f.id,
      timestamp: f.createdAt,
      source: SOURCES[TimelineEventType.MEDICAL_FILE],
      data: {
        category: f.category,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
        description: f.description,
        encounterId: f.encounterId,
        createdAt: f.createdAt,
        uploadedBy: {
          id: f.uploadedBy.id,
          firstName: f.uploadedBy.firstName,
          lastName: f.uploadedBy.lastName,
          role: f.uploadedBy.role,
        },
      } satisfies MedicalFileEventData,
    }));
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private assertPatientAccess(patientOrgId: string, caller: JwtPayload): void {
    if (caller.role === UserRole.SUPER_ADMIN) return;
    if (patientOrgId !== caller.organizationId) {
      throw new ForbiddenException('Access to this patient is not allowed');
    }
  }

  private buildDateFilter(from?: string, to?: string): DateRangeFilter | undefined {
    if (!from && !to) return undefined;
    return {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
}
