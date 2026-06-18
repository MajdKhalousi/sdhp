'use client';

import { useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth';
import { PLATFORM_ACCESS_ROLES } from '@/lib/permissions';
import { useOrganizations } from '@/hooks/use-organizations';
import { useAllSubscriptionPayments } from '@/hooks/use-subscription-payments';
import { isDemoOrganization } from '@/lib/demo-organizations';
import type { SubscriptionPayment } from '@/types/subscription-payment';

// Never sum across currencies — joins each currency's total as its own
// segment rather than merging unlike currencies into one number.
function formatTotalsCompact(payments: SubscriptionPayment[]): string {
  const totals: Record<string, number> = {};
  for (const payment of payments) {
    totals[payment.currency] = (totals[payment.currency] ?? 0) + Number(payment.amount);
  }
  const entries = Object.entries(totals);
  if (entries.length === 0) return '—';
  return entries.map(([currency, total]) => `${total.toFixed(2)} ${currency}`).join(' · ');
}

export default function PlatformOrganizationsPage() {
  const t = useTranslations('platform.organizations');
  const tDemo = useTranslations('platform.demo');
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && !PLATFORM_ACCESS_ROLES.has(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const { data: organizations, isLoading, isError } = useOrganizations();

  const organizationIds = (organizations ?? []).map((o) => o.id);
  const paymentQueries = useAllSubscriptionPayments(organizationIds);
  const paymentsByOrgId = new Map<string, SubscriptionPayment[]>();
  organizationIds.forEach((orgId, index) => {
    paymentsByOrgId.set(orgId, paymentQueries[index]?.data ?? []);
  });

  if (!user || !PLATFORM_ACCESS_ROLES.has(user.role)) return null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/platform/overview"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('overviewLink')}
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Link
          href="/dashboard/platform/organizations/new"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('newOrganization')}
        </Link>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      )}

      {isError && (
        <p className="text-sm text-destructive">{t('error')}</p>
      )}

      {!isLoading && !isError && organizations?.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      )}

      {!isLoading && !isError && organizations && organizations.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t('columns.name')}
                </th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t('columns.type')}
                </th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t('columns.contact')}
                </th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t('columns.status')}
                </th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t('columns.createdAt')}
                </th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t('paymentColumns.lastPaid')}
                </th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t('paymentColumns.totalPaid')}
                </th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t('paymentColumns.payments')}
                </th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {organizations.map((org) => {
                const payments = paymentsByOrgId.get(org.id) ?? [];
                const lastPaidAt = payments.length
                  ? payments.reduce(
                      (latest, p) => (new Date(p.paidAt) > new Date(latest) ? p.paidAt : latest),
                      payments[0].paidAt,
                    )
                  : null;
                return (
                <tr key={org.id} className="bg-background">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{org.name}</p>
                      {isDemoOrganization(org.id) && (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                          {tDemo('badge')}
                        </span>
                      )}
                    </div>
                    {org.nameAr && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{org.nameAr}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                      {org.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {org.phone && <p>{org.phone}</p>}
                    {org.email && <p>{org.email}</p>}
                    {!org.phone && !org.email && '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        org.isActive
                          ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {org.isActive ? t('status.active') : t('status.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {lastPaidAt ? new Date(lastPaidAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatTotalsCompact(payments)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {payments.length}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/platform/organizations/${org.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {t('columns.view')}
                    </Link>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
