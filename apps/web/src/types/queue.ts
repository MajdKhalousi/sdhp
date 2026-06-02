export type QueueStatus = 'WAITING' | 'CALLED' | 'IN_PROGRESS' | 'DONE' | 'SKIPPED';

interface PatientRef {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  phone: string | null;
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

interface DoctorRef {
  id: string;
  specialization: string | null;
  user: DoctorUserRef;
}

export interface AppointmentRef {
  id: string;
  organizationId: string;
  scheduledAt: string;
  status: string;
  branchId: string | null;
  visitTypeId: string | null;
  patient: PatientRef;
  doctor: DoctorRef;
}

export interface QueueEntry {
  id: string;
  appointmentId: string;
  ticketNumber: number;
  status: QueueStatus;
  calledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  appointment: AppointmentRef;
}

export interface QueueQuery {
  status?: QueueStatus[];
  doctorId?: string;
  date?: string;
  branchId?: string;
  organizationId?: string;
  page?: number;
  limit?: number;
}

export interface CreateQueueEntryDto {
  appointmentId: string;
}

export interface UpdateQueueEntryDto {
  status: QueueStatus;
}

export interface QueueResponse {
  data: QueueEntry[];
  total: number;
  page: number;
  limit: number;
}
