'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { usePatientOutstandingBalance } from '@/hooks/use-invoices';
import { formatDateDisplay } from '@/lib/format-date';

function formatAmount(value: number, locale: string): string {
  return (
    new Intl.NumberFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value) + ' SYP'
  );
}

interface Props {
  patientId: string;
  onViewInvoices: () => void;
}

export function PatientOutstandingBalance({ patientId, onViewInvoices }: Props) {
  const t = useTranslations('patient.outstandingBalance');
  const locale = useLocale();

  const { data: balance, isLoading } = usePatientOutstandingBalance(patientId);

  if (isLoading) {
    return <Skeleton className="h-16 w-full rounded-xl" />;
  }

  if (!balance || balance.outstandingAmount <= 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-400">
          {t('heading')}
        </p>
        <button
          type="button"
          onClick={onViewInvoices}
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          {t('viewInvoices')} →
        </button>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">{t('amount')}</span>
          <span className="text-sm font-semibold text-amber-700 dark:text-amber-400" dir="ltr">
            {formatAmount(balance.outstandingAmount, locale)}
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">{t('invoiceCount')}</span>
          <span className="text-sm font-medium text-foreground">{balance.invoiceCount}</span>
        </div>

        {balance.oldestUnpaidAt && (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{t('oldestUnpaid')}</span>
            <span className="text-sm font-medium text-foreground" dir="ltr">
              {formatDateDisplay(balance.oldestUnpaidAt)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
