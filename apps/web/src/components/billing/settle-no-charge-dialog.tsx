'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSettleNoCharge } from '@/hooks/use-invoices';
import { useToast } from '@/hooks/use-toast';

/**
 * Always-expanded confirm panel — for the cashier "today"/"outstanding" rows,
 * which control expansion via the same isActive/onCancel pattern as IssueAndPayDialog.
 */
export function SettleNoChargeConfirm({
  invoiceId,
  onSuccess,
  onCancel,
}: {
  invoiceId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations('invoice.actions');
  const tCommon = useTranslations('common');
  const [error, setError] = useState('');
  const { mutate, isPending } = useSettleNoCharge();
  const { toast } = useToast();

  function handleConfirm() {
    setError('');
    mutate(invoiceId, {
      onSuccess: () => {
        onSuccess();
        toast({ title: t('settleSuccess'), variant: 'success' });
      },
      onError: (e) => {
        setError(e instanceof Error ? e.message : t('settleFailed'));
      },
    });
  }

  return (
    <div className="bg-muted/20 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{t('settleConfirmTitle')}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('settleConfirmBody')}</p>
        </div>
        <button
          onClick={onCancel}
          disabled={isPending}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-accent disabled:opacity-50"
          aria-label={tCommon('actions.cancel')}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? t('settling') : t('settleSubmit')}
        </button>
        <button
          onClick={onCancel}
          disabled={isPending}
          className="h-8 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
        >
          {tCommon('actions.cancel')}
        </button>
      </div>
    </div>
  );
}

/**
 * Self-toggling button + inline confirm — for the invoice detail toolbar,
 * mirroring CancelInvoiceDialog's pattern.
 */
export function SettleNoChargeDialog({
  invoiceId,
  onSuccess,
}: {
  invoiceId: string;
  onSuccess?: () => void;
}) {
  const t = useTranslations('invoice.actions');
  const tCommon = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const { mutate, isPending } = useSettleNoCharge();
  const { toast } = useToast();

  function handleOpen() {
    setOpen(true);
    setError('');
  }

  function handleClose() {
    if (isPending) return;
    setOpen(false);
    setError('');
  }

  function handleConfirm() {
    setError('');
    mutate(invoiceId, {
      onSuccess: () => {
        setOpen(false);
        onSuccess?.();
        toast({ title: t('settleSuccess'), variant: 'success' });
      },
      onError: (e) => {
        setError(e instanceof Error ? e.message : t('settleFailed'));
      },
    });
  }

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent"
      >
        {t('settleNoCharge')}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <p className="text-sm font-medium text-foreground">{t('settleConfirmTitle')}</p>
      <p className="text-xs text-muted-foreground">{t('settleConfirmBody')}</p>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? t('settling') : t('settleSubmit')}
        </button>
        <button
          onClick={handleClose}
          disabled={isPending}
          className="h-8 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
        >
          {tCommon('actions.cancel')}
        </button>
      </div>
    </div>
  );
}
