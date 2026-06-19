import type { SubscriptionStatus } from '@/types/organization';

export const SUBSCRIPTION_ENDING_SOON_DAYS = 14;

export type SubscriptionHealth = 'healthy' | 'endsSoon' | 'expired' | 'suspended' | 'cancelled' | 'inactive';

interface OrganizationSubscriptionFields {
  isActive: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndAt: string | null;
}

function isWithinDays(endAt: string | null, days: number): boolean {
  if (!endAt) return false;
  const end = new Date(endAt).getTime();
  if (Number.isNaN(end)) return false;
  return end - Date.now() <= days * 24 * 60 * 60 * 1000;
}

// Priority: organization.isActive, then subscriptionStatus, then date.
// Status always wins over date — an EXPIRED org with a future subscriptionEndAt
// still reports "expired", never "endsSoon". Never mutates anything; pure display logic.
export function getOrganizationSubscriptionHealth(org: OrganizationSubscriptionFields): SubscriptionHealth {
  if (org.isActive === false) return 'inactive';
  if (org.subscriptionStatus === 'EXPIRED') return 'expired';
  if (org.subscriptionStatus === 'CANCELLED') return 'cancelled';
  if (org.subscriptionStatus === 'SUSPENDED') return 'suspended';
  if (
    (org.subscriptionStatus === 'ACTIVE' || org.subscriptionStatus === 'TRIAL') &&
    isWithinDays(org.subscriptionEndAt, SUBSCRIPTION_ENDING_SOON_DAYS)
  ) {
    return 'endsSoon';
  }
  return 'healthy';
}

export function isOrganizationNeedsReview(org: OrganizationSubscriptionFields): boolean {
  return getOrganizationSubscriptionHealth(org) !== 'healthy';
}

export function subscriptionHealthBadgeClass(health: SubscriptionHealth): string {
  switch (health) {
    case 'healthy':
      return 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'endsSoon':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
    case 'expired':
      return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    case 'suspended':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
    case 'cancelled':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    case 'inactive':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}

// Raw subscriptionStatus badge — unrelated to computed health, used wherever
// the literal stored status (not the derived health) needs a color.
export function subscriptionStatusBadgeClass(status: SubscriptionStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'TRIAL':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'SUSPENDED':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
    case 'EXPIRED':
      return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}
