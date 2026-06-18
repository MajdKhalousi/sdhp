import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { StaffUser, CreateStaffDto, UpdateStaffDto } from '@/types/staff';

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

export function useStaff(includeDeleted = false) {
  return useQuery({
    queryKey: ['staff', includeDeleted],
    queryFn: async () =>
      normalizeList(
        await api.get<MaybeList<StaffUser>>('/v1/users', {
          limit: 100,
          ...(includeDeleted ? { includeDeleted: 'true' } : {}),
        }),
      ),
    staleTime: 30_000,
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateStaffDto) => api.post<StaffUser>('/v1/users', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateStaffDto }) =>
      api.patch<StaffUser>(`/v1/users/${id}`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/v1/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useRestoreStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<StaffUser>(`/v1/users/${id}/restore`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export interface PlatformUsersParams {
  page?: number;
  limit?: number;
  includeDeleted?: boolean;
}

export interface PlatformUsersResult {
  data: StaffUser[];
  total: number;
  page: number;
  limit: number;
}

// Platform-wide, cross-organization users browser for SUPER_ADMIN — distinct
// query key and paginated return shape from useStaff (which stays unchanged
// for the org-scoped settings/staff page and discards total/page via a flat
// limit=100 fetch).
export function usePlatformUsers(params: PlatformUsersParams = {}) {
  const { page = 1, limit = 20, includeDeleted = true } = params;
  return useQuery({
    queryKey: ['platform-users', { page, limit, includeDeleted }],
    queryFn: () =>
      api.get<PlatformUsersResult>('/v1/users', { page, limit, includeDeleted }),
    staleTime: 30_000,
  });
}
