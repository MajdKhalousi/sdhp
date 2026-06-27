import type { AppointmentPaymentPolicy } from '@/types/billing-policy';
import type { InvoiceStatus } from '@/types/invoice';

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
  triageVitals?: Record<string, string> | null;
  chiefComplaintDraft?: string | null;
  createdAt: string;
  updatedAt: string;
  appointment: AppointmentRef;
}

// paymentReadiness is returned only by POST /v1/queue (check-in) — GET /v1/queue and
// GET /v1/queue/:id do not include it, so it is intentionally absent from QueueEntry.
export type CheckInReadinessState =
  | 'NO_PAYMENT_REQUIRED'
  | 'OPTIONAL_UNPAID'
  | 'OPTIONAL_PAID'
  | 'DEPOSIT_UNPAID'
  | 'DEPOSIT_PAID'
  | 'FULL_UNPAID'
  | 'FULL_PAID'
  | 'READINESS_UNKNOWN';

export interface PaymentReadiness {
  policy: AppointmentPaymentPolicy | null;
  requiredAmount: number | null;
  paidAmount: number;
  remainingAmount: number | null;
  invoiceId: string | null;
  invoiceStatus: InvoiceStatus | null;
  readiness: CheckInReadinessState;
}

export interface CheckInResult extends QueueEntry {
  paymentReadiness: PaymentReadiness;
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

export interface TriageQueueEntryDto {
  triageVitals?: Record<string, string>;
  chiefComplaintDraft?: string;
}

export interface QueueResponse {
  data: QueueEntry[];
  total: number;
  page: number;
  limit: number;
}
