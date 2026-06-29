import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  PrescriptionTemplate,
  PrescriptionTemplateQuery,
  CreatePrescriptionTemplateDto,
  UpdatePrescriptionTemplateDto,
} from '@/types/prescription-templates';

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

export function usePrescriptionTemplates(query: PrescriptionTemplateQuery = {}) {
  const { includeInactive } = query;
  return useQuery({
    queryKey: ['prescription-templates', includeInactive],
    queryFn: async () =>
      normalizeList(
        await api.get<MaybeList<PrescriptionTemplate>>('/v1/prescription-templates', {
          ...(includeInactive ? { includeInactive: true } : {}),
        }),
      ),
    staleTime: 60_000,
  });
}

export function useCreatePrescriptionTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePrescriptionTemplateDto) =>
      api.post<PrescriptionTemplate>('/v1/prescription-templates', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prescription-templates'] });
    },
  });
}

export function useUpdatePrescriptionTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePrescriptionTemplateDto }) =>
      api.patch<PrescriptionTemplate>(`/v1/prescription-templates/${id}`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prescription-templates'] });
    },
  });
}

export function useDeletePrescriptionTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<void>(`/v1/prescription-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prescription-templates'] });
    },
  });
}
