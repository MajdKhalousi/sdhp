// Days after subscriptionEndAt during which an EXPIRED organization still
// has full write access. Independent of the frontend's own 14-day
// "ending soon" warning window (apps/web/src/lib/subscription-health.ts) —
// same number today, but the two are not coupled and may diverge later.
export const SUBSCRIPTION_GRACE_PERIOD_DAYS = 14;

export const SUBSCRIPTION_WRITE_BLOCKED_CODE = 'SUBSCRIPTION_WRITE_BLOCKED';
export const SUBSCRIPTION_WRITE_BLOCKED_MESSAGE =
  "This action is unavailable because your organization's subscription needs attention.";
