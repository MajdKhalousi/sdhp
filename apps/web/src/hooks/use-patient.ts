import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type DuplicateReason = 'nationalId' | 'phone' | 'name' | 'nameAndDob';

export interface DuplicateCandidate {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  isActive: boolean;
  isArchived: boolean;
  isAlreadyLinked: boolean;
  reasons: DuplicateReason[];
}

export interface DuplicateCheckQuery {
  firstName: string;
  lastName: string;
  phone?: string | null;
  nationalId?: string | null;
  dateOfBirth?: string;
}

export type PatientGender = 'MALE' | 'FEMALE' | 'OTHER';
export type PatientStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface Patient {
  id: string;
  organizationId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  fatherName: string | null;
  fatherNameAr: string | null;
  motherName: string | null;
  motherNameAr: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  nationalId: string | null;
  bloodType: string | null;
  address: string | null;
  city: string | null;
  chronicDiseases: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  status: string | null;
  isActive: boolean;
  notes: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastVisitAt?: string | null;
  nextAppointmentAt?: string | null;
  hasOutstanding?: boolean;
}

export interface PatientsResponse {
  data: Patient[];
  total: number;
  page: number;
  limit: number;
}

export interface CreatePatientInput {
  firstName: string;
  lastName: string;
  firstNameAr?: string | null;
  lastNameAr?: string | null;
  gender: PatientGender;
  dateOfBirth: string;
  phone: string;
  email?: string | null;
  nationalId?: string | null;
  address?: string | null;
  city?: string | null;
  bloodType?: string | null;
  chronicDiseases?: string | null;
  emergencyName?: string | null;
  emergencyPhone?: string | null;
  fatherName?: string | null;
  fatherNameAr?: string | null;
  motherName?: string | null;
  motherNameAr?: string | null;
}

export type UpdatePatientInput = Partial<CreatePatientInput>;

export function usePatients(params?: { search?: string; page?: number; limit?: number }) {
  const { search, page = 1, limit = 25 } = params ?? {};
  return useQuery({
    queryKey: ['patients', 'list', search ?? '', page, limit],
    queryFn: () =>
      api.get<PatientsResponse>('/v1/patients', {
        page,
        limit,
        ...(search ? { search } : {}),
      }),
    staleTime: 60_000,
  });
}

export function usePatient(patientId: string) {
  return useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => api.get<Patient>(`/v1/patients/${patientId}`),
    enabled: !!patientId,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePatientInput) => api.post<Patient>('/v1/patients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePatientInput }) =>
      api.patch<Patient>(`/v1/patients/${id}`, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', id] });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/v1/patients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useCheckDuplicatePatient() {
  return useMutation({
    mutationFn: (query: DuplicateCheckQuery) =>
      api.get<{ matches: DuplicateCandidate[] }>('/v1/patients/check-duplicate', {
        firstName: query.firstName,
        lastName: query.lastName,
        ...(query.phone   ? { phone:       query.phone }       : {}),
        ...(query.nationalId ? { nationalId: query.nationalId } : {}),
        ...(query.dateOfBirth ? { dateOfBirth: query.dateOfBirth } : {}),
      }),
  });
}

export interface PlatformCandidate {
  firstName: string | null;
  firstNameAr: string | null;
  lastNameInitial: string | null;
  lastNameArInitial: string | null;
  phoneLastFour: string | null;
  birthYear: number | null;
  matchReason: 'phone' | 'nationalId';
}

export interface PlatformCandidateQuery {
  phone?: string | null;
  nationalId?: string | null;
}

export function useCheckPlatformCandidates() {
  return useMutation({
    mutationFn: (query: PlatformCandidateQuery) =>
      api.get<{ candidates: PlatformCandidate[] }>('/v1/patients/platform-candidates', {
        ...(query.phone      ? { phone:      query.phone }      : {}),
        ...(query.nationalId ? { nationalId: query.nationalId } : {}),
      }),
  });
}

export interface LinkRequestResult {
  clinicPatientId: string;
  maskedPatient: {
    firstName: string | null;
    firstNameAr: string | null;
    lastNameInitial: string | null;
    lastNameArInitial: string | null;
    phoneLastFour: string | null;
    birthYear: number | null;
    matchReason: 'phone' | 'nationalId';
  };
  code: string;
  expiresAt: string;
}

export interface LinkRequestInput {
  phone?: string | null;
  nationalId?: string | null;
}

export function useLinkRequest() {
  return useMutation({
    mutationFn: (data: LinkRequestInput) =>
      api.post<LinkRequestResult>('/v1/patients/link-request', {
        ...(data.phone      ? { phone:      data.phone }      : {}),
        ...(data.nationalId ? { nationalId: data.nationalId } : {}),
      }),
  });
}

export interface VerifyLinkInput {
  clinicPatientId: string;
  code: string;
}

export interface VerifyLinkResult {
  success: boolean;
  clinicPatientId: string;
}

export function useVerifyLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: VerifyLinkInput) =>
      api.post<VerifyLinkResult>('/v1/patients/verify-link', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export interface PendingLinkMaskedPatient {
  firstName: string | null;
  firstNameAr: string | null;
  lastNameInitial: string | null;
  lastNameArInitial: string | null;
  phoneLastFour: string | null;
  birthYear: number | null;
}

export interface PendingLinkItem {
  clinicPatientId: string;
  linkRequestNo: string;
  maskedPatient: PendingLinkMaskedPatient;
  createdAt: string;
  verificationExpiresAt: string | null;
  isExpired: boolean;
}

export interface ResendLinkCodeResult {
  clinicPatientId: string;
  code: string;
  expiresAt: string;
}

export function usePendingLinks() {
  return useQuery({
    queryKey: ['patients', 'pending-links'],
    queryFn: () => api.get<PendingLinkItem[]>('/v1/patients/pending-links'),
    staleTime: 30_000,
  });
}

export function useCancelPendingLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clinicPatientId: string) =>
      api.delete<void>(`/v1/patients/pending-links/${clinicPatientId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients', 'pending-links'] });
    },
  });
}

export function useResendPendingLinkCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clinicPatientId: string) =>
      api.post<ResendLinkCodeResult>(`/v1/patients/pending-links/${clinicPatientId}/resend-code`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients', 'pending-links'] });
    },
  });
}
