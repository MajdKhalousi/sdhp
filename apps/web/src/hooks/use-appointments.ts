import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Appointment,
  AppointmentQuery,
  AppointmentsResponse,
  CreateAppointmentDto,
  DoctorRef,
} from '@/types/appointment';
import type { Patient } from '@/hooks/use-patient';

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

export function useAppointments(query: AppointmentQuery = {}) {
  const { status, doctorId, patientId, date, branchId, page, limit } = query;
  return useQuery({
    queryKey: ['appointments', status, doctorId, patientId, date, branchId, page, limit],
    queryFn: () =>
      api.get<AppointmentsResponse>('/v1/appointments', {
        ...(status?.length ? { status } : {}),
        ...(doctorId ? { doctorId } : {}),
        ...(patientId ? { patientId } : {}),
        ...(date ? { date } : {}),
        ...(branchId ? { branchId } : {}),
        ...(page ? { page } : {}),
        ...(limit ? { limit } : {}),
      }),
    staleTime: 30_000,
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAppointmentDto) =>
      api.post<Appointment>('/v1/appointments', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
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
