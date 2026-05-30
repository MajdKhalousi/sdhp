import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Prescription {
  id: string;
  encounterId: string;
  medication: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  quantity: number | null;
  refillsLeft: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrescriptionPayload {
  encounterId: string;
  medication: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

interface PrescriptionListResponse {
  data: Prescription[];
  total: number;
  page: number;
  limit: number;
}

export function useEncounterPrescriptions(encounterId: string) {
  return useQuery({
    queryKey: ['prescriptions', 'encounter', encounterId],
    queryFn: () =>
      api.get<PrescriptionListResponse>('/v1/prescriptions', { encounterId, limit: 50 }),
    enabled: !!encounterId,
    staleTime: 30_000,
  });
}

export function useCreatePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePrescriptionPayload) =>
      api.post<Prescription>('/v1/prescriptions', payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['prescriptions', 'encounter', variables.encounterId] });
      qc.invalidateQueries({ queryKey: ['patient-timeline'] });
    },
  });
}

export function useDeletePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; encounterId: string }) =>
      api.delete<void>(`/v1/prescriptions/${id}`),
    onSuccess: (_, { encounterId }) => {
      qc.invalidateQueries({ queryKey: ['prescriptions', 'encounter', encounterId] });
      qc.invalidateQueries({ queryKey: ['patient-timeline'] });
    },
  });
}
