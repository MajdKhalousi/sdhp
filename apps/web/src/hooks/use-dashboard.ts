import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface DashboardOverview {
  today: {
    appointments: {
      total: number;
      completed: number;
      cancelled: number;
      noShow: number;
    };
    queue: {
      waiting: number;
      inProgress: number;
      done: number;
    };
    followUpsDue: number;
    labOrders: { pending: number };
    radiologyOrders: { pending: number };
    newPatients: number;
  };
  billing: {
    collectedToday: number;
    outstandingAllTime: number;
    collectionRateToday: number;
  } | null;
}

export function useDashboardOverview(enabled = true) {
  return useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => api.get<DashboardOverview>('/v1/dashboard/overview'),
    staleTime: 30_000,
    refetchInterval: 60_000,
    enabled,
  });
}
