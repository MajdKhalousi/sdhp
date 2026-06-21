import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  PayrollRun,
  PayrollRunStatus,
  PayrollRunQueueResult,
  PayrollLine,
  CreatePayrollRunPayload,
  UpdatePayrollLinePayload,
  CancelPayrollRunPayload,
} from '@/types/payroll';

function invalidatePayrollQueries(qc: ReturnType<typeof useQueryClient>, runId?: string) {
  qc.invalidateQueries({ queryKey: ['payroll-runs'] });
  if (runId) qc.invalidateQueries({ queryKey: ['payroll-run', runId] });
}

// Org-wide payroll run list (GET /v1/payroll/runs) — backend already returns
// the full { data, total, page, limit } shape, same as useLeaveQueue, so no
// list normalization is needed here.
export function usePayrollRuns(params: { year?: number; month?: number; status?: PayrollRunStatus; page?: number; limit?: number } = {}) {
  const { year, month, status, page = 1, limit = 20 } = params;
  return useQuery({
    queryKey: ['payroll-runs', { year, month, status, page, limit }],
    queryFn: () => api.get<PayrollRunQueueResult>('/v1/payroll/runs', { year, month, status, page, limit }),
    staleTime: 10_000,
  });
}

export function usePayrollRun(id: string | null) {
  return useQuery({
    queryKey: ['payroll-run', id],
    queryFn: () => api.get<PayrollRun>(`/v1/payroll/runs/${id}`),
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useCreatePayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePayrollRunPayload) => api.post<PayrollRun>('/v1/payroll/runs', payload),
    onSuccess: () => invalidatePayrollQueries(qc),
  });
}

export function useUpdatePayrollLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, lineId, payload }: { runId: string; lineId: string; payload: UpdatePayrollLinePayload }) =>
      api.patch<PayrollLine>(`/v1/payroll/runs/${runId}/lines/${lineId}`, payload),
    onSuccess: (_result, variables) => invalidatePayrollQueries(qc, variables.runId),
  });
}

export function useApprovePayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => api.patch<PayrollRun>(`/v1/payroll/runs/${runId}/approve`, {}),
    onSuccess: (_result, runId) => invalidatePayrollQueries(qc, runId),
  });
}

export function useMarkPayrollRunPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => api.patch<PayrollRun>(`/v1/payroll/runs/${runId}/mark-paid`, {}),
    onSuccess: (_result, runId) => invalidatePayrollQueries(qc, runId),
  });
}

export function useCancelPayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, payload }: { runId: string; payload: CancelPayrollRunPayload }) =>
      api.patch<PayrollRun>(`/v1/payroll/runs/${runId}/cancel`, payload),
    onSuccess: (_result, variables) => invalidatePayrollQueries(qc, variables.runId),
  });
}
