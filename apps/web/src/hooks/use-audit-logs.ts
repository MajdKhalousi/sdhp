import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AuditLog } from '@/types/audit-log';

type MaybeList<T> = T[] | { data: T[] } | { items: T[] } | null | undefined;

function normalizeList<T>(raw: MaybeList<T>): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if ('data' in (raw as object) && Array.isArray((raw as { data: T[] }).data))
    return (raw as { data: T[] }).data;
  if ('items' in (raw as object) && Array.isArray((raw as { items: T[] }).items))
    return (raw as { items: T[] }).items;
  return [];
}

export function useRecentAuditLogs(limit = 5) {
  return useQuery({
    queryKey: ['audit-logs', 'recent', limit],
    queryFn: async () =>
      normalizeList(
        await api.get<MaybeList<AuditLog>>('/v1/audit-logs', { limit }),
      ),
    staleTime: 30_000,
  });
}

export interface AuditLogsParams {
  action?: string;
  resource?: string;
  resourceId?: string;
  organizationId?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogsResult {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

// Server-side filtered/paginated audit log browser — distinct from
// useRecentAuditLogs (which stays untouched for the Overview widget) since
// this passes the full filter/pagination param set through to the backend,
// which already supports them, rather than re-filtering a capped fetch.
export function useAuditLogs(params: AuditLogsParams = {}) {
  const { action, resource, resourceId, organizationId, userId, from, to, page = 1, limit = 50 } = params;
  return useQuery({
    queryKey: ['audit-logs', 'browser', { action, resource, resourceId, organizationId, userId, from, to, page, limit }],
    queryFn: async () =>
      api.get<AuditLogsResult>('/v1/audit-logs', {
        action,
        resource,
        resourceId,
        organizationId,
        userId,
        from,
        to,
        page,
        limit,
      }),
    staleTime: 30_000,
  });
}
