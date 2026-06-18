'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Search } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store/auth';
import { PLATFORM_ACCESS_ROLES } from '@/lib/permissions';
import { useOrganizations } from '@/hooks/use-organizations';
import { useAllSubscriptionPayments } from '@/hooks/use-subscription-payments';
import { useStaff } from '@/hooks/use-staff';
import { isDemoOrganization } from '@/lib/demo-organizations';
import type { Organization } from '@/types/organization';
import type { SubscriptionPayment, SubscriptionPaymentMethod } from '@/types/subscription-payment';

const PAYMENT_METHODS: SubscriptionPaymentMethod[] = ['CASH', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'ONLINE', 'OTHER'];

interface Row {
  org: Organization;
  payment: SubscriptionPayment;
}

function formatPaymentAmount(amount: string, currency: string): string {
  return `${amount} ${currency}`;
}

// Locale-invariant numeric formatting — always en-GB digits, no month names,
// matching the receipt page's Phase 137B convention.
function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const datePart = formatDate(iso);
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
    .format(date)
    .toUpperCase();
  return `${datePart}, ${timePart}`;
}

function formatPeriod(start: string | null, end: string | null): string {
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  if (start) return formatDate(start);
  if (end) return formatDate(end);
  return '—';
}

// Sliced directly from the ISO string rather than re-derived via Date
// getters, so the comparison key never shifts with the browser's local
// timezone offset — the backend always serializes paidAt as YYYY-MM-DD...
function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

export default function PlatformPaymentsPage() {
  const t = useTranslations('platform.payments');
  const tMethods = useTranslations('platform.organizationDetail.subscriptionPayments');
  const tDemo = useTranslations('platform.demo');
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuthStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (user && !PLATFORM_ACCESS_ROLES.has(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const isSuperAdmin = !!user && PLATFORM_ACCESS_ROLES.has(user.role);

  const {
    data: organizations,
    isLoading: orgsLoading,
    isError: orgsError,
  } = useOrganizations();
  const { data: allUsers = [] } = useStaff(true);

  const organizationIds = (organizations ?? []).map((o) => o.id);
  const paymentQueries = useAllSubscriptionPayments(isSuperAdmin ? organizationIds : []);
  const paymentsByOrgId = new Map<string, SubscriptionPayment[]>();
  organizationIds.forEach((orgId, index) => {
    paymentsByOrgId.set(orgId, paymentQueries[index]?.data ?? []);
  });
  const paymentsLoading = organizationIds.length > 0 && paymentQueries.some((q) => q.isLoading);
  const paymentsPartialError = paymentQueries.some((q) => q.isError);

  if (!user || !isSuperAdmin) return null;

  function recordedByName(createdByUserId: string): string {
    const match = allUsers.find((candidate) => candidate.id === createdByUserId);
    return match ? `${match.firstName} ${match.lastName}` : '—';
  }

  const allRows: Row[] = [];
  (organizations ?? []).forEach((org) => {
    const payments = paymentsByOrgId.get(org.id) ?? [];
    payments.forEach((payment) => allRows.push({ org, payment }));
  });
  allRows.sort((a, b) => {
    const byPaid = new Date(b.payment.paidAt).getTime() - new Date(a.payment.paidAt).getTime();
    if (byPaid !== 0) return byPaid;
    return new Date(b.payment.createdAt).getTime() - new Date(a.payment.createdAt).getTime();
  });

  const currencyOptions = Array.from(new Set(allRows.map((r) => r.payment.currency))).sort();

  const filteredRows = allRows.filter(({ org, payment }) => {
    if (methodFilter && payment.method !== methodFilter) return false;
    if (currencyFilter && payment.currency !== currencyFilter) return false;
    if (dateFrom && dateKey(payment.paidAt) < dateFrom) return false;
    if (dateTo && dateKey(payment.paidAt) > dateTo) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      const haystack = [org.name, org.nameAr ?? '', payment.reference ?? '', payment.notes ?? '']
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  const isLoading = orgsLoading || paymentsLoading;
  const isError = orgsError;

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

      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">{t('loading')}</p>}

      {isError && <p className="text-sm text-destructive">{t('error')}</p>}

      {!isLoading && !isError && (
        <>
          {paymentsPartialError && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-400">
              {t('partialError')}
            </p>
          )}

          <div className="flex flex-wrap items-end gap-3">
            <div className="relative w-64">
              <Search className="absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('filters.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full rounded-md border bg-background ps-8 pe-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
              />
            </div>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
            >
              <option value="">{t('filters.methodAll')}</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {tMethods(`methods.${m}`)}
                </option>
              ))}
            </select>

            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
            >
              <option value="">{t('filters.currencyAll')}</option>
              {currencyOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5">
              <label className="text-sm text-muted-foreground">{t('filters.dateFrom')}</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 rounded-md border bg-background px-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-sm text-muted-foreground">{t('filters.dateTo')}</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 rounded-md border bg-background px-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('empty')}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.paidAt')}</th>
                    <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.organization')}</th>
                    <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.amount')}</th>
                    <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.method')}</th>
                    <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.period')}</th>
                    <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.reference')}</th>
                    <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.notes')}</th>
                    <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.recordedBy')}</th>
                    <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.recordedAt')}</th>
                    <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.receipt')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRows.map(({ org, payment }) => (
                    <tr key={payment.id} className="bg-background">
                      <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                        {formatDate(payment.paidAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/platform/organizations/${org.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {org.name}
                          </Link>
                          {isDemoOrganization(org.id) && (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                              {tDemo('badge')}
                            </span>
                          )}
                        </div>
                        {org.nameAr && <p className="mt-0.5 text-xs text-muted-foreground">{org.nameAr}</p>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatPaymentAmount(payment.amount, payment.currency)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{tMethods(`methods.${payment.method}`)}</td>
                      <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                        {formatPeriod(payment.periodStartAt, payment.periodEndAt)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{payment.reference ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{payment.notes ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{recordedByName(payment.createdByUserId)}</td>
                      <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                        {formatDateTime(payment.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`/${locale}/subscription-payments/${org.id}/${payment.id}/print`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {t('columns.receipt')}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
