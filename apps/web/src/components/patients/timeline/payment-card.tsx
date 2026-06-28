'use client';

import { useTranslations, useLocale } from 'next-intl';
import type { TimelineEvent } from '@/types/timeline';
import { formatAmount } from '@/lib/format-currency';
import { formatTime } from './format-time';

type Props = { event: Extract<TimelineEvent, { type: 'PAYMENT_RECORDED' }> };

export function PaymentCard({ event }: Props) {
  const t = useTranslations('timeline.cards');
  const tMethod = useTranslations('invoice.payments.method');
  const tPayments = useTranslations('invoice.payments');
  const locale = useLocale();
  const { data } = event;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm border-s-4 border-s-blue-400">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          {t('payment')}
        </span>
        <span className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</span>
      </div>

      <p className="font-medium text-sm text-foreground" dir="ltr">
        {formatAmount(Number(data.amount), locale)}
      </p>

      <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
        {tMethod(data.method)}
        {data.voided ? ` · ${tPayments('voided')}` : ''}
      </p>
    </div>
  );
}
