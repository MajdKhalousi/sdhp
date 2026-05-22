interface EncounterPatientRef {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  gender: string | null;
  dateOfBirth: string | null;
}

interface EncounterDoctorUserRef {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface EncounterDoctorRef {
  id: string;
  specialization: string | null;
  user: EncounterDoctorUserRef;
}

export interface Encounter {
  id: string;
  organizationId: string;
  branchId: string | null;
  patientId: string;
  doctorId: string;
  appointmentId: string | null;
  chiefComplaint: string | null;
  notes: string | null;
  diagnosis: string | null;
  diagnosisCode: string | null;
  treatmentPlan: string | null;
  followUpDate: string | null;
  vitals: Record<string, unknown> | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  patient: EncounterPatientRef;
  doctor: EncounterDoctorRef;
}

export interface CreateEncounterPayload {
  patientId: string;
  doctorId: string;
  appointmentId?: string;
}
