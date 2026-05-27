export type ClinicalReportStatus = 'DRAFT' | 'FINALIZED';

export interface ClinicalReportPatient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  organizationId: string;
}

export interface ClinicalReportEncounter {
  id: string;
  organizationId: string;
  patientId: string;
  startedAt: string;
}

export interface ClinicalReportAuthor {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface ClinicalReport {
  id: string;
  organizationId: string;
  patientId: string;
  encounterId: string;
  createdById: string;
  title: string;
  content: string;
  status: ClinicalReportStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  patient?: ClinicalReportPatient;
  encounter?: ClinicalReportEncounter;
  createdBy?: ClinicalReportAuthor;
}
