import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Invoice,
  InvoiceQuery,
  PaginatedInvoicesResponse,
  CreateInvoiceDto,
  UpdateInvoiceDto,
  AddInvoiceItemDto,
  RecordPaymentDto,
  CancelInvoiceDto,
} from '@/types/invoice';
import type { Service } from '@/types/clinic-settings';

export function useInvoices(query: InvoiceQuery = {}) {
  const { organizationId, branchId, patientId, status, from, to, page, limit } = query;
  return useQuery({
    queryKey: ['invoices', organizationId, branchId, patientId, status, from, to, page, limit],
    queryFn: () =>
      api.get<PaginatedInvoicesResponse>('/v1/invoices', {
        ...(organizationId ? { organizationId } : {}),
        ...(branchId ? { branchId } : {}),
        ...(patientId ? { patientId } : {}),
        ...(status ? { status } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(page !== undefined ? { page } : {}),
        ...(limit !== undefined ? { limit } : {}),
      }),
    staleTime: 30_000,
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: () => api.get<Invoice>(`/v1/invoices/${id}`),
    staleTime: 30_000,
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateInvoiceDto) =>
      api.post<Invoice>('/v1/invoices', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateInvoiceDto }) =>
      api.patch<Invoice>(`/v1/invoices/${id}`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useAddInvoiceItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: AddInvoiceItemDto }) =>
      api.post<Invoice>(`/v1/invoices/${id}/items`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useRemoveInvoiceItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, itemId }: { invoiceId: string; itemId: string }) =>
      api.delete<void>(`/v1/invoices/${invoiceId}/items/${itemId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useIssueInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<Invoice>(`/v1/invoices/${id}/issue`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useCancelInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CancelInvoiceDto }) =>
      api.patch<Invoice>(`/v1/invoices/${id}/cancel`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: RecordPaymentDto }) =>
      api.post<Invoice>(`/v1/invoices/${id}/payments`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useVoidPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, paymentId, voidReason }: { invoiceId: string; paymentId: string; voidReason: string }) =>
      api.post<Invoice>(`/v1/invoices/${invoiceId}/payments/${paymentId}/void`, { voidReason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function usePatientInvoices(patientId: string) {
  return useQuery({
    queryKey: ['invoices', 'patient', patientId],
    queryFn: () => api.get<Invoice[]>(`/v1/patients/${patientId}/invoices`),
    staleTime: 30_000,
    enabled: !!patientId,
  });
}

export function useServicesList() {
  return useQuery({
    queryKey: ['services', undefined, false],
    queryFn: () => api.get<Service[]>('/v1/services'),
    staleTime: 60_000,
  });
}

export interface PatientOutstandingBalance {
  outstandingAmount: number;
  invoiceCount: number;
  oldestUnpaidAt: string | null;
}

export function usePatientOutstandingBalance(patientId: string | undefined) {
  return useQuery({
    queryKey: ['patient-outstanding-balance', patientId],
    queryFn: () =>
      api.get<PatientOutstandingBalance>(`/v1/patients/${patientId}/outstanding-balance`),
    staleTime: 30_000,
    enabled: !!patientId,
  });
}

export interface BillingReport {
  period: { from: string | null; to: string | null };
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  invoiceCount: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  cancelledCount: number;
}

export interface BillingReportParams {
  from?: string;
  to?: string;
  branchId?: string;
}

export function useBillingReport(params: BillingReportParams = {}, enabled = true) {
  const { from, to, branchId } = params;
  return useQuery({
    queryKey: ['billing-report', from, to, branchId],
    queryFn: () =>
      api.get<BillingReport>('/v1/reports/billing', {
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(branchId ? { branchId } : {}),
      }),
    staleTime: 30_000,
    enabled,
  });
}

export interface OutstandingPatient {
  patientId: string;
  firstName: string;
  lastName: string;
  mrn: string;
  outstandingAmount: number;
  invoiceCount: number;
  oldestUnpaidAt: string | null;
}

export interface PaginatedOutstandingPatientsResponse {
  data: OutstandingPatient[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OutstandingPatientsParams {
  branchId?: string;
  page?: number;
  limit?: number;
}

export function useOutstandingPatients(params: OutstandingPatientsParams = {}, enabled = true) {
  const { branchId, page, limit } = params;
  return useQuery({
    queryKey: ['outstanding-patients', branchId, page, limit],
    queryFn: () =>
      api.get<PaginatedOutstandingPatientsResponse>('/v1/billing/outstanding-patients', {
        ...(branchId ? { branchId } : {}),
        ...(page !== undefined ? { page } : {}),
        ...(limit !== undefined ? { limit } : {}),
      }),
    staleTime: 30_000,
    enabled,
  });
}
