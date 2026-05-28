import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Invoice,
  InvoiceQuery,
  CreateInvoiceDto,
  UpdateInvoiceDto,
  AddInvoiceItemDto,
  RecordPaymentDto,
  CancelInvoiceDto,
} from '@/types/invoice';

export function useInvoices(query: InvoiceQuery = {}) {
  const { organizationId, branchId, patientId, status, from, to } = query;
  return useQuery({
    queryKey: ['invoices', organizationId, branchId, patientId, status, from, to],
    queryFn: () =>
      api.get<Invoice[]>('/v1/invoices', {
        ...(organizationId ? { organizationId } : {}),
        ...(branchId ? { branchId } : {}),
        ...(patientId ? { patientId } : {}),
        ...(status ? { status } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
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

export function usePatientInvoices(patientId: string) {
  return useQuery({
    queryKey: ['invoices', 'patient', patientId],
    queryFn: () => api.get<Invoice[]>(`/v1/patients/${patientId}/invoices`),
    staleTime: 30_000,
    enabled: !!patientId,
  });
}
