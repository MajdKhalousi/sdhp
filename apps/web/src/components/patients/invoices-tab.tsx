'use client';

import { Link } from '@/i18n/navigation';
import { Plus, Receipt } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { usePatientInvoices } from '@/hooks/use-invoices';
import { useAuthStore } from '@/store/auth';
import { InvoiceStatusBadge } from '@/components/billing/invoice-status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateDisplay } from '@/lib/format-date';
import { isOverdue } from '@/lib/billing-utils';
import type { Invoice, InvoiceStatus } from '@/types/invoice';

const INVOICE_CREATE_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'ACCOUNTANT', 'SECRETARY']);
const OUTSTANDING_STATUSES = new Set<InvoiceStatus>(['ISSUED', 'PARTIALLY_PAID']);
const SETTLED_STATUSES     = new Set<InvoiceStatus>(['PAID']);
const OTHER_STATUSES       = new Set<InvoiceStatus>(['DRAFT', 'CANCELLED']);

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

interface InvoicesTabProps {
  patientId: string;
}

export function InvoicesTab({ patientId }: InvoicesTabProps) {
  const t       = useTranslations('invoice.list');
  const tDetail = useTranslations('patient.detail');
  const tActions = useTranslations('invoice.actions');
  const tInvoice = useTranslations('invoice');
  const tError   = useTranslations('patient.detail.error');
  const tCommon  = useTranslations('common');
  const locale   = useLocale();
  const { user } = useAuthStore();
  const canCreate = user ? INVOICE_CREATE_ROLES.has(user.role) : false;

  const { data = [], isLoading, isError, error, refetch } = usePatientInvoices(patientId);

  const newInvoiceBtn = canCreate && (
    <div className="flex justify-end">
      <Link
        href={`/dashboard/invoices/new?patientId=${patientId}`}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Plus className="h-3.5 w-3.5" />
        {tActions('newInvoice')}
      </Link>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
        <p className="text-sm font-medium text-destructive">{t('error.loadFailed')}</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          {error instanceof Error ? error.message : tError('occurred')}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-1 h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
        >
          {tCommon('actions.tryAgain')}
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="space-y-4">
        {newInvoiceBtn}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Receipt className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{t('empty.patientNoData')}</p>
        </div>
      </div>
    );
  }

  const outstandingInvoices = data.filter((inv) => OUTSTANDING_STATUSES.has(inv.status));
  const settledInvoices     = data.filter((inv) => SETTLED_STATUSES.has(inv.status));
  const otherInvoices       = data.filter((inv) => OTHER_STATUSES.has(inv.status));

  function renderRow(invoice: Invoice) {
    const rem = parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount);
    return (
      <tr key={invoice.id} className="border-t border-border transition-colors hover:bg-muted/20">
        <td className="px-4 py-3">
          <Link
            href={`/dashboard/invoices/${invoice.id}`}
            className="text-sm font-medium tabular-nums text-primary hover:underline"
            dir="ltr"
          >
            {invoice.invoiceNumber}
          </Link>
        </td>
        <td className="px-4 py-3">
          <InvoiceStatusBadge status={invoice.status} />
        </td>
        <td className="px-4 py-3 text-end text-sm tabular-nums" dir="ltr">
          {formatAmount(invoice.totalAmount, locale)}
        </td>
        <td className="px-4 py-3 text-end text-sm tabular-nums" dir="ltr">
          {formatAmount(invoice.paidAmount, locale)}
        </td>
        <td className="px-4 py-3 text-end text-sm tabular-nums" dir="ltr">
          {invoice.status === 'CANCELLED' || invoice.status === 'DRAFT'
            ? '—'
            : (!isNaN(rem) ? formatAmount(String(rem), locale) : '—')}
        </td>
        <td className="px-4 py-3 text-sm whitespace-nowrap" dir="ltr">
          {invoice.dueDate && isOverdue(invoice) ? (
            <span className="font-medium text-destructive">
              {formatDateDisplay(invoice.dueDate)}{' '}
              <span className="ms-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-xs">
                {tInvoice('overdue')}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">{formatDateDisplay(invoice.dueDate)}</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap" dir="ltr">
          {formatDateDisplay(invoice.issuedAt ?? invoice.createdAt)}
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-4">
      {newInvoiceBtn}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t('columns.invoiceNumber')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('columns.status')}</th>
                <th className="px-4 py-3 text-end font-medium">{t('columns.amount')}</th>
                <th className="px-4 py-3 text-end font-medium">{t('columns.paid')}</th>
                <th className="px-4 py-3 text-end font-medium">{t('columns.remaining')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('columns.dueDate')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('columns.date')}</th>
              </tr>
            </thead>
            <tbody>
              {outstandingInvoices.length > 0 && (
                <>
                  <tr className="border-t border-border">
                    <td
                      colSpan={7}
                      className="bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {tDetail('invoices.sectionOutstanding')}
                    </td>
                  </tr>
                  {outstandingInvoices.map(renderRow)}
                </>
              )}
              {settledInvoices.length > 0 && (
                <>
                  <tr className="border-t border-border">
                    <td
                      colSpan={7}
                      className="bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {tDetail('invoices.sectionSettled')}
                    </td>
                  </tr>
                  {settledInvoices.map(renderRow)}
                </>
              )}
              {otherInvoices.length > 0 && (
                <>
                  <tr className="border-t border-border">
                    <td
                      colSpan={7}
                      className="bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {tDetail('invoices.sectionOther')}
                    </td>
                  </tr>
                  {otherInvoices.map(renderRow)}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
