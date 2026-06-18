import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SubscriptionPayment, CreateSubscriptionPaymentInput } from '@/types/subscription-payment';

export function useSubscriptionPayments(organizationId: string) {
  return useQuery({
    queryKey: ['organization-subscription-payments', organizationId],
    queryFn: () =>
      api.get<SubscriptionPayment[]>(
        `/v1/organizations/${organizationId}/subscription-payments`,
      ),
    staleTime: 30_000,
    enabled: !!organizationId,
  });
}

export function useCreateSubscriptionPayment(organizationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateSubscriptionPaymentInput) =>
      api.post<SubscriptionPayment>(
        `/v1/organizations/${organizationId}/subscription-payments`,
        dto,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization-subscription-payments', organizationId] });
    },
  });
}
