import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Organization, OnboardOrganizationDto, OnboardOrganizationResponse } from '@/types/organization';

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

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: async () =>
      normalizeList(
        await api.get<MaybeList<Organization>>('/v1/organizations', { limit: 100 }),
      ),
    staleTime: 60_000,
  });
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: ['organizations', id],
    queryFn: async () => api.get<Organization>(`/v1/organizations/${id}`),
    staleTime: 60_000,
    enabled: !!id,
  });
}

export function useOnboardOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: OnboardOrganizationDto) =>
      api.post<OnboardOrganizationResponse>('/v1/organizations/onboard', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}
