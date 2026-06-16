import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  QueueEntry,
  QueueQuery,
  QueueResponse,
  CreateQueueEntryDto,
  UpdateQueueEntryDto,
  TriageQueueEntryDto,
} from '@/types/queue';

export function useQueue(query: QueueQuery = {}) {
  const { status, doctorId, date, branchId, organizationId, page, limit } = query;
  return useQuery({
    queryKey: ['queue', status, doctorId, date, branchId, organizationId, page, limit],
    queryFn: () =>
      api.get<QueueResponse>('/v1/queue', {
        ...(status?.length ? { status } : {}),
        ...(doctorId ? { doctorId } : {}),
        ...(date ? { date } : {}),
        ...(branchId ? { branchId } : {}),
        ...(organizationId ? { organizationId } : {}),
        ...(page ? { page } : {}),
        ...(limit ? { limit } : {}),
      }),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useQueueEntry(id: string) {
  return useQuery({
    queryKey: ['queue-entry', id],
    queryFn: () => api.get<QueueEntry>(`/v1/queue/${id}`),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateQueueEntryDto) => api.post<QueueEntry>('/v1/queue', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['queue'] });
      qc.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useUpdateQueueEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateQueueEntryDto }) =>
      api.patch<QueueEntry>(`/v1/queue/${id}`, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['queue'] });
      qc.invalidateQueries({ queryKey: ['queue-entry', id] });
    },
  });
}

export function useTriageQueueEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: TriageQueueEntryDto }) =>
      api.patch<QueueEntry>(`/v1/queue/${id}/triage`, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['queue'] });
      qc.invalidateQueries({ queryKey: ['queue-entry', id] });
    },
  });
}
