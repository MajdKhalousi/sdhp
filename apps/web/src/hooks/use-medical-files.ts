import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { MedicalFileCategory } from '@/types/timeline';

export interface MedicalFile {
  id: string;
  organizationId: string;
  patientId: string;
  encounterId: string | null;
  uploadedById: string;
  category: MedicalFileCategory;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface UploadUrlRequest {
  patientId: string;
  encounterId?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  category: MedicalFileCategory;
  description?: string;
}

interface UploadUrlResponse {
  uploadUrl: string;
  storageKey: string;
  method: 'PUT';
  expiresIn: number;
}

export interface CreateMedicalFilePayload {
  patientId: string;
  encounterId?: string;
  category: MedicalFileCategory;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  description?: string;
}

interface DownloadUrlResponse {
  downloadUrl: string;
  expiresIn: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export function usePatientMedicalFiles(patientId: string) {
  return useQuery({
    queryKey: ['patient-files', patientId],
    queryFn: () => api.get<MedicalFile[]>(`/v1/patients/${patientId}/medical-files`),
    enabled: !!patientId,
    staleTime: 30_000,
  });
}

export function useRequestUploadUrl() {
  return useMutation({
    mutationFn: (payload: UploadUrlRequest) =>
      api.post<UploadUrlResponse>('/v1/medical-files/upload-url', payload),
  });
}

export function useRegisterMedicalFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMedicalFilePayload) =>
      api.post<MedicalFile>('/v1/medical-files', payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['patient-files', variables.patientId] });
      qc.invalidateQueries({ queryKey: ['patient-timeline'] });
    },
  });
}

export function getMedicalFileDownloadUrl(fileId: string): Promise<DownloadUrlResponse> {
  return api.get<DownloadUrlResponse>(`/v1/medical-files/${fileId}/download-url`);
}

export function useDeleteMedicalFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId }: { fileId: string; patientId: string }) =>
      api.delete<void>(`/v1/medical-files/${fileId}`),
    onSuccess: (_, { patientId }) => {
      qc.invalidateQueries({ queryKey: ['patient-files', patientId] });
      qc.invalidateQueries({ queryKey: ['patient-timeline'] });
    },
  });
}
