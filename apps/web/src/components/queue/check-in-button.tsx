'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useCheckIn } from '@/hooks/use-queue';
import { useInvoice } from '@/hooks/use-invoices';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-messages';
import { formatAmount } from '@/lib/format-currency';
import { Skeleton } from '@/components/ui/skeleton';
import { InvoiceStatusBadge } from '@/components/billing/invoice-status-badge';
import { IssueAndPayDialog } from '@/components/billing/issue-and-pay-dialog';
import type { PaymentReadiness } from '@/types/queue';

interface CheckInButtonProps {
  appointmentId: string;
  onSuccess?: () => void;
}

type GateState =
  | { kind: 'closed' }
  | { kind: 'unpaid'; readiness: PaymentReadiness }
  | { kind: 'unknown' }
  | { kind: 'collecting'; readiness: PaymentReadiness };

export function CheckInButton({ appointmentId, onSuccess }: CheckInButtonProps) {
  const t = useTranslations('queue.checkIn');
  const tGate = useTranslations('queue.paymentGate');
  const tRoot = useTranslations();
  const locale = useLocale();
  const [error, setError] = useState('');
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [gate, setGate] = useState<GateState>({ kind: 'closed' });
  const qc = useQueryClient();
  // autoInvalidate is disabled here because invalidating ['queue']/['appointments']
  // immediately would refetch and re-render this row away before the payment gate
  // panel below has a chance to show — invalidation is done manually once the gate
  // resolves (see resolveGate below).
  const { mutate, isPending } = useCheckIn({ autoInvalidate: false });

  // useInvoice must be called unconditionally (React hook rules) — it already disables
  // itself internally when passed an empty id, so pass '' whenever no invoice should
  // be fetched rather than skipping the call.
  const collectingInvoiceId = gate.kind === 'collecting' ? gate.readiness.invoiceId ?? '' : '';
  const { data: invoice, isLoading: invoiceLoading, isError: invoiceError } =
    useInvoice(collectingInvoiceId);

  function resolveGate() {
    setGate({ kind: 'closed' });
    qc.invalidateQueries({ queryKey: ['queue'] });
    qc.invalidateQueries({ queryKey: ['appointments'] });
    onSuccess?.();
  }

  function handleCheckIn() {
    setError('');
    setIsDuplicate(false);
    mutate(
      { appointmentId },
      {
        onSuccess: (result) => {
          const readiness = result.paymentReadiness;
          if (readiness.readiness === 'DEPOSIT_UNPAID' || readiness.readiness === 'FULL_UNPAID') {
            setGate({ kind: 'unpaid', readiness });
          } else if (readiness.readiness === 'READINESS_UNKNOWN') {
            setGate({ kind: 'unknown' });
          } else {
            resolveGate();
          }
        },
        onError: (e) => {
          if (e instanceof Error && e.name === 'ConflictError') {
            setIsDuplicate(true);
          } else {
            setError(getFriendlyApiErrorMessage(e, tRoot));
          }
        },
      },
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {gate.kind === 'closed' && (
        <button
          onClick={handleCheckIn}
          disabled={isPending}
          className="h-7 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? t('checkingIn') : t('trigger')}
        </button>
      )}

      {gate.kind === 'unpaid' && (
        <div className="w-72 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="font-semibold text-amber-800 dark:text-amber-300">{tGate('title')}</p>
          <div className="space-y-1 text-amber-900/80 dark:text-amber-200/80">
            {gate.readiness.requiredAmount !== null && (
              <p>
                {tGate('requiredAmount')}:{' '}
                <span dir="ltr">{formatAmount(gate.readiness.requiredAmount, locale)}</span>
              </p>
            )}
            <p>
              {tGate('paidAmount')}:{' '}
              <span dir="ltr">{formatAmount(gate.readiness.paidAmount, locale)}</span>
            </p>
            {gate.readiness.remainingAmount !== null && (
              <p>
                {tGate('remainingAmount')}:{' '}
                <span dir="ltr">{formatAmount(gate.readiness.remainingAmount, locale)}</span>
              </p>
            )}
            {gate.readiness.invoiceStatus && (
              <p className="flex items-center gap-1.5">
                <span>{tGate('invoiceStatus')}:</span>
                <InvoiceStatusBadge status={gate.readiness.invoiceStatus} />
              </p>
            )}
            {!gate.readiness.invoiceId && (
              <p className="text-amber-700/70 dark:text-amber-400/70">{tGate('noInvoiceAvailable')}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {gate.readiness.invoiceId && (
              <button
                type="button"
                onClick={() => setGate({ kind: 'collecting', readiness: gate.readiness })}
                className="h-7 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {tGate('collectPaymentNow')}
              </button>
            )}
            <button
              type="button"
              onClick={resolveGate}
              className="h-7 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent"
            >
              {tGate('continueWithoutPayment')}
            </button>
          </div>
        </div>
      )}

      {gate.kind === 'collecting' && (
        <div className="w-80">
          {invoiceLoading && (
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">{tGate('loadingInvoice')}</p>
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-8 w-full" />
            </div>
          )}
          {!invoiceLoading && invoiceError && (
            <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
              <p className="text-destructive">{tGate('invoiceLoadError')}</p>
              <button
                type="button"
                onClick={resolveGate}
                className="h-7 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent"
              >
                {tGate('continueWithoutPayment')}
              </button>
            </div>
          )}
          {!invoiceLoading && !invoiceError && invoice && (
            <IssueAndPayDialog
              invoice={invoice}
              onSuccess={resolveGate}
              onCancel={() => setGate({ kind: 'unpaid', readiness: gate.readiness })}
            />
          )}
        </div>
      )}

      {gate.kind === 'unknown' && (
        <div className="w-72 space-y-2 rounded-lg border bg-muted/30 p-3 text-xs">
          <p className="font-semibold">{tGate('unknownTitle')}</p>
          <p className="text-muted-foreground">{tGate('unknownBody')}</p>
          <button
            type="button"
            onClick={resolveGate}
            className="h-7 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent"
          >
            {tGate('continueWithoutPayment')}
          </button>
        </div>
      )}

      {isDuplicate && (
        <p className="max-w-[16rem] text-end text-xs text-destructive">
          {t('duplicate')}{' '}
          <Link
            href="/dashboard/queue"
            className="underline hover:no-underline"
          >
            {t('viewQueue')}
          </Link>
        </p>
      )}
      {error && (
        <p className="max-w-[16rem] text-end text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
