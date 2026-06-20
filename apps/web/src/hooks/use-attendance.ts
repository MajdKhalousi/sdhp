import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  DailyAttendanceRecord,
  AttendanceRecord,
  CreateAttendancePayload,
  UpdateAttendancePayload,
} from '@/types/attendance';

type MaybeList<T> = T[] | { data: T[] } | null | undefined;

function normalizeList<T>(raw: MaybeList<T>): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if ('data' in (raw as object) && Array.isArray((raw as { data: T[] }).data))
    return (raw as { data: T[] }).data;
  return [];
}

export function useDailyAttendance(date: string) {
  return useQuery({
    queryKey: ['daily-attendance', date],
    queryFn: async () =>
      normalizeList(await api.get<MaybeList<DailyAttendanceRecord>>('/v1/attendance', { date })),
    enabled: !!date,
    staleTime: 10_000,
  });
}

export function useCreateAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeProfileId, payload }: { employeeProfileId: string; payload: CreateAttendancePayload }) =>
      api.post<AttendanceRecord>(`/v1/employees/${employeeProfileId}/attendance`, payload),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['daily-attendance', result.date.slice(0, 10)] });
    },
  });
}

export function useUpdateAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeProfileId,
      recordId,
      payload,
    }: {
      employeeProfileId: string;
      recordId: string;
      payload: UpdateAttendancePayload;
    }) => api.patch<AttendanceRecord>(`/v1/employees/${employeeProfileId}/attendance/${recordId}`, payload),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['daily-attendance', result.date.slice(0, 10)] });
    },
  });
}
