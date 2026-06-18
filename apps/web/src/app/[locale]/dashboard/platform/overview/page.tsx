'use client';

import { useEffect } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth';
import { PLATFORM_ACCESS_ROLES } from '@/lib/permissions';
import { useOrganizations } from '@/hooks/use-organizations';
import { useStaff } from '@/hooks/use-staff';
import { useRecentAuditLogs } from '@/hooks/use-audit-logs';
import type { SubscriptionStatus } from '@/types/organization';

const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ['TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'];
const NEEDS_REVIEW_WINDOW_DAYS = 30;
const MS_PER_DAY = 86_400_000;

function subscriptionBadgeClass(status: SubscriptionStatus): string {
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

export default function PlatformOverviewPage() {
  const t = useTranslations('platform.overview');
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && !PLATFORM_ACCESS_ROLES.has(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const { data: organizations = [], isLoading: orgsLoading, isError: orgsError } = useOrganizations();
  const { data: users = [], isLoading: usersLoading, isError: usersError } = useStaff(true);
  const { data: auditLogs = [], isLoading: auditLoading, isError: auditError } = useRecentAuditLogs(5);

  if (!user || !PLATFORM_ACCESS_ROLES.has(user.role)) return null;

  const dataLoading = orgsLoading || usersLoading;
  const dataError = orgsError || usersError;

  const totalOrganizations = organizations.length;
  const activeOrganizations = organizations.filter((o) => o.isActive).length;
  const inactiveOrganizations = organizations.filter((o) => !o.isActive).length;

  const subscriptionCounts: Record<SubscriptionStatus, number> = {
    TRIAL: 0,
    ACTIVE: 0,
    SUSPENDED: 0,
    EXPIRED: 0,
    CANCELLED: 0,
  };
  for (const org of organizations) {
    subscriptionCounts[org.subscriptionStatus] = (subscriptionCounts[org.subscriptionStatus] ?? 0) + 1;
  }

  const totalUsers = users.length;
  const orgAdminCount = users.filter((u) => u.role === 'ORG_ADMIN' && !u.deletedAt).length;
  const activeStaffCount = users.filter(
    (u) => u.isActive && !u.deletedAt && u.role !== 'ORG_ADMIN' && u.role !== 'SUPER_ADMIN',
  ).length;

  // Backend already returns createdAt desc, but sort defensively rather than assume.
  const recentOrganizations = [...organizations]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  // Display-only — never reads or infers subscriptionStatus, only subscriptionEndAt.
  const needsReview = organizations
    .filter((o) => !!o.subscriptionEndAt)
    .map((o) => {
      const end = new Date(o.subscriptionEndAt as string);
      const daysUntilEnd = Math.floor((end.getTime() - today.getTime()) / MS_PER_DAY);
      return { org: o, daysUntilEnd };
    })
    .filter(({ daysUntilEnd }) => daysUntilEnd <= NEEDS_REVIEW_WINDOW_DAYS)
    .sort((a, b) => a.daysUntilEnd - b.daysUntilEnd);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/platform/organizations"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('organizationsLink')}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {dataLoading && !dataError && (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      )}

      {dataError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{t('error')}</p>
        </div>
      )}

      {!dataLoading && !dataError && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: t('stats.totalOrganizations'), value: totalOrganizations },
              { label: t('stats.activeOrganizations'), value: activeOrganizations },
              { label: t('stats.inactiveOrganizations'), value: inactiveOrganizations },
              { label: t('stats.totalUsers'), value: totalUsers },
              { label: t('stats.orgAdmins'), value: orgAdminCount },
              { label: t('stats.activeStaff'), value: activeStaffCount },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-border bg-card p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {/* Subscription distribution */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">{t('subscriptionDistribution.title')}</h2>
            <div className="flex flex-wrap gap-2">
              {SUBSCRIPTION_STATUSES.map((status) => (
                <span
                  key={status}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${subscriptionBadgeClass(status)}`}
                >
                  {t(`subscriptionDistribution.${status}`)}: {subscriptionCounts[status]}
                </span>
              ))}
            </div>
          </div>

          {/* Recent organizations */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">{t('recentOrganizations.title')}</h2>
            {recentOrganizations.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('recentOrganizations.empty')}</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('recentOrganizations.columns.name')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('recentOrganizations.columns.type')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('recentOrganizations.columns.status')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('recentOrganizations.columns.createdAt')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentOrganizations.map((org) => (
                      <tr key={org.id} className="bg-background">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{org.name}</p>
                          {org.nameAr && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{org.nameAr}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                            {org.type}
                          </span>
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
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/platform/organizations/${org.id}`}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {t('recentOrganizations.columns.view')}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Needs review — display-only, never mutates subscriptionStatus */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">{t('needsReview.title')}</h2>
            <p className="text-xs text-muted-foreground">{t('needsReview.helperText')}</p>
            {needsReview.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('needsReview.empty')}</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('needsReview.columns.name')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('needsReview.columns.endDate')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('needsReview.columns.status')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {needsReview.map(({ org, daysUntilEnd }) => (
                      <tr key={org.id} className="bg-background">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{org.name}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {org.subscriptionEndAt ? new Date(org.subscriptionEndAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              daysUntilEnd < 0
                                ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                            }`}
                          >
                            {daysUntilEnd < 0 ? t('needsReview.expired') : t('needsReview.expiringSoon')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/platform/organizations/${org.id}`}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {t('recentOrganizations.columns.view')}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Recent audit events — failure here never fails the rest of the page */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">{t('recentAuditEvents.title')}</h2>
            {auditLoading && (
              <p className="text-sm text-muted-foreground">{t('loading')}</p>
            )}
            {!auditLoading && auditError && (
              <p className="text-sm text-destructive">{t('recentAuditEvents.error')}</p>
            )}
            {!auditLoading && !auditError && auditLogs.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('recentAuditEvents.empty')}</p>
            )}
            {!auditLoading && !auditError && auditLogs.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('recentAuditEvents.columns.action')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('recentAuditEvents.columns.resource')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('recentAuditEvents.columns.resourceId')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('recentAuditEvents.columns.createdAt')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="bg-background">
                        <td className="px-4 py-3 font-medium text-foreground">{log.action}</td>
                        <td className="px-4 py-3 text-muted-foreground">{log.resource}</td>
                        <td className="px-4 py-3 text-muted-foreground">{log.resourceId ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Limit note */}
          <p className="text-xs text-muted-foreground">{t('limitNote')}</p>
        </>
      )}
    </div>
  );
}
