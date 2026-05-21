import { LabOrderStatus, MedicalFileCategory, RadiologyOrderStatus, UserRole } from '@prisma/client';

export enum TimelineEventType {
  ENCOUNTER = 'ENCOUNTER',
  PRESCRIPTION = 'PRESCRIPTION',
  LAB_ORDER = 'LAB_ORDER',
  RADIOLOGY_ORDER = 'RADIOLOGY_ORDER',
  MEDICAL_FILE = 'MEDICAL_FILE',
}

export interface TimelineEventSource {
  module: string;
  entity: string;
}

export interface EncounterEventData {
  startedAt: Date;
  endedAt: Date | null;
  chiefComplaint: string | null;
  diagnosisCode: string | null;
  hasDiagnosis: boolean;
  doctor: { id: string; firstName: string; lastName: string; specialization: string | null };
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

export type TimelineEvent =
  | { type: TimelineEventType.ENCOUNTER;       id: string; timestamp: Date; source: TimelineEventSource; data: EncounterEventData }
  | { type: TimelineEventType.PRESCRIPTION;    id: string; timestamp: Date; source: TimelineEventSource; data: PrescriptionEventData }
  | { type: TimelineEventType.LAB_ORDER;       id: string; timestamp: Date; source: TimelineEventSource; data: LabOrderEventData }
  | { type: TimelineEventType.RADIOLOGY_ORDER; id: string; timestamp: Date; source: TimelineEventSource; data: RadiologyOrderEventData }
  | { type: TimelineEventType.MEDICAL_FILE;    id: string; timestamp: Date; source: TimelineEventSource; data: MedicalFileEventData };

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
