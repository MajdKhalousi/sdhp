import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Encounter, CreateEncounterPayload } from '@/types/encounter';

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
