'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useInvoice } from '@/hooks/use-invoices';
import { Skeleton } from '@/components/ui/skeleton';
import { IssueAndPayDialog } from '@/components/billing/issue-and-pay-dialog';

interface PaymentCollectionOverlayProps {
  invoiceId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

type OverlayState = 'form' | 'confirmClose';

export function PaymentCollectionOverlay({ invoiceId, onSuccess, onCancel }: PaymentCollectionOverlayProps) {
  const tGate = useTranslations('queue.paymentGate');
  const tConfirm = useTranslations('queue.paymentGate.confirmClose');
  const [overlayState, setOverlayState] = useState<OverlayState>('form');
  const { data: invoice, isLoading, isError } = useInvoice(invoiceId);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && overlayState === 'form') {
        setOverlayState('confirmClose');
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [overlayState]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget && overlayState === 'form') {
      setOverlayState('confirmClose');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-card shadow-lg"
        role="dialog"
        aria-modal="true"
      >
        {overlayState === 'confirmClose' ? (
          <div className="space-y-4 p-5 text-sm">
            <div>
              <p className="font-semibold">{tConfirm('title')}</p>
              <p className="mt-1 text-muted-foreground">{tConfirm('body')}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOverlayState('form')}
                className="h-9 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent"
              >
                {tConfirm('returnToPayment')}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="h-9 rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
              >
                {tConfirm('continueClosing')}
              </button>
            </div>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="space-y-2 p-5">
                <p className="text-xs text-muted-foreground">{tGate('loadingInvoice')}</p>
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-8 w-full" />
              </div>
            )}
            {!isLoading && isError && (
              <div className="space-y-3 p-5 text-sm">
                <p className="text-destructive">{tGate('invoiceLoadError')}</p>
                <button
                  type="button"
                  onClick={onCancel}
                  className="h-9 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent"
                >
                  {tConfirm('returnToPayment')}
                </button>
              </div>
            )}
            {!isLoading && !isError && invoice && (
              <IssueAndPayDialog
                invoice={invoice}
                onSuccess={onSuccess}
                onCancel={() => setOverlayState('confirmClose')}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
