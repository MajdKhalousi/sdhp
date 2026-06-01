import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FollowUpQuery, FollowUpsResponse } from '@/types/follow-up';

export function useFollowUps(query: FollowUpQuery = {}) {
  const { status, doctorId, branchId, dateFrom, dateTo, page, limit } = query;
  return useQuery({
    queryKey: ['follow-ups', status, doctorId, branchId, dateFrom, dateTo, page, limit],
    queryFn: () =>
      api.get<FollowUpsResponse>('/v1/follow-ups', {
        ...(status?.length ? { status } : {}),
        ...(doctorId ? { doctorId } : {}),
        ...(branchId ? { branchId } : {}),
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
        ...(page ? { page } : {}),
        ...(limit ? { limit } : {}),
      }),
    staleTime: 30_000,
  });
}
