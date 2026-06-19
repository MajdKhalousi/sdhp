'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useUpdateAppointment } from '@/hooks/use-appointments';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-messages';

export function CancelAppointmentDialog({ appointmentId }: { appointmentId: string }) {
  const t = useTranslations('appointment.cancel');
  const tRoot = useTranslations();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const { mutate, isPending } = useUpdateAppointment();

  function handleConfirm() {
    setError('');
    mutate(
      {
        id: appointmentId,
        dto: {
          status: 'CANCELLED',
          ...(reason.trim() ? { cancelReason: reason.trim() } : {}),
        },
      },
      {
        onSuccess: () => { setOpen(false); setReason(''); },
        onError: (e) => setError(getFriendlyApiErrorMessage(e, tRoot)),
      },
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="h-7 rounded-md border px-2 text-xs text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
      >
        {t('trigger')}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <p className="text-xs font-medium text-foreground">{t('heading')}</p>
      <textarea
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        disabled={isPending}
        placeholder={t('reasonPlaceholder')}
        className="w-52 resize-none rounded-md border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        aria-label={t('reasonLabel')}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center gap-1">
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="h-6 rounded bg-destructive px-2 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-60"
        >
          {isPending ? t('cancelling') : t('confirm')}
        </button>
        <button
          onClick={() => { setOpen(false); setReason(''); setError(''); }}
          disabled={isPending}
          className="h-6 rounded border px-2 text-xs transition-colors hover:bg-accent disabled:opacity-60"
        >
          {t('back')}
        </button>
      </div>
    </div>
  );
}
