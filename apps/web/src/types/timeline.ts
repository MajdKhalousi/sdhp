export type TimelineEventType =
  | 'ENCOUNTER'
  | 'PRESCRIPTION'
  | 'LAB_ORDER'
  | 'RADIOLOGY_ORDER'
  | 'MEDICAL_FILE'
  | 'CLINICAL_REPORT_CREATED'
  | 'INVOICE_ISSUED'
  | 'PAYMENT_RECORDED'
  | 'SERVICE_REQUESTED'
  | 'SERVICE_EXECUTED'
  | 'SERVICE_CANCELLED';

export type LabOrderStatus =
  | 'ORDERED'
  | 'SAMPLE_COLLECTED'
  | 'IN_PROGRESS'
  | 'RESULTED'
  | 'REVIEWED'
  | 'CANCELLED';

export type RadiologyOrderStatus =
  | 'ORDERED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'RESULTED'
  | 'REVIEWED'
  | 'CANCELLED';

export type MedicalFileCategory =
  | 'LAB_RESULT'
  | 'RADIOLOGY_IMAGE'
  | 'PRESCRIPTION'
  | 'REFERRAL'
  | 'DISCHARGE_SUMMARY'
  | 'CONSENT_FORM'
  | 'INSURANCE'
  | 'CLINICAL_NOTE'
  | 'CLINICAL_REPORT'
  | 'ID_DOCUMENT'
  | 'OTHER';

export interface TimelineEventSource {
  module: string;
  entity: string;
}

export interface DoctorRef {
  id: string;
  firstName: string;
  lastName: string;
  specialization: string | null;
}

export interface StaffRef {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface EncounterEventData {
  startedAt: string;
  endedAt: string | null;
  chiefComplaint: string | null;
  historyOfPresentIllness?: string | null;
  diagnosisCode: string | null;
  hasDiagnosis: boolean;
  notes: string | null;
  treatmentPlan: string | null;
  patientInstructions?: string | null;
  followUpDate: string | null;
  vitals?: Record<string, unknown> | null;
  updatedAt: string;
  doctor: DoctorRef;
  prescriptionsCount?: number;
  labOrdersCount?: number;
  radiologyOrdersCount?: number;
  medicalFilesCount?: number;
  clinicalReportsCount?: number;
}

export interface PrescriptionEventData {
  encounterId: string;
  medication: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  createdAt: string;
}

export interface LabOrderEventData {
  testName: string;
  testCode: string | null;
  status: LabOrderStatus;
  priority: string | null;
  encounterId: string | null;
  createdAt: string;
  orderedBy: DoctorRef;
}

export interface RadiologyOrderEventData {
  modality: string;
  bodyPart: string | null;
  status: RadiologyOrderStatus;
  priority: string | null;
  encounterId: string | null;
  createdAt: string;
  orderedBy: DoctorRef;
}

export interface MedicalFileEventData {
  category: MedicalFileCategory;
  mimeType: string;
  sizeBytes: number;
  description: string | null;
  encounterId: string | null;
  createdAt: string;
  uploadedBy: StaffRef;
}

export interface ClinicalReportEventData {
  reportId: string;
  title: string;
  status: 'DRAFT' | 'FINALIZED';
  encounterId: string | null;
  createdAt: string;
  createdBy: { id: string; firstName: string; lastName: string } | null;
}

export interface InvoiceEventData {
  invoiceId: string;
  invoiceNumber: string;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
  totalAmount: string;
  paidAmount: string;
  issuedAt: string;
  appointmentId: string | null;
  encounterId: string | null;
}

export interface PaymentEventData {
  paymentId: string;
  invoiceId: string;
  amount: string;
  method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'INSURANCE' | 'OTHER';
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
  executedAt: string;
}

export interface ServiceCancelledEventData {
  requestId: string;
  requestedServiceName: string;
  cancelReason: string | null;
  cancelledAt: string;
}

export type TimelineEvent =
  | { type: 'ENCOUNTER';               id: string; timestamp: string; source: TimelineEventSource; data: EncounterEventData }
  | { type: 'PRESCRIPTION';            id: string; timestamp: string; source: TimelineEventSource; data: PrescriptionEventData }
  | { type: 'LAB_ORDER';               id: string; timestamp: string; source: TimelineEventSource; data: LabOrderEventData }
  | { type: 'RADIOLOGY_ORDER';         id: string; timestamp: string; source: TimelineEventSource; data: RadiologyOrderEventData }
  | { type: 'MEDICAL_FILE';            id: string; timestamp: string; source: TimelineEventSource; data: MedicalFileEventData }
  | { type: 'CLINICAL_REPORT_CREATED'; id: string; timestamp: string; source: TimelineEventSource; data: ClinicalReportEventData }
  | { type: 'INVOICE_ISSUED';          id: string; timestamp: string; source: TimelineEventSource; data: InvoiceEventData }
  | { type: 'PAYMENT_RECORDED';        id: string; timestamp: string; source: TimelineEventSource; data: PaymentEventData }
  | { type: 'SERVICE_REQUESTED';       id: string; timestamp: string; source: TimelineEventSource; data: ServiceRequestedEventData }
  | { type: 'SERVICE_EXECUTED';        id: string; timestamp: string; source: TimelineEventSource; data: ServiceExecutedEventData }
  | { type: 'SERVICE_CANCELLED';       id: string; timestamp: string; source: TimelineEventSource; data: ServiceCancelledEventData };

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
