import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  LeaveRequest,
  LeaveStatus,
  LeaveQueueResult,
  CreateLeaveRequestPayload,
  UpdateLeaveRequestPayload,
  LeaveDecisionPayload,
} from '@/types/leave';

type MaybeList<T> = T[] | { data: T[] } | null | undefined;

function normalizeList<T>(raw: MaybeList<T>): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if ('data' in (raw as object) && Array.isArray((raw as { data: T[] }).data))
    return (raw as { data: T[] }).data;
  return [];
}

function invalidateLeaveQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['leave-requests'] });
  qc.invalidateQueries({ queryKey: ['leave-queue'] });
}

export function useEmployeeLeaveRequests(employeeProfileId: string, status?: LeaveStatus) {
  return useQuery({
    queryKey: ['leave-requests', employeeProfileId, status],
    queryFn: async () =>
      normalizeList(
        await api.get<MaybeList<LeaveRequest>>(`/v1/employees/${employeeProfileId}/leave-requests`, {
          ...(status ? { status } : {}),
        }),
      ),
    enabled: !!employeeProfileId,
    staleTime: 10_000,
  });
}

// Org-wide queue (GET /v1/leave-requests) — backend already returns the full
// { data, total, page, limit } shape, same as useAuditLogs, so no list
// normalization is needed here.
export function useLeaveQueue(params: { status?: LeaveStatus; page?: number; limit?: number } = {}) {
  const { status, page = 1, limit = 50 } = params;
  return useQuery({
    queryKey: ['leave-queue', { status, page, limit }],
    queryFn: () => api.get<LeaveQueueResult>('/v1/leave-requests', { status, page, limit }),
    staleTime: 10_000,
  });
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeProfileId,
      payload,
    }: {
      employeeProfileId: string;
      payload: CreateLeaveRequestPayload;
    }) => api.post<LeaveRequest>(`/v1/employees/${employeeProfileId}/leave-requests`, payload),
    onSuccess: () => invalidateLeaveQueries(qc),
  });
}

export function useUpdateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeProfileId,
      requestId,
      payload,
    }: {
      employeeProfileId: string;
      requestId: string;
      payload: UpdateLeaveRequestPayload;
    }) => api.patch<LeaveRequest>(`/v1/employees/${employeeProfileId}/leave-requests/${requestId}`, payload),
    onSuccess: () => invalidateLeaveQueries(qc),
  });
}

export function useApproveLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeProfileId,
      requestId,
      payload,
    }: {
      employeeProfileId: string;
      requestId: string;
      payload: LeaveDecisionPayload;
    }) => api.patch<LeaveRequest>(`/v1/employees/${employeeProfileId}/leave-requests/${requestId}/approve`, payload),
    onSuccess: () => invalidateLeaveQueries(qc),
  });
}

export function useRejectLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeProfileId,
      requestId,
      payload,
    }: {
      employeeProfileId: string;
      requestId: string;
      payload: LeaveDecisionPayload;
    }) => api.patch<LeaveRequest>(`/v1/employees/${employeeProfileId}/leave-requests/${requestId}/reject`, payload),
    onSuccess: () => invalidateLeaveQueries(qc),
  });
}

export function useCancelLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeProfileId,
      requestId,
      payload,
    }: {
      employeeProfileId: string;
      requestId: string;
      payload: LeaveDecisionPayload;
    }) => api.patch<LeaveRequest>(`/v1/employees/${employeeProfileId}/leave-requests/${requestId}/cancel`, payload),
    onSuccess: () => invalidateLeaveQueries(qc),
  });
}
