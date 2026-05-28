import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { ClinicalReport, ClinicalReportStatus } from '@/types/clinical-report';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type { ClinicalReport, ClinicalReportStatus } from '@/types/clinical-report';

// ── Query param / payload types ────────────────────────────────────────────

interface ClinicalReportQuery {
  patientId?: string;
  encounterId?: string;
  status?: ClinicalReportStatus;
  createdById?: string;
}

interface CreateClinicalReportPayload {
  patientId: string;
  encounterId: string;
  title: string;
  content: string;
  status?: ClinicalReportStatus;
}

interface UpdateClinicalReportPayload {
  id: string;
  title?: string;
  content?: string;
  status?: ClinicalReportStatus;
}

interface DeleteClinicalReportVars {
  id: string;
  patientId: string;
}

// ── Queries ────────────────────────────────────────────────────────────────

export function useClinicalReports(query?: ClinicalReportQuery) {
  return useQuery({
    queryKey: ['clinical-reports', query],
    queryFn: () =>
      api.get<ClinicalReport[]>('/v1/clinical-reports', query as Record<string, unknown>),
    staleTime: 30_000,
  });
}

export function usePatientClinicalReports(patientId: string) {
  return useQuery({
    queryKey: ['patient-clinical-reports', patientId],
    queryFn: () =>
      api.get<ClinicalReport[]>(`/v1/patients/${patientId}/clinical-reports`),
    enabled: !!patientId,
    staleTime: 30_000,
  });
}

export function useClinicalReport(id: string) {
  return useQuery({
    queryKey: ['clinical-report', id],
    queryFn: () => api.get<ClinicalReport>(`/v1/clinical-reports/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

// ── Mutations ──────────────────────────────────────────────────────────────

export function useCreateClinicalReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClinicalReportPayload) =>
      api.post<ClinicalReport>('/v1/clinical-reports', payload),
    onSuccess: (report) => {
      qc.invalidateQueries({ queryKey: ['clinical-reports'] });
      qc.invalidateQueries({ queryKey: ['patient-clinical-reports', report.patientId] });
      qc.invalidateQueries({ queryKey: ['patient-timeline'] });
    },
  });
}

export function useUpdateClinicalReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateClinicalReportPayload) =>
      api.patch<ClinicalReport>(`/v1/clinical-reports/${id}`, body),
    onSuccess: (report) => {
      qc.invalidateQueries({ queryKey: ['clinical-report', report.id] });
      qc.invalidateQueries({ queryKey: ['clinical-reports'] });
      qc.invalidateQueries({ queryKey: ['patient-clinical-reports', report.patientId] });
      qc.invalidateQueries({ queryKey: ['patient-timeline'] });
    },
  });
}

export function useDeleteClinicalReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: DeleteClinicalReportVars) =>
      api.delete<void>(`/v1/clinical-reports/${id}`),
    onSuccess: (_, { id, patientId }) => {
      qc.invalidateQueries({ queryKey: ['clinical-report', id] });
      qc.invalidateQueries({ queryKey: ['clinical-reports'] });
      qc.invalidateQueries({ queryKey: ['patient-clinical-reports', patientId] });
      qc.invalidateQueries({ queryKey: ['patient-timeline'] });
    },
  });
}

// ── PDF export hooks ───────────────────────────────────────────────────────

export interface SaveAsFileResult {
  medicalFile: {
    id: string;
    fileName: string;
    category: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
  };
  downloadUrl: string;
  expiresIn: number;
}

export function useDownloadReportPdf() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function download(id: string): Promise<void> {
    setDownloadingId(id);
    try {
      const { token } = useAuthStore.getState();
      const res = await fetch(`${API_BASE}/v1/clinical-reports/${id}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } finally {
      setDownloadingId(null);
    }
  }

  return { download, downloadingId };
}

export function useSaveReportAsFile() {
  return useMutation({
    mutationFn: (id: string) =>
      api.post<SaveAsFileResult>(`/v1/clinical-reports/${id}/save-as-file`, {}),
  });
}
