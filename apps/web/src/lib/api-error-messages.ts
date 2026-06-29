import { ApiError } from './api';

// Exact strings thrown by apps/api/src/modules/billing/billing.service.ts's
// BadRequestExceptions that are reachable from the cashier's issue/payment/
// settle-no-charge flows. Matched on the raw message text since these surface
// as plain Error (400) or ApiError (403), never a structured error code.
const BILLING_ERROR_MATCHERS: Array<{ test: (message: string) => boolean; key: string }> = [
  // Most specific first: a remaining balance of exactly 0.00 is a distinct
  // case of the overpayment message below, not a generic overpayment.
  {
    test: (message) => message === 'Payment amount exceeds remaining balance of 0.00',
    key: 'billing.errors.noRemainingBalance',
  },
  {
    test: (message) => message.startsWith('Payment amount exceeds remaining balance of'),
    key: 'billing.errors.amountExceedsRemaining',
  },
  {
    test: (message) => message === 'Cannot issue an empty invoice',
    key: 'billing.errors.emptyInvoice',
  },
  {
    test: (message) => message === 'Only zero-total invoices can be settled as no-charge.',
    key: 'billing.errors.noChargeRequiresZeroTotal',
  },
  {
    test: (message) =>
      message === 'Only DRAFT invoices can be issued' ||
      message === 'Payments can only be recorded for ISSUED or PARTIALLY_PAID invoices' ||
      message === 'Only issued invoices can be settled as no-charge.',
    key: 'billing.errors.invalidState',
  },
];

export function getFriendlyApiErrorMessage(error: unknown, t: (key: string) => string): string {
  if (error instanceof ApiError && error.code === 'SUBSCRIPTION_WRITE_BLOCKED') {
    return t('subscription.errors.writeBlocked');
  }
  if (error instanceof Error) {
    const match = BILLING_ERROR_MATCHERS.find((m) => m.test(error.message));
    if (match) return t(match.key);
    return error.message;
  }
  return t('common.states.error');
}
