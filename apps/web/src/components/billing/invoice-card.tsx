'use client';

import { useLocale, useTranslations } from 'next-intl';
import { InvoiceStatusBadge } from './invoice-status-badge';
import type { Invoice } from '@/types/invoice';

interface InvoiceCardProps {
  invoice: Invoice;
}

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

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function InvoiceCard({ invoice }: InvoiceCardProps) {
  const t = useTranslations('invoice');
  const locale = useLocale();

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" dir="ltr">{invoice.invoiceNumber}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {invoice.patient.firstName} {invoice.patient.lastName}
          </p>
        </div>
        <InvoiceStatusBadge status={invoice.status} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <p className="text-muted-foreground">{t('list.columns.amount')}</p>
          <p className="font-medium tabular-nums" dir="ltr">
            {formatAmount(invoice.totalAmount, locale)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t('list.columns.paid')}</p>
          <p className="font-medium tabular-nums" dir="ltr">
            {formatAmount(invoice.paidAmount, locale)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t('list.columns.date')}</p>
          <p className="font-medium" dir="ltr">
            {formatDate(invoice.issuedAt ?? invoice.createdAt)}
          </p>
        </div>
        {invoice.dueDate && (
          <div>
            <p className="text-muted-foreground">{t('list.columns.dueDate')}</p>
            <p className="font-medium" dir="ltr">{formatDate(invoice.dueDate)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
