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

// amount/currency/method/paidAt are intentionally never nullable — the
// backend column for each is non-nullable, so the edit UI must always send
// a valid value (or omit the field) and never null for these four.
export interface UpdateSubscriptionPaymentInput {
  amount?: number;
  currency?: string;
  method?: SubscriptionPaymentMethod;
  reference?: string | null;
  notes?: string | null;
  paidAt?: string;
  periodStartAt?: string | null;
  periodEndAt?: string | null;
}
