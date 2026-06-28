import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { assertPatientLinkedToOrg } from '../../common/helpers/patient-access.helper';
import { ServiceExecutionStatus } from '@prisma/client';
import {
  ClinicalReportEventData,
  EncounterEventData,
  InvoiceEventData,
  LabOrderEventData,
  MedicalFileEventData,
  PatientTimelineResponse,
  PaymentEventData,
  PrescriptionEventData,
  RadiologyOrderEventData,
  ServiceCancelledEventData,
  ServiceExecutedEventData,
  ServiceRequestedEventData,
  TimelineEvent,
  TimelineEventSource,
  TimelineEventType,
} from '../../common/types/timeline-event.type';
import { PatientTimelineQueryDto } from './dto/patient-timeline-query.dto';

// ── Select constants ───────────────────────────────────────────────────────────

const PATIENT_SELECT = {
  id: true,
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
  historyOfPresentIllness: true,
  diagnosis: true,       // fetched to compute hasDiagnosis; not returned in response
  diagnosisCode: true,
  notes: true,
  treatmentPlan: true,
  patientInstructions: true,
  followUpDate: true,
  vitals: true,
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

const CLINICAL_REPORT_TIMELINE_SELECT = {
  id: true,
  title: true,
  status: true,
  encounterId: true,
  createdAt: true,
  createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
} as const;

const INVOICE_TIMELINE_SELECT = {
  id: true,
  invoiceNumber: true,
  status: true,
  totalAmount: true,
  paidAmount: true,
  issuedAt: true,
  appointmentId: true,
  encounterId: true,
} as const;

const PAYMENT_TIMELINE_SELECT = {
  id: true,
  invoiceId: true,
  amount: true,
  method: true,
  paidAt: true,
  voidedAt: true,
  receivedBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

const SERVICE_REQUEST_TIMELINE_SELECT = {
  id: true,
  requestedServiceName: true,
  quantity: true,
  notes: true,
  executionStatus: true,
  createdAt: true,
  executedAt: true,
  cancelledAt: true,
  cancelReason: true,
  requestedBy: { select: { id: true, firstName: true, lastName: true } },
  executedBy: { select: { id: true, firstName: true, lastName: true } },
  doctor: { select: DOCTOR_REF_SELECT },
} as const;

// ── Source metadata ────────────────────────────────────────────────────────────

const SOURCES: Record<TimelineEventType, TimelineEventSource> = {
  [TimelineEventType.ENCOUNTER]:               { module: 'encounters',       entity: 'Encounter' },
  [TimelineEventType.PRESCRIPTION]:            { module: 'prescriptions',    entity: 'Prescription' },
  [TimelineEventType.LAB_ORDER]:               { module: 'labs',             entity: 'LabOrder' },
  [TimelineEventType.RADIOLOGY_ORDER]:         { module: 'radiology',        entity: 'RadiologyOrder' },
  [TimelineEventType.MEDICAL_FILE]:            { module: 'medical-files',    entity: 'MedicalFile' },
  [TimelineEventType.CLINICAL_REPORT_CREATED]: { module: 'clinical-reports', entity: 'ClinicalReport' },
  [TimelineEventType.INVOICE_ISSUED]:          { module: 'billing',          entity: 'Invoice' },
  [TimelineEventType.PAYMENT_RECORDED]:        { module: 'billing',          entity: 'Payment' },
  [TimelineEventType.SERVICE_REQUESTED]:       { module: 'medical-service-requests', entity: 'MedicalServiceRequest' },
  [TimelineEventType.SERVICE_EXECUTED]:        { module: 'medical-service-requests', entity: 'MedicalServiceRequest' },
  [TimelineEventType.SERVICE_CANCELLED]:       { module: 'medical-service-requests', entity: 'MedicalServiceRequest' },
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
    await assertPatientLinkedToOrg(this.prisma, patientId, caller);

    const organizationId = caller.role !== UserRole.SUPER_ADMIN ? caller.organizationId : undefined;
    const types = query.types ?? ALL_EVENT_TYPES;
    const dateFilter = this.buildDateFilter(query.from, query.to);

    const fetchers: Promise<TimelineEvent[]>[] = [];
    if (types.includes(TimelineEventType.ENCOUNTER))
      fetchers.push(this.fetchEncounters(patientId, organizationId, dateFilter));
    if (types.includes(TimelineEventType.PRESCRIPTION))
      fetchers.push(this.fetchPrescriptions(patientId, organizationId, dateFilter));
    if (types.includes(TimelineEventType.LAB_ORDER))
      fetchers.push(this.fetchLabOrders(patientId, organizationId, dateFilter));
    if (types.includes(TimelineEventType.RADIOLOGY_ORDER))
      fetchers.push(this.fetchRadiologyOrders(patientId, organizationId, dateFilter));
    if (types.includes(TimelineEventType.MEDICAL_FILE))
      fetchers.push(this.fetchMedicalFiles(patientId, organizationId, dateFilter));
    if (types.includes(TimelineEventType.CLINICAL_REPORT_CREATED))
      fetchers.push(this.fetchClinicalReports(patientId, organizationId, dateFilter));
    if (types.includes(TimelineEventType.INVOICE_ISSUED))
      fetchers.push(this.fetchInvoices(patientId, organizationId, dateFilter));
    if (types.includes(TimelineEventType.PAYMENT_RECORDED))
      fetchers.push(this.fetchPayments(patientId, organizationId, dateFilter));
    const serviceRequestTypes = [
      TimelineEventType.SERVICE_REQUESTED,
      TimelineEventType.SERVICE_EXECUTED,
      TimelineEventType.SERVICE_CANCELLED,
    ].filter((t) => types.includes(t));
    if (serviceRequestTypes.length > 0)
      fetchers.push(this.fetchServiceRequestEvents(patientId, organizationId, dateFilter, serviceRequestTypes));

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
    organizationId: string | undefined,
    dateFilter: DateRangeFilter | undefined,
  ): Promise<TimelineEvent[]> {
    const rows = await this.prisma.encounter.findMany({
      where: {
        patientId,
        ...(organizationId ? { organizationId } : {}),
        deletedAt: null,
        ...(dateFilter ? { startedAt: dateFilter } : {}),
      },
      select: ENCOUNTER_TIMELINE_SELECT,
    });

    if (rows.length === 0) return [];

    const encounterIds = rows.map((e) => e.id);

    const [prescGroups, labGroups, radGroups, fileGroups, repGroups] = await Promise.all([
      this.prisma.prescription.groupBy({
        by: ['encounterId'],
        where: { encounterId: { in: encounterIds }, deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.labOrder.groupBy({
        by: ['encounterId'],
        where: { encounterId: { in: encounterIds }, deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.radiologyOrder.groupBy({
        by: ['encounterId'],
        where: { encounterId: { in: encounterIds }, deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.medicalFile.groupBy({
        by: ['encounterId'],
        where: { encounterId: { in: encounterIds }, deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.clinicalReport.groupBy({
        by: ['encounterId'],
        where: { encounterId: { in: encounterIds }, deletedAt: null },
        _count: { _all: true },
      }),
    ]);

    const prescMap = new Map(prescGroups.map((g) => [g.encounterId, g._count._all]));
    const labMap   = new Map(labGroups.filter((g) => g.encounterId !== null).map((g) => [g.encounterId!, g._count._all]));
    const radMap   = new Map(radGroups.filter((g) => g.encounterId !== null).map((g) => [g.encounterId!, g._count._all]));
    const fileMap  = new Map(fileGroups.filter((g) => g.encounterId !== null).map((g) => [g.encounterId!, g._count._all]));
    const repMap   = new Map(repGroups.filter((g) => g.encounterId !== null).map((g) => [g.encounterId!, g._count._all]));

    return rows.map((e): TimelineEvent => ({
      type: TimelineEventType.ENCOUNTER,
      id: e.id,
      timestamp: e.startedAt,
      source: SOURCES[TimelineEventType.ENCOUNTER],
      data: {
        startedAt: e.startedAt,
        endedAt: e.endedAt,
        chiefComplaint: e.chiefComplaint,
        historyOfPresentIllness: e.historyOfPresentIllness,
        diagnosisCode: e.diagnosisCode,
        hasDiagnosis: e.diagnosis !== null || e.diagnosisCode !== null,
        notes: e.notes,
        treatmentPlan: e.treatmentPlan,
        patientInstructions: e.patientInstructions,
        followUpDate: e.followUpDate,
        vitals: e.vitals,
        updatedAt: e.updatedAt,
        doctor: {
          id: e.doctor.id,
          firstName: e.doctor.user.firstName,
          lastName: e.doctor.user.lastName,
          specialization: e.doctor.specialization,
        },
        prescriptionsCount:   prescMap.get(e.id) ?? 0,
        labOrdersCount:       labMap.get(e.id)   ?? 0,
        radiologyOrdersCount: radMap.get(e.id)   ?? 0,
        medicalFilesCount:    fileMap.get(e.id)  ?? 0,
        clinicalReportsCount: repMap.get(e.id)   ?? 0,
      } satisfies EncounterEventData,
    }));
  }

  private async fetchPrescriptions(
    patientId: string,
    organizationId: string | undefined,
    dateFilter: DateRangeFilter | undefined,
  ): Promise<TimelineEvent[]> {
    const rows = await this.prisma.prescription.findMany({
      where: {
        deletedAt: null,
        encounter: {
          patientId,
          deletedAt: null,
          ...(organizationId ? { organizationId } : {}),
        },
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
    organizationId: string | undefined,
    dateFilter: DateRangeFilter | undefined,
  ): Promise<TimelineEvent[]> {
    const rows = await this.prisma.labOrder.findMany({
      where: {
        patientId,
        ...(organizationId ? { organizationId } : {}),
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
    organizationId: string | undefined,
    dateFilter: DateRangeFilter | undefined,
  ): Promise<TimelineEvent[]> {
    const rows = await this.prisma.radiologyOrder.findMany({
      where: {
        patientId,
        ...(organizationId ? { organizationId } : {}),
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
    organizationId: string | undefined,
    dateFilter: DateRangeFilter | undefined,
  ): Promise<TimelineEvent[]> {
    const rows = await this.prisma.medicalFile.findMany({
      where: {
        patientId,
        ...(organizationId ? { organizationId } : {}),
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

  private async fetchClinicalReports(
    patientId: string,
    organizationId: string | undefined,
    dateFilter: DateRangeFilter | undefined,
  ): Promise<TimelineEvent[]> {
    const rows = await this.prisma.clinicalReport.findMany({
      where: {
        patientId,
        ...(organizationId ? { organizationId } : {}),
        deletedAt: null,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      select: CLINICAL_REPORT_TIMELINE_SELECT,
    });

    return rows.map((r): TimelineEvent => ({
      type: TimelineEventType.CLINICAL_REPORT_CREATED,
      id: r.id,
      timestamp: r.createdAt,
      source: SOURCES[TimelineEventType.CLINICAL_REPORT_CREATED],
      data: {
        reportId: r.id,
        title: r.title,
        status: r.status,
        encounterId: r.encounterId,
        createdAt: r.createdAt,
        createdBy: {
          id: r.createdBy.id,
          firstName: r.createdBy.firstName,
          lastName: r.createdBy.lastName,
          role: r.createdBy.role,
        },
      } satisfies ClinicalReportEventData,
    }));
  }

  private async fetchInvoices(
    patientId: string,
    organizationId: string | undefined,
    dateFilter: DateRangeFilter | undefined,
  ): Promise<TimelineEvent[]> {
    const rows = await this.prisma.invoice.findMany({
      where: {
        patientId,
        ...(organizationId ? { organizationId } : {}),
        deletedAt: null,
        issuedAt: { not: null, ...dateFilter },
      },
      select: INVOICE_TIMELINE_SELECT,
    });

    return rows.map((i): TimelineEvent => ({
      type: TimelineEventType.INVOICE_ISSUED,
      id: i.id,
      timestamp: i.issuedAt!,
      source: SOURCES[TimelineEventType.INVOICE_ISSUED],
      data: {
        invoiceId: i.id,
        invoiceNumber: i.invoiceNumber,
        status: i.status,
        totalAmount: i.totalAmount,
        paidAmount: i.paidAmount,
        issuedAt: i.issuedAt!,
        appointmentId: i.appointmentId,
        encounterId: i.encounterId,
      } satisfies InvoiceEventData,
    }));
  }

  private async fetchPayments(
    patientId: string,
    organizationId: string | undefined,
    dateFilter: DateRangeFilter | undefined,
  ): Promise<TimelineEvent[]> {
    const rows = await this.prisma.payment.findMany({
      where: {
        invoice: {
          patientId,
          ...(organizationId ? { organizationId } : {}),
          deletedAt: null,
        },
        ...(dateFilter ? { paidAt: dateFilter } : {}),
      },
      select: PAYMENT_TIMELINE_SELECT,
    });

    return rows.map((p): TimelineEvent => ({
      type: TimelineEventType.PAYMENT_RECORDED,
      id: p.id,
      timestamp: p.paidAt,
      source: SOURCES[TimelineEventType.PAYMENT_RECORDED],
      data: {
        paymentId: p.id,
        invoiceId: p.invoiceId,
        amount: p.amount,
        method: p.method,
        voided: p.voidedAt !== null,
        receivedBy: {
          id: p.receivedBy.id,
          firstName: p.receivedBy.firstName,
          lastName: p.receivedBy.lastName,
        },
      } satisfies PaymentEventData,
    }));
  }

  private async fetchServiceRequestEvents(
    patientId: string,
    organizationId: string | undefined,
    dateFilter: DateRangeFilter | undefined,
    types: TimelineEventType[],
  ): Promise<TimelineEvent[]> {
    const rows = await this.prisma.medicalServiceRequest.findMany({
      where: {
        patientId,
        ...(organizationId ? { organizationId } : {}),
        deletedAt: null,
      },
      select: SERVICE_REQUEST_TIMELINE_SELECT,
    });

    const events: TimelineEvent[] = [];

    for (const r of rows) {
      if (types.includes(TimelineEventType.SERVICE_REQUESTED)) {
        events.push({
          type: TimelineEventType.SERVICE_REQUESTED,
          id: r.id,
          timestamp: r.createdAt,
          source: SOURCES[TimelineEventType.SERVICE_REQUESTED],
          data: {
            requestId: r.id,
            requestedServiceName: r.requestedServiceName,
            requestedBy: {
              id: r.requestedBy.id,
              firstName: r.requestedBy.firstName,
              lastName: r.requestedBy.lastName,
            },
            doctor: r.doctor
              ? {
                  id: r.doctor.id,
                  firstName: r.doctor.user.firstName,
                  lastName: r.doctor.user.lastName,
                  specialization: r.doctor.specialization,
                }
              : null,
            quantity: r.quantity,
            notes: r.notes,
          } satisfies ServiceRequestedEventData,
        });
      }

      if (
        types.includes(TimelineEventType.SERVICE_EXECUTED) &&
        r.executionStatus === ServiceExecutionStatus.COMPLETED &&
        r.executedAt !== null
      ) {
        events.push({
          type: TimelineEventType.SERVICE_EXECUTED,
          id: r.id,
          timestamp: r.executedAt,
          source: SOURCES[TimelineEventType.SERVICE_EXECUTED],
          data: {
            requestId: r.id,
            requestedServiceName: r.requestedServiceName,
            executedBy: r.executedBy
              ? { id: r.executedBy.id, firstName: r.executedBy.firstName, lastName: r.executedBy.lastName }
              : null,
            executedAt: r.executedAt,
          } satisfies ServiceExecutedEventData,
        });
      }

      if (
        types.includes(TimelineEventType.SERVICE_CANCELLED) &&
        r.executionStatus === ServiceExecutionStatus.CANCELLED &&
        r.cancelledAt !== null
      ) {
        events.push({
          type: TimelineEventType.SERVICE_CANCELLED,
          id: r.id,
          timestamp: r.cancelledAt,
          source: SOURCES[TimelineEventType.SERVICE_CANCELLED],
          data: {
            requestId: r.id,
            requestedServiceName: r.requestedServiceName,
            cancelReason: r.cancelReason,
            cancelledAt: r.cancelledAt,
          } satisfies ServiceCancelledEventData,
        });
      }
    }

    if (!dateFilter) return events;
    return events.filter((e) => {
      if (dateFilter.gte && e.timestamp.getTime() < dateFilter.gte.getTime()) return false;
      if (dateFilter.lte && e.timestamp.getTime() > dateFilter.lte.getTime()) return false;
      return true;
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private buildDateFilter(from?: string, to?: string): DateRangeFilter | undefined {
    if (!from && !to) return undefined;
    return {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
}
