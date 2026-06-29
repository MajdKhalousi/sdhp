import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ReportsSummary {
  organizationId: string | null;
  branchId: string | null;
  period: { from: string | null; to: string | null };
  staff: { totalUsers: number; totalDoctors: number; activeDoctors: number };
  patients: { total: number; active: number };
  appointments: {
    total: number;
    today: number;
    upcoming: number;
    byStatus: Record<string, number>;
  };
  queue: {
    total: number;
    byStatus: Record<string, number>;
  };
  encounters: { total: number };
  prescriptions: { total: number };
}

export interface ReportsSummaryParams {
  from?: string;
  to?: string;
  branchId?: string;
}

export function useReportsSummary(params: ReportsSummaryParams = {}, enabled = true) {
  const { from, to, branchId } = params;
  return useQuery({
    queryKey: ['reports-summary', from, to, branchId],
    queryFn: () =>
      api.get<ReportsSummary>('/v1/reports/summary', {
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(branchId ? { branchId } : {}),
      }),
    staleTime: 30_000,
    enabled,
  });
}
