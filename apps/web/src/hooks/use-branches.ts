import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { Branch } from '@/types/branch';

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

export function useBranches() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    // Scoped by user id — this hook is shared between SUPER_ADMIN (sees all
    // branches across every org) and ORG_ADMIN (sees only their own org's
    // branches). Without this segment, switching identity in the same tab
    // could serve a stale cross-org response from the prior session.
    queryKey: ['branches', userId],
    queryFn: async () =>
      normalizeList(
        await api.get<MaybeList<Branch>>('/v1/branches', { limit: 100 }),
      ),
    staleTime: 60_000,
    enabled: !!userId,
  });
}
