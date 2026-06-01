import { AppointmentStatus } from '@prisma/client';

export enum FollowUpStatus {
  PENDING   = 'PENDING',
  DUE_TODAY = 'DUE_TODAY',
  UPCOMING  = 'UPCOMING',
  OVERDUE   = 'OVERDUE',
  COMPLETED = 'COMPLETED',
  MISSED    = 'MISSED',
}

export interface FollowUpDoctor {
  id: string;
  firstName: string;
  lastName: string;
  specialization: string | null;
}

export interface FollowUpLinkedAppointment {
  id: string;
  status: AppointmentStatus;
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
