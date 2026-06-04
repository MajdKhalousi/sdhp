import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { LabOrderStatus } from '@/types/timeline';

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

export interface LabResult {
  id: string;
  labOrderId: string;
  resultValue: string | null;
  unit: string | null;
  referenceRange: string | null;
  interpretation: string | null;
  resultNotes: string | null;
  resultAt: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedBy: DoctorRef | null;
}

export interface LabOrder {
  id: string;
  organizationId: string;
  branchId: string | null;
  patientId: string;
  encounterId: string | null;
  orderedById: string;
  testName: string;
  testCode: string | null;
  clinicalInfo: string | null;
  status: LabOrderStatus;
  priority: string | null;
  notes: string | null;
  collectedAt: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  patient: PatientRef;
  orderedBy: DoctorRef;
  result: LabResult | null;
}

export interface CreateLabOrderPayload {
  patientId: string;
  encounterId?: string;
  testName: string;
  testCode?: string;
  clinicalInfo?: string;
  priority?: string;
  notes?: string;
}

export interface UpdateLabOrderStatusPayload {
  status: LabOrderStatus;
  cancelReason?: string;
}

export interface UpsertLabResultPayload {
  resultValue?: string;
  unit?: string;
  referenceRange?: string;
  interpretation?: string;
  resultNotes?: string;
  resultAt?: string;
}

export interface LabWorklistQuery {
  status?: LabOrderStatus;
  from?: string;
  to?: string;
  branchId?: string;
  organizationId?: string;
  patientId?: string;
}

export function usePatientLabOrders(patientId: string) {
  return useQuery({
    queryKey: ['patient-lab-orders', patientId],
    queryFn: () => api.get<LabOrder[]>(`/v1/patients/${patientId}/lab-orders`),
    enabled: !!patientId,
    staleTime: 30_000,
  });
}

export function useLabOrdersWorklist(query: LabWorklistQuery = {}) {
  const { status, from, to, branchId, organizationId, patientId } = query;
  return useQuery({
    queryKey: ['lab-worklist', status, from, to, branchId, organizationId, patientId],
    queryFn: () =>
      api.get<LabOrder[]>('/v1/lab-orders', {
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

export function useCreateLabOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLabOrderPayload) =>
      api.post<LabOrder>('/v1/lab-orders', payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['patient-lab-orders', variables.patientId] });
      qc.invalidateQueries({ queryKey: ['patient-timeline'] });
      qc.invalidateQueries({ queryKey: ['lab-worklist'] });
    },
  });
}

export function useUpdateLabOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      labOrderId,
      payload,
    }: {
      labOrderId: string;
      patientId?: string;
      payload: UpdateLabOrderStatusPayload;
    }) => api.patch<LabOrder>(`/v1/lab-orders/${labOrderId}/status`, payload),
    onSuccess: (_, variables) => {
      if (variables.patientId) {
        qc.invalidateQueries({ queryKey: ['patient-lab-orders', variables.patientId] });
      }
      qc.invalidateQueries({ queryKey: ['lab-worklist'] });
    },
  });
}

export function useUpsertLabResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      labOrderId,
      payload,
    }: {
      labOrderId: string;
      patientId?: string;
      payload: UpsertLabResultPayload;
    }) => api.patch<LabOrder>(`/v1/lab-orders/${labOrderId}/result`, payload),
    onSuccess: (_, variables) => {
      if (variables.patientId) {
        qc.invalidateQueries({ queryKey: ['patient-lab-orders', variables.patientId] });
        qc.invalidateQueries({ queryKey: ['patient-timeline'] });
      }
      qc.invalidateQueries({ queryKey: ['lab-worklist'] });
    },
  });
}

export function useReviewLabResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ labOrderId }: { labOrderId: string; patientId: string }) =>
      api.patch<LabOrder>(`/v1/lab-orders/${labOrderId}/review`, {}),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['patient-lab-orders', variables.patientId] });
      qc.invalidateQueries({ queryKey: ['patient-timeline'] });
      qc.invalidateQueries({ queryKey: ['lab-worklist'] });
    },
  });
}
