export type TimelineEventType =
  | 'ENCOUNTER'
  | 'PRESCRIPTION'
  | 'LAB_ORDER'
  | 'RADIOLOGY_ORDER'
  | 'MEDICAL_FILE'
  | 'CLINICAL_REPORT_CREATED';

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
  diagnosisCode: string | null;
  hasDiagnosis: boolean;
  notes: string | null;
  treatmentPlan: string | null;
  followUpDate: string | null;
  updatedAt: string;
  doctor: DoctorRef;
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

export type TimelineEvent =
  | { type: 'ENCOUNTER';               id: string; timestamp: string; source: TimelineEventSource; data: EncounterEventData }
  | { type: 'PRESCRIPTION';            id: string; timestamp: string; source: TimelineEventSource; data: PrescriptionEventData }
  | { type: 'LAB_ORDER';               id: string; timestamp: string; source: TimelineEventSource; data: LabOrderEventData }
  | { type: 'RADIOLOGY_ORDER';         id: string; timestamp: string; source: TimelineEventSource; data: RadiologyOrderEventData }
  | { type: 'MEDICAL_FILE';            id: string; timestamp: string; source: TimelineEventSource; data: MedicalFileEventData }
  | { type: 'CLINICAL_REPORT_CREATED'; id: string; timestamp: string; source: TimelineEventSource; data: ClinicalReportEventData };

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
