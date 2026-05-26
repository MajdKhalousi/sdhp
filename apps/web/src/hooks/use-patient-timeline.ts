import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PatientTimelineResponse, TimelineEventType } from '@/types/timeline';

export interface TimelineQueryParams {
  types?: TimelineEventType[];
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export function usePatientTimeline(patientId: string, params: TimelineQueryParams = {}) {
  const { types, from, to, page = 1, limit = 20 } = params;
  const toParam = to ? `${to}T23:59:59+03:00` : undefined;

  return useQuery({
    queryKey: ['patient-timeline', patientId, types, from, to, page, limit],
    queryFn: () =>
      api.get<PatientTimelineResponse>(`/v1/patients/${patientId}/timeline`, {
        ...(types && types.length > 0 ? { types } : {}),
        ...(from ? { from } : {}),
        ...(toParam ? { to: toParam } : {}),
        page,
        limit,
      }),
    enabled: !!patientId,
    staleTime: 30_000,
  });
}
