'use client';

import { useState, useMemo } from 'react';
import { Link } from '@/i18n/navigation';
import { Banknote, Wallet, TrendingUp, FileText, Users } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useAuthStore } from '@/store/auth';
import { useBillingReport, useOutstandingPatients } from '@/hooks/use-invoices';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateDisplay } from '@/lib/format-date';

const BILLING_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'ACCOUNTANT']);

type Preset = 'today' | 'thisMonth' | 'custom';

function getDateRange(preset: Preset, customFrom: string, customTo: string) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  if (preset === 'today') {
    return {
      from: new Date(y, m, d, 0, 0, 0, 0).toISOString(),
      to: new Date(y, m, d, 23, 59, 59, 999).toISOString(),
    };
  }
  if (preset === 'thisMonth') {
    return {
      from: new Date(y, m, 1, 0, 0, 0, 0).toISOString(),
      to: new Date(y, m + 1, 0, 23, 59, 59, 999).toISOString(),
    };
  }
  return {
    from: customFrom ? new Date(customFrom + 'T00:00:00').toISOString() : undefined,
    to: customTo ? new Date(customTo + 'T23:59:59').toISOString() : undefined,
  };
}

function formatAmount(value: number, locale: string): string {
  return (
    new Intl.NumberFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value) + ' SYP'
  );
}

const PRESET_ORDER: Preset[] = ['today', 'thisMonth', 'custom'];

export default function BillingReportsPage() {
  const t = useTranslations('billingReports');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { user } = useAuthStore();
  const canView = BILLING_ROLES.has(user?.role ?? '');

  const [preset, setPreset] = useState<Preset>('thisMonth');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [page, setPage] = useState(1);

  const LIMIT = 20;

  const { from, to } = useMemo(
    () => getDateRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const { data: report, isLoading: reportLoading, isError: reportError } = useBillingReport(
    { from, to },
    canView,
  );

  const { data: outstandingData, isLoading: outstandingLoading } = useOutstandingPatients(
    { page, limit: LIMIT },
    canView,
  );

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-muted-foreground">{t('forbidden')}</p>
      </div>
    );
  }

  const presetLabels: Record<Preset, string> = {
    today: t('today'),
    thisMonth: t('thisMonth'),
    custom: t('custom'),
  };

  const patients = outstandingData?.data ?? [];
  const totalPages = outstandingData?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('period')}</p>
          <div className="flex items-center rounded-lg border bg-background p-0.5">
            {PRESET_ORDER.map((p) => (
              <button
                key={p}
                onClick={() => { setPreset(p); setPage(1); }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  preset === p
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {presetLabels[p]}
              </button>
            ))}
          </div>
        </div>

        {preset === 'custom' && (
          <>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('from')}</p>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }}
                className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('to')}</p>
              <input
                type="date"
                value={customTo}
                onChange={(e) => { setCustomTo(e.target.value); setPage(1); }}
                className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </>
        )}
      </div>

      {/* Summary cards */}
      {reportLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : reportError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{t('errors.loadFailed')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-muted-foreground">{t('cards.totalInvoiced')}</p>
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">
              {report ? formatAmount(report.totalInvoiced, locale) : '—'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {report ? `${report.invoiceCount} ${t('cards.invoices')}` : ''}
            </p>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-muted-foreground">{t('cards.collected')}</p>
              <Banknote className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {report ? formatAmount(report.totalCollected, locale) : '—'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {report ? `${report.paidCount} ${t('cards.paid')} · ${report.partialCount} ${t('cards.partial')}` : ''}
            </p>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-muted-foreground">{t('cards.currentOutstanding')}</p>
              <Wallet className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {report ? formatAmount(report.totalOutstanding, locale) : '—'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {report ? `${report.unpaidCount} ${t('cards.unpaid')}` : ''}
            </p>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-muted-foreground">{t('cards.collectionRate')}</p>
              <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">
              {report ? `${report.collectionRate.toFixed(1)}%` : '—'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {report ? t('cards.collectionRateHint') : ''}
            </p>
          </div>
        </div>
      )}

      {/* Outstanding Patients */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-base font-semibold">{t('outstandingPatients.title')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('outstandingPatients.scopeNote')}</p>
        </div>

        {outstandingLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <Users className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-medium">{t('outstandingPatients.empty')}</p>
            <p className="text-xs text-muted-foreground">{t('outstandingPatients.emptyHint')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-start text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3">{t('outstandingPatients.patient')}</th>
                    <th className="px-5 py-3">{t('outstandingPatients.mrn')}</th>
                    <th className="px-5 py-3">{t('outstandingPatients.outstanding')}</th>
                    <th className="px-5 py-3">{t('outstandingPatients.invoices')}</th>
                    <th className="px-5 py-3">{t('outstandingPatients.oldestUnpaid')}</th>
                    <th className="px-5 py-3">{t('outstandingPatients.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {patients.map((p) => (
                    <tr key={p.patientId} className="transition-colors hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium">
                        {p.firstName} {p.lastName}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground" dir="ltr">
                        {p.mrn}
                      </td>
                      <td className="px-5 py-3 font-semibold text-amber-600 dark:text-amber-400" dir="ltr">
                        {formatAmount(p.outstandingAmount, locale)}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {p.invoiceCount}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {formatDateDisplay(p.oldestUnpaidAt)}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/dashboard/patients/${p.patientId}`}
                          className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent"
                        >
                          {t('outstandingPatients.viewPatient')}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-5 py-3">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                  className="h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                >
                  {tCommon('pagination.previous')}
                </button>
                <p className="text-xs text-muted-foreground">
                  {tCommon('pagination.pageOf', { page, total: totalPages })}
                </p>
                <button
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages}
                  className="h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                >
                  {tCommon('pagination.next')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
