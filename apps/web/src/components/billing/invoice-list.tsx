'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Plus, Receipt } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useTranslations, useLocale } from 'next-intl';
import { useInvoices } from '@/hooks/use-invoices';
import { InvoiceStatusBadge } from './invoice-status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDateDisplay } from '@/lib/format-date';
import type { InvoiceStatus } from '@/types/invoice';

const STATUS_TABS = ['', 'DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'] as const;
const INVOICE_CREATE_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'ACCOUNTANT', 'SECRETARY']);
type StatusTab = (typeof STATUS_TABS)[number];

function formatAmount(value: string, locale: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '— SYP';
  return (
    new Intl.NumberFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num) + ' SYP'
  );
}

export function InvoiceList() {
  const t = useTranslations('invoice');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const { user } = useAuthStore();
  const canCreate = user ? INVOICE_CREATE_ROLES.has(user.role) : false;

  const [statusFilter, setStatusFilter] = useState<StatusTab>('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  const hasFilters = !!search || !!fromDate || !!toDate || statusFilter !== '';

  function handleStatusChange(tab: StatusTab) {
    setStatusFilter(tab);
    setPage(1);
  }

  function clearFilters() {
    setSearch('');
    setFromDate('');
    setToDate('');
    setStatusFilter('');
    setPage(1);
  }

  const { data, isLoading, isError, error, refetch } = useInvoices({
    ...(statusFilter ? { status: statusFilter as InvoiceStatus } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(fromDate ? { from: fromDate } : {}),
    ...(toDate ? { to: toDate } : {}),
    page,
    limit: 20,
  });

  const columns = [
    t('list.columns.invoiceNumber'),
    t('list.columns.patient'),
    t('list.columns.status'),
    t('list.columns.amount'),
    t('list.columns.paid'),
    t('list.columns.dueDate'),
    t('list.columns.date'),
  ];

  const filtersRow = (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        placeholder={t('list.filters.searchPlaceholder')}
        className="h-8 min-w-[200px] flex-1 rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
      />
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {t('list.filters.fromDate')}
        </span>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
          dir="ltr"
          className="h-8 w-36 rounded-md border bg-background px-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {t('list.filters.toDate')}
        </span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => { setToDate(e.target.value); setPage(1); }}
          dir="ltr"
          className="h-8 w-36 rounded-md border bg-background px-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
        />
      </div>
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="h-8 rounded-md border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {t('list.filters.clearFilters')}
        </button>
      )}
    </div>
  );

  const statusTabs = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-1.5">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleStatusChange(tab)}
            className={cn(
              'h-7 rounded-full px-3 text-xs font-medium transition-colors',
              statusFilter === tab
                ? 'bg-primary text-primary-foreground'
                : 'border border-border text-muted-foreground hover:bg-accent',
            )}
          >
            {tab === ''
              ? t('list.filter.all')
              : t(`status.${tab}` as Parameters<typeof t>[0])}
          </button>
        ))}
      </div>
      {canCreate && (
        <Link
          href="/dashboard/invoices/new"
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('actions.newInvoice')}
        </Link>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {filtersRow}
        {statusTabs}
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  {columns.map((h) => (
                    <th key={h} className="px-4 py-3 text-start font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    {Array.from({ length: columns.length }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3">
        {filtersRow}
        {statusTabs}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-16 text-center">
          <p className="text-sm font-medium text-destructive">
            {t('list.error.loadFailed')}
          </p>
          <p className="max-w-xs text-xs text-muted-foreground">
            {error instanceof Error ? error.message : tCommon('states.error')}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-1 h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
          >
            {tCommon('actions.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="space-y-3">
        {filtersRow}
        {statusTabs}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Receipt className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">{t('list.empty.heading')}</p>
          <p className="text-xs text-muted-foreground">
            {hasFilters ? t('list.empty.withFilters') : t('list.empty.noData')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filtersRow}
      {statusTabs}

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t('list.columns.invoiceNumber')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('list.columns.patient')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('list.columns.status')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('list.columns.amount')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('list.columns.paid')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('list.columns.dueDate')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('list.columns.date')}</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="border-t border-border transition-colors hover:bg-muted/20 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/invoices/${invoice.id}`}
                      className="block text-sm font-medium tabular-nums hover:underline"
                      dir="ltr"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm">
                      {invoice.patient.firstName} {invoice.patient.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {invoice.patient.mrn}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={invoice.status} />
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums" dir="ltr">
                    {formatAmount(invoice.totalAmount, locale)}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums" dir="ltr">
                    {formatAmount(invoice.paidAmount, locale)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap" dir="ltr">
                    {formatDateDisplay(invoice.dueDate)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap" dir="ltr">
                    {formatDateDisplay(invoice.issuedAt ?? invoice.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 pt-1 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('list.pagination.previous')}
          </button>
          <span className="text-xs text-muted-foreground">
            {t('list.pagination.pageOf', { page, total: data.totalPages })}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages}
            className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('list.pagination.next')}
          </button>
        </div>
      )}
    </div>
  );
}
