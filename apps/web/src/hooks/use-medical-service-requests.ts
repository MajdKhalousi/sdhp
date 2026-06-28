import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { InvoiceStatus } from '@/types/invoice';

export type ServiceExecutionStatus = 'REQUESTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type MedicalServiceRequestPaymentStatus = InvoiceStatus | 'UNBILLED';

export interface MedicalServiceRequestServiceRef {
  id: string;
  name: string;
  nameAr: string | null;
  code: string;
}

export interface MedicalServiceRequestUserRef {
  id: string;
  firstName: string;
  lastName: string;
}

export interface MedicalServiceRequestDoctorRef {
  id: string;
  specialization: string | null;
  user: MedicalServiceRequestUserRef;
}

export interface MedicalServiceRequestPatientRef {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
}

export interface MedicalServiceRequest {
  id: string;
  organizationId: string;
  branchId: string | null;
  patientId: string;
  serviceId: string;
  appointmentId: string | null;
  encounterId: string | null;
  invoiceItemId: string | null;
  requestedById: string;
  doctorId: string | null;
  requestedServiceName: string;
  requestedUnitPrice: string;
  quantity: number;
  notes: string | null;
  executionStatus: ServiceExecutionStatus;
  executedAt: string | null;
  executedById: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  service: MedicalServiceRequestServiceRef;
  patient: MedicalServiceRequestPatientRef;
  requestedBy: MedicalServiceRequestUserRef;
  doctor: MedicalServiceRequestDoctorRef | null;
  paymentStatus: MedicalServiceRequestPaymentStatus;
}

export interface PaginatedMedicalServiceRequestsResponse {
  data: MedicalServiceRequest[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateMedicalServiceRequestPayload {
  patientId: string;
  serviceId: string;
  appointmentId?: string;
  encounterId?: string;
  doctorId?: string;
  quantity?: number;
  notes?: string;
}

export interface CancelMedicalServiceRequestPayload {
  cancelReason: string;
}

export interface BillMedicalServiceRequestPayload {
  invoiceId: string;
}

export function usePatientMedicalServiceRequests(patientId: string) {
  return useQuery({
    queryKey: ['patient-medical-service-requests', patientId],
    queryFn: () =>
      api.get<PaginatedMedicalServiceRequestsResponse>('/v1/medical-service-requests', { patientId }),
    enabled: !!patientId,
    staleTime: 30_000,
  });
}

export interface MedicalServiceRequestWorklistQuery {
  executionStatus?: ServiceExecutionStatus;
  serviceId?: string;
  doctorId?: string;
  branchId?: string;
  organizationId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export function useMedicalServiceRequestsWorklist(query: MedicalServiceRequestWorklistQuery = {}) {
  const { executionStatus, serviceId, doctorId, branchId, organizationId, from, to, page, limit } = query;
  return useQuery({
    queryKey: [
      'medical-service-requests-worklist',
      executionStatus,
      serviceId,
      doctorId,
      branchId,
      organizationId,
      from,
      to,
      page,
      limit,
    ],
    queryFn: () =>
      api.get<PaginatedMedicalServiceRequestsResponse>('/v1/medical-service-requests', {
        ...(executionStatus ? { executionStatus } : {}),
        ...(serviceId ? { serviceId } : {}),
        ...(doctorId ? { doctorId } : {}),
        ...(branchId ? { branchId } : {}),
        ...(organizationId ? { organizationId } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(page !== undefined ? { page } : {}),
        ...(limit !== undefined ? { limit } : {}),
      }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useCreateMedicalServiceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMedicalServiceRequestPayload) =>
      api.post<MedicalServiceRequest>('/v1/medical-service-requests', payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['patient-medical-service-requests', variables.patientId] });
    },
  });
}

export function useExecuteMedicalServiceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; patientId: string }) =>
      api.patch<MedicalServiceRequest>(`/v1/medical-service-requests/${id}/execute`, {}),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['patient-medical-service-requests', variables.patientId] });
      qc.invalidateQueries({ queryKey: ['medical-service-requests-worklist'] });
    },
  });
}

export function useCancelMedicalServiceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      patientId: string;
      payload: CancelMedicalServiceRequestPayload;
    }) => api.patch<MedicalServiceRequest>(`/v1/medical-service-requests/${id}/cancel`, payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['patient-medical-service-requests', variables.patientId] });
      qc.invalidateQueries({ queryKey: ['medical-service-requests-worklist'] });
    },
  });
}

export function useBillMedicalServiceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      patientId: string;
      payload: BillMedicalServiceRequestPayload;
    }) => api.post<MedicalServiceRequest>(`/v1/medical-service-requests/${id}/bill`, payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['patient-medical-service-requests', variables.patientId] });
      qc.invalidateQueries({ queryKey: ['invoices', 'patient', variables.patientId] });
    },
  });
}
