import { ClinicalReportStatus, InvoiceStatus, LabOrderStatus, MedicalFileCategory, PaymentMethod, Prisma, RadiologyOrderStatus, UserRole } from '@prisma/client';

export enum TimelineEventType {
  ENCOUNTER               = 'ENCOUNTER',
  PRESCRIPTION            = 'PRESCRIPTION',
  LAB_ORDER               = 'LAB_ORDER',
  RADIOLOGY_ORDER         = 'RADIOLOGY_ORDER',
  MEDICAL_FILE            = 'MEDICAL_FILE',
  CLINICAL_REPORT_CREATED = 'CLINICAL_REPORT_CREATED',
  INVOICE_ISSUED          = 'INVOICE_ISSUED',
  PAYMENT_RECORDED        = 'PAYMENT_RECORDED',
  SERVICE_REQUESTED       = 'SERVICE_REQUESTED',
  SERVICE_EXECUTED        = 'SERVICE_EXECUTED',
  SERVICE_CANCELLED       = 'SERVICE_CANCELLED',
}

export interface TimelineEventSource {
  module: string;
  entity: string;
}

export interface EncounterEventData {
  startedAt: Date;
  endedAt: Date | null;
  chiefComplaint: string | null;
  historyOfPresentIllness: string | null;
  diagnosisCode: string | null;
  hasDiagnosis: boolean;
  notes: string | null;
  treatmentPlan: string | null;
  patientInstructions: string | null;
  followUpDate: Date | null;
  vitals: Prisma.JsonValue | null;
  updatedAt: Date;
  doctor: { id: string; firstName: string; lastName: string; specialization: string | null };
  prescriptionsCount: number;
  labOrdersCount: number;
  radiologyOrdersCount: number;
  medicalFilesCount: number;
  clinicalReportsCount: number;
}

export interface PrescriptionEventData {
  encounterId: string;
  medication: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  createdAt: Date;
}

export interface LabOrderEventData {
  testName: string;
  testCode: string | null;
  status: LabOrderStatus;
  priority: string | null;
  encounterId: string | null;
  createdAt: Date;
  orderedBy: { id: string; firstName: string; lastName: string; specialization: string | null };
}

export interface RadiologyOrderEventData {
  modality: string;
  bodyPart: string | null;
  status: RadiologyOrderStatus;
  priority: string | null;
  encounterId: string | null;
  createdAt: Date;
  orderedBy: { id: string; firstName: string; lastName: string; specialization: string | null };
}

export interface MedicalFileEventData {
  category: MedicalFileCategory;
  mimeType: string;
  sizeBytes: number;
  description: string | null;
  encounterId: string | null;
  createdAt: Date;
  uploadedBy: { id: string; firstName: string; lastName: string; role: UserRole };
}

export interface ClinicalReportEventData {
  reportId: string;
  title: string;
  status: ClinicalReportStatus;
  encounterId: string;
  createdAt: Date;
  createdBy: { id: string; firstName: string; lastName: string; role: UserRole };
}

export interface InvoiceEventData {
  invoiceId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  totalAmount: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
  issuedAt: Date;
  appointmentId: string | null;
  encounterId: string | null;
}

export interface PaymentEventData {
  paymentId: string;
  invoiceId: string;
  amount: Prisma.Decimal;
  method: PaymentMethod;
  voided: boolean;
  receivedBy: { id: string; firstName: string; lastName: string };
}

export interface ServiceRequestedEventData {
  requestId: string;
  requestedServiceName: string;
  requestedBy: { id: string; firstName: string; lastName: string };
  doctor: { id: string; firstName: string; lastName: string; specialization: string | null } | null;
  quantity: number;
  notes: string | null;
}

export interface ServiceExecutedEventData {
  requestId: string;
  requestedServiceName: string;
  executedBy: { id: string; firstName: string; lastName: string } | null;
  executedAt: Date;
}

export interface ServiceCancelledEventData {
  requestId: string;
  requestedServiceName: string;
  cancelReason: string | null;
  cancelledAt: Date;
}

export type TimelineEvent =
  | { type: TimelineEventType.ENCOUNTER;               id: string; timestamp: Date; source: TimelineEventSource; data: EncounterEventData }
  | { type: TimelineEventType.PRESCRIPTION;            id: string; timestamp: Date; source: TimelineEventSource; data: PrescriptionEventData }
  | { type: TimelineEventType.LAB_ORDER;               id: string; timestamp: Date; source: TimelineEventSource; data: LabOrderEventData }
  | { type: TimelineEventType.RADIOLOGY_ORDER;         id: string; timestamp: Date; source: TimelineEventSource; data: RadiologyOrderEventData }
  | { type: TimelineEventType.MEDICAL_FILE;            id: string; timestamp: Date; source: TimelineEventSource; data: MedicalFileEventData }
  | { type: TimelineEventType.CLINICAL_REPORT_CREATED; id: string; timestamp: Date; source: TimelineEventSource; data: ClinicalReportEventData }
  | { type: TimelineEventType.INVOICE_ISSUED;          id: string; timestamp: Date; source: TimelineEventSource; data: InvoiceEventData }
  | { type: TimelineEventType.PAYMENT_RECORDED;        id: string; timestamp: Date; source: TimelineEventSource; data: PaymentEventData }
  | { type: TimelineEventType.SERVICE_REQUESTED;       id: string; timestamp: Date; source: TimelineEventSource; data: ServiceRequestedEventData }
  | { type: TimelineEventType.SERVICE_EXECUTED;        id: string; timestamp: Date; source: TimelineEventSource; data: ServiceExecutedEventData }
  | { type: TimelineEventType.SERVICE_CANCELLED;       id: string; timestamp: Date; source: TimelineEventSource; data: ServiceCancelledEventData };

export interface PatientTimelineSummary {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
}

export interface PatientTimelineResponse {
  patient: PatientTimelineSummary;
  data: TimelineEvent[];
  total: number;
  page: number;
  limit: number;
}
