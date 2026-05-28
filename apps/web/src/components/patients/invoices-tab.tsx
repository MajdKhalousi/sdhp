'use client';

import { Link } from '@/i18n/navigation';
import { Receipt } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { usePatientInvoices } from '@/hooks/use-invoices';
import { InvoiceStatusBadge } from '@/components/billing/invoice-status-badge';
import { Skeleton } from '@/components/ui/skeleton';

function formatAmount(value: string, locale: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '— SYP';
  return (
    new Intl.NumberFormat(locale === 'ar' ? 'ar-SY' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num) + ' SYP'
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface InvoicesTabProps {
  patientId: string;
}

export function InvoicesTab({ patientId }: InvoicesTabProps) {
  const t = useTranslations('invoice.list');
  const tError = useTranslations('patient.detail.error');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const { data = [], isLoading, isError, error, refetch } = usePatientInvoices(patientId);

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
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <Receipt className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{t('empty.patientNoData')}</p>
      </div>
    );
  }

  return (
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
            {data.map((invoice) => {
              const rem = parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount);
              return (
                <tr key={invoice.id} className="border-t border-border transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/invoices/${invoice.id}`}
                      className="text-sm font-medium tabular-nums hover:underline"
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
                    {!isNaN(rem) ? formatAmount(String(rem), locale) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap" dir="ltr">
                    {formatDate(invoice.dueDate)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap" dir="ltr">
                    {formatDate(invoice.issuedAt ?? invoice.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
