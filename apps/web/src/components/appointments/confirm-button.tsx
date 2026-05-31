'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useUpdateAppointment } from '@/hooks/use-appointments';

export function ConfirmButton({ appointmentId }: { appointmentId: string }) {
  const t = useTranslations('appointment.confirm');
  const [error, setError] = useState('');
  const { mutate, isPending } = useUpdateAppointment();

  function handleConfirm() {
    setError('');
    mutate(
      { id: appointmentId, dto: { status: 'CONFIRMED' } },
      { onError: (e) => setError(e instanceof Error ? e.message : t('error')) },
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleConfirm}
        disabled={isPending}
        className="h-7 rounded-md border border-primary/40 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? t('confirming') : t('trigger')}
      </button>
      {error && <p className="max-w-[16rem] text-end text-xs text-destructive">{error}</p>}
    </div>
  );
}
