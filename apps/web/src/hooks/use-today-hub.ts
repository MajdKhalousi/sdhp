import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { InvoiceStatus } from '@/types/invoice';

export interface TodayHubEntry {
  appointment: {
    id: string;
    scheduledAt: string;
    durationMin: number;
    status: string;
    visitType: { name: string; nameAr: string | null } | null;
  };
  patient: {
    clinicPatientId: string | null;
    mrn: string;
    firstName: string;
    lastName: string;
    firstNameAr: string | null;
    lastNameAr: string | null;
  };
  doctor: {
    userId: string;
    firstName: string;
    lastName: string;
    firstNameAr: string | null;
    lastNameAr: string | null;
  };
  queue: {
    id: string;
    ticketNumber: number;
    status: string;
    calledAt: string | null;
  } | null;
  encounter: {
    id: string;
    startedAt: string;
    endedAt: string | null;
  } | null;
  startEncounter: {
    patientId: string;
    doctorId: string;
  } | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    status: InvoiceStatus;
    totalAmount: string;
    paidAmount: string;
  } | null;
}

export interface TodayHubSummary {
  total: number;
  scheduled: number;
  waiting: number;
  inProgress: number;
  done: number;
  unpaid: number;
  partialPaid: number;
}

export interface TodayHubData {
  date: string;
  summary: TodayHubSummary;
  entries: TodayHubEntry[];
}

interface TodayHubParams {
  date?: string;
  branchId?: string;
  doctorId?: string;
}

export function useTodayHub(params?: TodayHubParams) {
  return useQuery({
    queryKey: ['today-hub', params?.date ?? null, params?.branchId ?? null, params?.doctorId ?? null],
    queryFn: () => api.get<TodayHubData>('/v1/dashboard/today', params as Record<string, unknown> | undefined),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
