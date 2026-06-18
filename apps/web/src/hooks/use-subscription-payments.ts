import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  SubscriptionPayment,
  CreateSubscriptionPaymentInput,
  UpdateSubscriptionPaymentInput,
} from '@/types/subscription-payment';

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

// Fans out one request per organization, reusing the exact same query key as
// useSubscriptionPayments — this shares the cache with the organization
// detail page rather than maintaining a separate copy of the same data.
export function useAllSubscriptionPayments(organizationIds: string[]) {
  return useQueries({
    queries: organizationIds.map((organizationId) => ({
      queryKey: ['organization-subscription-payments', organizationId],
      queryFn: () =>
        api.get<SubscriptionPayment[]>(
          `/v1/organizations/${organizationId}/subscription-payments`,
        ),
      staleTime: 30_000,
      enabled: !!organizationId,
    })),
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

export function useUpdateSubscriptionPayment(organizationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, dto }: { paymentId: string; dto: UpdateSubscriptionPaymentInput }) =>
      api.patch<SubscriptionPayment>(
        `/v1/organizations/${organizationId}/subscription-payments/${paymentId}`,
        dto,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization-subscription-payments', organizationId] });
    },
  });
}

export function useDeleteSubscriptionPayment(organizationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) =>
      api.delete<void>(`/v1/organizations/${organizationId}/subscription-payments/${paymentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization-subscription-payments', organizationId] });
    },
  });
}
