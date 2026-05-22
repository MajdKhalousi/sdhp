import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Encounter, CreateEncounterPayload, UpdateEncounterPayload } from '@/types/encounter';

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
    },
  });
}
