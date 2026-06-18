export type SubscriptionPaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'CARD'
  | 'CHEQUE'
  | 'ONLINE'
  | 'OTHER';

export interface SubscriptionPayment {
  id: string;
  organizationId: string;
  amount: string;
  currency: string;
  method: SubscriptionPaymentMethod;
  reference: string | null;
  notes: string | null;
  paidAt: string;
  periodStartAt: string | null;
  periodEndAt: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionPaymentInput {
  amount: number;
  currency?: string;
  method: SubscriptionPaymentMethod;
  reference?: string;
  notes?: string;
  paidAt?: string;
  periodStartAt?: string;
  periodEndAt?: string;
}
