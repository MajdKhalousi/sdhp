'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { formatDateDisplay } from '@/lib/format-date';

const SUBSCRIPTION_ENDING_SOON_DAYS = 14;

type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'CANCELLED';

interface MeOrganization {
  isActive: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndAt: string | null;
}

interface MeResponse {
  organization: MeOrganization | null;
}

type Tier = 'error' | 'warning' | 'info';

interface Notice {
  tier: Tier;
  messageKey:
    | 'trial'
    | 'trialEndingSoon'
    | 'activeEndingSoon'
    | 'expired'
    | 'suspended'
    | 'cancelled'
    | 'inactive';
  endDate?: string;
}

const TIER_CLASSES: Record<Tier, string> = {
  error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400',
  warning:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-400',
  info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-400',
};

function isWithinDays(endAt: string | null, days: number): boolean {
  if (!endAt) return false;
  const end = new Date(endAt).getTime();
  if (Number.isNaN(end)) return false;
  const diffMs = end - Date.now();
  return diffMs <= days * 24 * 60 * 60 * 1000;
}

function getOrganizationSubscriptionNotice(org: MeOrganization): Notice | null {
  if (org.isActive === false) {
    return { tier: 'error', messageKey: 'inactive' };
  }
  if (org.subscriptionStatus === 'EXPIRED') {
    return { tier: 'error', messageKey: 'expired' };
  }
  if (org.subscriptionStatus === 'CANCELLED') {
    return { tier: 'error', messageKey: 'cancelled' };
  }
  if (org.subscriptionStatus === 'SUSPENDED') {
    return { tier: 'error', messageKey: 'suspended' };
  }
  if (org.subscriptionStatus === 'ACTIVE' && isWithinDays(org.subscriptionEndAt, SUBSCRIPTION_ENDING_SOON_DAYS)) {
    return {
      tier: 'warning',
      messageKey: 'activeEndingSoon',
      endDate: formatDateDisplay(org.subscriptionEndAt),
    };
  }
  if (org.subscriptionStatus === 'TRIAL') {
    const endingSoonOrNoDate = !org.subscriptionEndAt || isWithinDays(org.subscriptionEndAt, SUBSCRIPTION_ENDING_SOON_DAYS);
    if (endingSoonOrNoDate) {
      return { tier: 'warning', messageKey: 'trialEndingSoon' };
    }
    return { tier: 'info', messageKey: 'trial', endDate: formatDateDisplay(org.subscriptionEndAt) };
  }
  return null;
}

export function SubscriptionBanner() {
  const t = useTranslations('subscriptionBanner');
  const { user } = useAuthStore();

  const { data } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => api.get<MeResponse>('/v1/auth/me'),
    enabled: user?.role === 'ORG_ADMIN',
    staleTime: 30_000,
  });

  if (!user || user.role !== 'ORG_ADMIN') return null;
  if (!data?.organization) return null;

  const notice = getOrganizationSubscriptionNotice(data.organization);
  if (!notice) return null;

  return (
    <div className={`mb-4 rounded-md border px-4 py-3 text-sm ${TIER_CLASSES[notice.tier]}`}>
      {t(notice.messageKey, notice.endDate ? { endDate: notice.endDate } : undefined)}
    </div>
  );
}
