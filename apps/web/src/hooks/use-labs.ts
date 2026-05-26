import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { LabOrderStatus } from '@/types/timeline';

interface DoctorUserRef {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  isActive: boolean;
}

interface DoctorRef {
  id: string;
  specialization: string | null;
  isActive: boolean;
  user: DoctorUserRef;
}

export interface LabResult {
  id: string;
  labOrderId: string;
  resultValue: string | null;
  unit: string | null;
  referenceRange: string | null;
  interpretation: string | null;
  resultNotes: string | null;
  resultAt: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedBy: DoctorRef | null;
}

export interface LabOrder {
  id: string;
  organizationId: string;
  branchId: string | null;
  patientId: string;
  encounterId: string | null;
  orderedById: string;
  testName: string;
  testCode: string | null;
  status: LabOrderStatus;
  priority: string | null;
  notes: string | null;
  collectedAt: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  orderedBy: DoctorRef;
  result: LabResult | null;
}

export function usePatientLabOrders(patientId: string) {
  return useQuery({
    queryKey: ['patient-lab-orders', patientId],
    queryFn: () => api.get<LabOrder[]>(`/v1/patients/${patientId}/lab-orders`),
    enabled: !!patientId,
    staleTime: 30_000,
  });
}
