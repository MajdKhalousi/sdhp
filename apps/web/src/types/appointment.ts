export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_QUEUE'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

interface PatientRef {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
}

interface DoctorUserRef {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface DoctorRef {
  id: string;
  specialization: string | null;
  consultationMinutes: number;
  user: DoctorUserRef;
}

export interface Appointment {
  id: string;
  organizationId: string;
  branchId: string | null;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  durationMin: number;
  status: AppointmentStatus;
  notes: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  patient: PatientRef;
  doctor: DoctorRef;
}

export interface AppointmentQuery {
  status?: AppointmentStatus[];
  doctorId?: string;
  patientId?: string;
  date?: string;
  branchId?: string;
  page?: number;
  limit?: number;
}

export interface CreateAppointmentDto {
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  durationMin: number;
  notes?: string;
}

export interface AppointmentsResponse {
  data: Appointment[];
  total: number;
  page: number;
  limit: number;
}

export interface UpdateAppointmentDto {
  status?: AppointmentStatus;
  cancelReason?: string;
  notes?: string;
}
