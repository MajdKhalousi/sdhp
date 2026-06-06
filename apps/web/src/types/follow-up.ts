export type FollowUpStatus =
  | 'PENDING'
  | 'DUE_TODAY'
  | 'UPCOMING'
  | 'OVERDUE'
  | 'COMPLETED'
  | 'MISSED';

export interface FollowUpDoctor {
  id: string;
  firstName: string;
  lastName: string;
  specialization: string | null;
}

export interface FollowUpLinkedAppointment {
  id: string;
  status: string;
  scheduledAt: string;
  durationMin: number;
  doctor: FollowUpDoctor;
}

export interface FollowUpItem {
  encounterId: string;
  followUpDate: string;
  encounterDate: string;
  followUpStatus: FollowUpStatus;
  daysDelta: number | null;
  patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  };
  doctor: FollowUpDoctor;
  linkedAppointment: FollowUpLinkedAppointment | null;
}

export interface FollowUpsResponse {
  data: FollowUpItem[];
  total: number;
  page: number;
  limit: number;
}

export interface FollowUpQuery {
  status?: FollowUpStatus[];
  doctorId?: string;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface FollowUpSummary {
  dueToday: number;
  overdue: number;
  pending: number;
  upcoming: number;
  missed: number;
}

export interface FollowUpSummaryQuery {
  doctorId?: string;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
}
