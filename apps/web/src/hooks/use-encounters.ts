import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Encounter, CreateEncounterPayload, UpdateEncounterPayload } from '@/types/encounter';

export interface EncounterListResponse {
  data: Encounter[];
  total: number;
  page: number;
  limit: number;
}

export interface EncounterListParams {
  date?: string;
  patientId?: string;
  page?: number;
  limit?: number;
}

export function useEncounters(params: EncounterListParams = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['encounters', params],
    queryFn: () => api.get<EncounterListResponse>('/v1/encounters', params as Record<string, unknown>),
    staleTime: 30_000,
    enabled: options.enabled ?? true,
  });
}

export function useEncounter(id: string) {
  return useQuery({
    queryKey: ['encounter', id],
    queryFn: () => api.get<Encounter>(`/v1/encounters/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useUpdateEncounter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEncounterPayload }) =>
      api.patch<Encounter>(`/v1/encounters/${id}`, payload),
    onSuccess: (encounter) => {
      qc.setQueryData(['encounter', encounter.id], encounter);
      qc.invalidateQueries({ queryKey: ['queue'] });
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['patient-timeline'] });
    },
  });
}

export function useStartEncounter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEncounterPayload) =>
      api.post<Encounter>('/v1/encounters', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['queue'] });
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['patient-timeline'] });
    },
  });
}

export function useCancelEncounter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.patch<Encounter>(`/v1/encounters/${id}/cancel`, { reason }),
    onSuccess: (encounter) => {
      qc.setQueryData(['encounter', encounter.id], encounter);
      qc.invalidateQueries({ queryKey: ['encounters'] });
      qc.invalidateQueries({ queryKey: ['queue'] });
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['patient-timeline'] });
    },
  });
}
