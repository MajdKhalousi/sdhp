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

export function usePatientRadiologyOrders(patientId: string) {
  return useQuery({
    queryKey: ['patient-radiology-orders', patientId],
    queryFn: () => api.get<RadiologyOrder[]>(`/v1/patients/${patientId}/radiology-orders`),
    enabled: !!patientId,
    staleTime: 30_000,
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
    },
  });
}
