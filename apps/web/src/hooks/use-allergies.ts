import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Allergy {
  id: string;
  patientId: string;
  substance: string;
  reaction: string | null;
  severity: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useAllergies(patientId: string) {
  return useQuery({
    queryKey: ['patient-allergies', patientId],
    queryFn: () => api.get<Allergy[]>(`/v1/patients/${patientId}/allergies`),
    enabled: !!patientId,
    staleTime: 60_000,
  });
}
