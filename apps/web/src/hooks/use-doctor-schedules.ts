import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  DoctorScheduleDay,
  UpsertDoctorScheduleDto,
  ScheduleException,
  CreateScheduleExceptionDto,
  UpdateScheduleExceptionDto,
  AvailableSlotsResponse,
  AvailableSlotsQuery,
} from '@/types/doctor-schedule';

// ─── Weekly schedule ──────────────────────────────────────────────────────────

export function useDoctorSchedule(doctorId: string) {
  return useQuery({
    queryKey: ['doctor-schedule', doctorId],
    queryFn: () =>
      api.get<DoctorScheduleDay[]>(`/v1/doctors/${doctorId}/schedule`),
    staleTime: 60_000,
    enabled: !!doctorId,
  });
}

export function useUpsertDoctorSchedule(doctorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpsertDoctorScheduleDto) =>
      api.put<DoctorScheduleDay[]>(`/v1/doctors/${doctorId}/schedule`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctor-schedule', doctorId] });
      qc.invalidateQueries({ queryKey: ['available-slots', doctorId] });
    },
  });
}

// ─── Available slots ──────────────────────────────────────────────────────────

export function useAvailableSlots(
  doctorId: string,
  query: AvailableSlotsQuery,
) {
  const { date, slotDurationMin } = query;
  return useQuery({
    queryKey: ['available-slots', doctorId, date, slotDurationMin],
    queryFn: () =>
      api.get<AvailableSlotsResponse>(`/v1/doctors/${doctorId}/available-slots`, {
        date,
        ...(slotDurationMin ? { slotDurationMin } : {}),
      }),
    staleTime: 30_000,
    enabled: !!doctorId && !!date,
  });
}

// ─── Schedule exceptions ──────────────────────────────────────────────────────

export function useScheduleExceptions(doctorId: string) {
  return useQuery({
    queryKey: ['schedule-exceptions', doctorId],
    queryFn: () =>
      api.get<ScheduleException[]>(
        `/v1/doctors/${doctorId}/schedule/exceptions`,
      ),
    staleTime: 60_000,
    enabled: !!doctorId,
  });
}

export function useCreateException(doctorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateScheduleExceptionDto) =>
      api.post<ScheduleException>(
        `/v1/doctors/${doctorId}/schedule/exceptions`,
        dto,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-exceptions', doctorId] });
      qc.invalidateQueries({ queryKey: ['available-slots', doctorId] });
    },
  });
}

export function useUpdateException(doctorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      exceptionId,
      dto,
    }: {
      exceptionId: string;
      dto: UpdateScheduleExceptionDto;
    }) =>
      api.patch<ScheduleException>(
        `/v1/doctors/${doctorId}/schedule/exceptions/${exceptionId}`,
        dto,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-exceptions', doctorId] });
      qc.invalidateQueries({ queryKey: ['available-slots', doctorId] });
    },
  });
}

export function useDeleteException(doctorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (exceptionId: string) =>
      api.delete<void>(
        `/v1/doctors/${doctorId}/schedule/exceptions/${exceptionId}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-exceptions', doctorId] });
      qc.invalidateQueries({ queryKey: ['available-slots', doctorId] });
    },
  });
}
