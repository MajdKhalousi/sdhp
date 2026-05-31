import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  ClinicSettings,
  UpsertClinicSettingsDto,
  UpsertWorkingDaysDto,
  VisitType,
  VisitTypeQuery,
  CreateVisitTypeDto,
  UpdateVisitTypeDto,
  Service,
  ServiceQuery,
  CreateServiceDto,
  UpdateServiceDto,
  Department,
} from '@/types/clinic-settings';

// Defensive normalizer — handles bare array, { data: [] }, or { items: [] }
// so the page never crashes if the backend response shape changes.
type MaybeList<T> = T[] | { data: T[] } | { items: T[] } | null | undefined;
function normalizeList<T>(raw: MaybeList<T>): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if ('data' in raw && Array.isArray(raw.data)) return raw.data;
  if ('items' in raw && Array.isArray(raw.items)) return raw.items;
  return [];
}

// ─── Clinic Settings ─────────────────────────────────────────────────────────

export function useClinicSettings() {
  return useQuery({
    queryKey: ['clinic-settings'],
    queryFn: () =>
      api.get<ClinicSettings | null>('/v1/clinic-settings').catch((err: unknown) => {
        // Settings row may not exist yet for a new org — treat "not found" as null
        // so the page renders the default editable form instead of an error banner.
        const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
        if (msg.includes('not found') || msg.includes('404')) return null;
        throw err;
      }),
    staleTime: 60_000,
  });
}

export function useUpsertClinicSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpsertClinicSettingsDto) =>
      api.put<ClinicSettings>('/v1/clinic-settings', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinic-settings'] });
    },
  });
}

export function useUpsertWorkingDays() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpsertWorkingDaysDto) =>
      api.put<ClinicSettings>('/v1/clinic-settings/working-days', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinic-settings'] });
    },
  });
}

// ─── Visit Types ─────────────────────────────────────────────────────────────

export function useVisitTypes(query: VisitTypeQuery = {}) {
  const { includeInactive } = query;
  return useQuery({
    queryKey: ['visit-types', includeInactive],
    queryFn: async () =>
      normalizeList(
        await api.get<MaybeList<VisitType>>('/v1/visit-types', {
          ...(includeInactive ? { includeInactive: true } : {}),
        }),
      ),
    staleTime: 60_000,
  });
}

export function useCreateVisitType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateVisitTypeDto) =>
      api.post<VisitType>('/v1/visit-types', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visit-types'] });
    },
  });
}

export function useUpdateVisitType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateVisitTypeDto }) =>
      api.patch<VisitType>(`/v1/visit-types/${id}`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visit-types'] });
    },
  });
}

export function useDeleteVisitType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<void>(`/v1/visit-types/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visit-types'] });
    },
  });
}

// ─── Departments ─────────────────────────────────────────────────────────────

export function useDepartmentsList() {
  return useQuery({
    queryKey: ['departments-list'],
    queryFn: async () =>
      normalizeList(await api.get<MaybeList<Department>>('/v1/departments')),
    staleTime: 120_000,
  });
}

// ─── Services ─────────────────────────────────────────────────────────────────

export function useServices(query: ServiceQuery = {}) {
  const { departmentId, includeInactive } = query;
  return useQuery({
    queryKey: ['services', departmentId, includeInactive],
    queryFn: async () =>
      normalizeList(
        await api.get<MaybeList<Service>>('/v1/services', {
          ...(departmentId ? { departmentId } : {}),
          ...(includeInactive ? { includeInactive: true } : {}),
        }),
      ),
    staleTime: 60_000,
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateServiceDto) =>
      api.post<Service>('/v1/services', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateServiceDto }) =>
      api.patch<Service>(`/v1/services/${id}`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<void>(`/v1/services/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] });
    },
  });
}
