import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Appointment,
  AppointmentQuery,
  AppointmentsResponse,
  CreateAppointmentDto,
  UpdateAppointmentDto,
  DoctorRef,
} from '@/types/appointment';
import type { Patient } from '@/hooks/use-patient';
import type { VisitType } from '@/types/clinic-settings';

interface PatientsResponse {
  data: Patient[];
  total: number;
  page: number;
  limit: number;
}

interface DoctorsResponse {
  data: DoctorRef[];
  total: number;
  page: number;
  limit: number;
}

export function useAppointments(query: AppointmentQuery = {}, options?: { enabled?: boolean }) {
  const { status, doctorId, patientId, date, branchId, organizationId, sourceEncounterId, page, limit } = query;
  return useQuery({
    queryKey: ['appointments', status, doctorId, patientId, date, branchId, organizationId, sourceEncounterId, page, limit],
    queryFn: () =>
      api.get<AppointmentsResponse>('/v1/appointments', {
        ...(status?.length ? { status } : {}),
        ...(doctorId ? { doctorId } : {}),
        ...(patientId ? { patientId } : {}),
        ...(date ? { date } : {}),
        ...(branchId ? { branchId } : {}),
        ...(organizationId ? { organizationId } : {}),
        ...(sourceEncounterId ? { sourceEncounterId } : {}),
        ...(page ? { page } : {}),
        ...(limit ? { limit } : {}),
      }),
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: ['appointments', id],
    queryFn: () => api.get<Appointment>(`/v1/appointments/${id}`),
    staleTime: 30_000,
    enabled: !!id,
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAppointmentDto) =>
      api.post<Appointment>('/v1/appointments', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['follow-ups'] });
    },
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateAppointmentDto }) =>
      api.patch<Appointment>(`/v1/appointments/${id}`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['queue'] });
    },
  });
}

export function usePatientsList() {
  return useQuery({
    queryKey: ['patients-list'],
    queryFn: () => api.get<PatientsResponse>('/v1/patients', { limit: 100 }),
    staleTime: 60_000,
  });
}

export function useDoctorsList() {
  return useQuery({
    queryKey: ['doctors-list'],
    queryFn: () => api.get<DoctorsResponse>('/v1/doctors', { limit: 100 }),
    staleTime: 60_000,
  });
}

export function useVisitTypesList() {
  return useQuery({
    queryKey: ['visit-types', false],
    queryFn: () => api.get<VisitType[]>('/v1/visit-types'),
    staleTime: 60_000,
  });
}
