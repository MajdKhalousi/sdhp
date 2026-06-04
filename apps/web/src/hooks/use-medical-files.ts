import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { MedicalFileCategory } from '@/types/timeline';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

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

export function useDownloadMedicalFile() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function download({ id, fileName }: { id: string; fileName: string }): Promise<void> {
    setDownloadingId(id);
    setDownloadError(null);
    try {
      const { token } = useAuthStore.getState();
      const res = await fetch(`${API_BASE}/v1/medical-files/${id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
    } catch {
      setDownloadError('downloadFailed');
    } finally {
      setDownloadingId(null);
    }
  }

  return { download, downloadingId, downloadError };
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
