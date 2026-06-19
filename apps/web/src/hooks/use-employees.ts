import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  EmployeeProfile,
  EmployeesResponse,
  CreateEmployeeDto,
  UpdateEmployeeDto,
} from '@/types/employee';

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

export function useEmployees(includeDeleted = false) {
  return useQuery({
    queryKey: ['employees', includeDeleted],
    queryFn: async () =>
      normalizeList(
        await api.get<MaybeList<EmployeeProfile> | EmployeesResponse>('/v1/employees', {
          limit: 100,
          ...(includeDeleted ? { includeDeleted: 'true' } : {}),
        }),
      ),
    staleTime: 30_000,
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: () => api.get<EmployeeProfile>(`/v1/employees/${id}`),
    staleTime: 30_000,
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateEmployeeDto) => api.post<EmployeeProfile>('/v1/employees', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateEmployeeDto }) =>
      api.patch<EmployeeProfile>(`/v1/employees/${id}`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/v1/employees/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}
