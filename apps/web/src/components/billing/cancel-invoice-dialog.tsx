'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCancelInvoice } from '@/hooks/use-invoices';

interface CancelInvoiceDialogProps {
  invoiceId: string;
  onSuccess?: () => void;
}

export function CancelInvoiceDialog({ invoiceId, onSuccess }: CancelInvoiceDialogProps) {
  const t = useTranslations('invoice.actions');
  const tCommon = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const { mutate, isPending } = useCancelInvoice();

  function handleOpen() {
    setOpen(true);
    setReason('');
    setError('');
  }

  function handleClose() {
    if (isPending) return;
    setOpen(false);
    setReason('');
    setError('');
  }

  function handleConfirm() {
    setError('');
    mutate(
      { id: invoiceId, dto: { ...(reason.trim() ? { cancelReason: reason.trim() } : {}) } },
      {
        onSuccess: () => {
          setOpen(false);
          onSuccess?.();
        },
        onError: (e) => {
          setError(e instanceof Error ? e.message : t('cancelling'));
        },
      },
    );
  }

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="inline-flex h-9 items-center rounded-md border border-destructive/40 px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
      >
        {t('cancel')}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
      <p className="text-sm font-medium text-foreground">{t('cancelConfirm')}</p>

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">
          {t('cancelReason')}
        </label>
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={isPending}
          placeholder={t('cancelReasonPlaceholder')}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-destructive px-3 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? t('cancelling') : t('cancelSubmit')}
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
