'use client';

import { useTranslations, useLocale } from 'next-intl';
import type { TimelineEvent } from '@/types/timeline';
import { formatAmount } from '@/lib/format-currency';
import { formatTime } from './format-time';

type Props = { event: Extract<TimelineEvent, { type: 'INVOICE_ISSUED' }> };

export function InvoiceCard({ event }: Props) {
  const t = useTranslations('timeline.cards');
  const tStatus = useTranslations('invoice.status');
  const locale = useLocale();
  const { data } = event;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm border-s-4 border-s-amber-400">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          {t('invoice')}
        </span>
        <span className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</span>
      </div>

      <p className="font-medium text-sm text-foreground" dir="ltr">{data.invoiceNumber}</p>

      <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
        {formatAmount(Number(data.totalAmount), locale)} · {tStatus(data.status)}
      </p>
    </div>
  );
}
