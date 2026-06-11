import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FollowUpQuery, FollowUpsResponse, FollowUpSummary, FollowUpSummaryQuery } from '@/types/follow-up';

export function useFollowUps(query: FollowUpQuery = {}) {
  const { status, doctorId, branchId, dateFrom, dateTo, page, limit, search, patientId } = query;
  return useQuery({
    queryKey: ['follow-ups', status, doctorId, branchId, dateFrom, dateTo, page, limit, search, patientId],
    queryFn: () =>
      api.get<FollowUpsResponse>('/v1/follow-ups', {
        ...(status?.length ? { status } : {}),
        ...(doctorId   ? { doctorId }   : {}),
        ...(branchId   ? { branchId }   : {}),
        ...(dateFrom   ? { dateFrom }   : {}),
        ...(dateTo     ? { dateTo }     : {}),
        ...(page       ? { page }       : {}),
        ...(limit      ? { limit }      : {}),
        ...(search     ? { search }     : {}),
        ...(patientId  ? { patientId }  : {}),
      }),
    staleTime: 30_000,
  });
}

export function useFollowUpSummary(query: FollowUpSummaryQuery = {}) {
  const { doctorId, branchId, dateFrom, dateTo } = query;
  return useQuery({
    queryKey: ['follow-ups-summary', doctorId, branchId, dateFrom, dateTo],
    queryFn: () =>
      api.get<FollowUpSummary>('/v1/follow-ups/summary', {
        ...(doctorId ? { doctorId } : {}),
        ...(branchId ? { branchId } : {}),
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
      }),
    staleTime: 30_000,
  });
}
