import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DoctorRef } from '@/types/appointment';

export interface UpdateDoctorDto {
  specialization?: string;
  departmentId?: string | null;
  consultationMinutes?: number;
  isActive?: boolean;
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
