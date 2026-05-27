import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ClinicalReport, ClinicalReportStatus } from '@/types/clinical-report';

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
