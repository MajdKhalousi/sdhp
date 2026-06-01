import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DoctorRef } from '@/types/appointment';

export interface CreateDoctorDto {
  userId: string;
  departmentId?: string | null;
  specialization?: string;
  licenseNumber?: string;
  consultationMinutes?: number;
  maxPatientsPerDay?: number;
  isActive?: boolean;
}

export interface UpdateDoctorDto {
  specialization?: string;
  departmentId?: string | null;
  consultationMinutes?: number;
  isActive?: boolean;
}

export function useCreateDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateDoctorDto) => api.post<DoctorRef>('/v1/doctors', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctors-list'] });
    },
  });
}

export function useUpdateDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateDoctorDto }) =>
      api.patch<DoctorRef>(`/v1/doctors/${id}`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctors-list'] });
    },
  });
}
