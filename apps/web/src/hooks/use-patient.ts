import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Patient {
  id: string;
  organizationId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  nationalId: string | null;
  bloodType: string | null;
  address: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function usePatient(patientId: string) {
  return useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => api.get<Patient>(`/v1/patients/${patientId}`),
    enabled: !!patientId,
  });
}
