import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { RadiologyOrderStatus } from '@/types/timeline';

interface DoctorUserRef {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  isActive: boolean;
}

interface DoctorRef {
  id: string;
  specialization: string | null;
  isActive: boolean;
  user: DoctorUserRef;
}

export interface PatientRef {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  isActive: boolean;
}

export interface RadiologyReport {
  id: string;
  radiologyOrderId: string;
  findings: string | null;
  impression: string | null;
  reportedById: string | null;
  reportedAt: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reportedBy: DoctorRef | null;
  reviewedBy: DoctorRef | null;
}

export interface RadiologyOrder {
  id: string;
  organizationId: string;
  branchId: string | null;
  patientId: string;
  encounterId: string | null;
  orderedById: string;
  modality: string;
  bodyPart: string | null;
  clinicalInfo: string | null;
  status: RadiologyOrderStatus;
  priority: string | null;
  notes: string | null;
  scheduledAt: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  patient: PatientRef;
  orderedBy: DoctorRef;
  report: RadiologyReport | null;
}

export interface CreateRadiologyOrderPayload {
  patientId: string;
  encounterId?: string;
  modality: string;
  bodyPart?: string;
  clinicalInfo?: string;
  priority?: string;
  notes?: string;
}

export interface UpdateRadiologyOrderStatusPayload {
  status: RadiologyOrderStatus;
  cancelReason?: string;
}

export interface UpsertRadiologyReportPayload {
  findings?: string;
  impression?: string;
  reportedAt?: string;
}

export interface RadiologyWorklistQuery {
  status?: RadiologyOrderStatus;
  from?: string;
  to?: string;
  branchId?: string;
  organizationId?: string;
  patientId?: string;
}

export function usePatientRadiologyOrders(patientId: string) {
  return useQuery({
    queryKey: ['patient-radiology-orders', patientId],
    queryFn: () => api.get<RadiologyOrder[]>(`/v1/patients/${patientId}/radiology-orders`),
    enabled: !!patientId,
    staleTime: 30_000,
  });
}

export function useRadiologyOrdersWorklist(query: RadiologyWorklistQuery = {}) {
  const { status, from, to, branchId, organizationId, patientId } = query;
  return useQuery({
    queryKey: ['radiology-worklist', status, from, to, branchId, organizationId, patientId],
    queryFn: () =>
      api.get<RadiologyOrder[]>('/v1/radiology-orders', {
        ...(status ? { status } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(branchId ? { branchId } : {}),
        ...(organizationId ? { organizationId } : {}),
        ...(patientId ? { patientId } : {}),
      }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useCreateRadiologyOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRadiologyOrderPayload) =>
      api.post<RadiologyOrder>('/v1/radiology-orders', payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['patient-radiology-orders', variables.patientId] });
      qc.invalidateQueries({ queryKey: ['patient-timeline'] });
      qc.invalidateQueries({ queryKey: ['radiology-worklist'] });
    },
  });
}

export function useUpdateRadiologyOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      radiologyOrderId,
      payload,
    }: {
      radiologyOrderId: string;
      patientId?: string;
      payload: UpdateRadiologyOrderStatusPayload;
    }) => api.patch<RadiologyOrder>(`/v1/radiology-orders/${radiologyOrderId}/status`, payload),
    onSuccess: (_, variables) => {
      if (variables.patientId) {
        qc.invalidateQueries({ queryKey: ['patient-radiology-orders', variables.patientId] });
      }
      qc.invalidateQueries({ queryKey: ['radiology-worklist'] });
    },
  });
}

export function useUpsertRadiologyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      radiologyOrderId,
      payload,
    }: {
      radiologyOrderId: string;
      patientId?: string;
      payload: UpsertRadiologyReportPayload;
    }) => api.patch<RadiologyOrder>(`/v1/radiology-orders/${radiologyOrderId}/report`, payload),
    onSuccess: (_, variables) => {
      if (variables.patientId) {
        qc.invalidateQueries({ queryKey: ['patient-radiology-orders', variables.patientId] });
        qc.invalidateQueries({ queryKey: ['patient-timeline'] });
      }
      qc.invalidateQueries({ queryKey: ['radiology-worklist'] });
    },
  });
}

export function useReviewRadiologyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ radiologyOrderId }: { radiologyOrderId: string; patientId: string }) =>
      api.patch<RadiologyOrder>(`/v1/radiology-orders/${radiologyOrderId}/review`, {}),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['patient-radiology-orders', variables.patientId] });
      qc.invalidateQueries({ queryKey: ['patient-timeline'] });
      qc.invalidateQueries({ queryKey: ['radiology-worklist'] });
    },
  });
}
