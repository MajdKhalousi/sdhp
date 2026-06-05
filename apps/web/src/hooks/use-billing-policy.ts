import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { BillingPolicy, UpdateBillingPolicyDto } from '@/types/billing-policy';

export function useBillingPolicy(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['billing-policy'],
    queryFn: () => api.get<BillingPolicy>('/v1/billing/policy'),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateBillingPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateBillingPolicyDto) =>
      api.patch<BillingPolicy>('/v1/billing/policy', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-policy'] });
    },
  });
}
