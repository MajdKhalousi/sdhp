'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCheckIn } from '@/hooks/use-queue';

interface CheckInButtonProps {
  appointmentId: string;
  onSuccess?: () => void;
}

export function CheckInButton({ appointmentId, onSuccess }: CheckInButtonProps) {
  const t = useTranslations('queue.checkIn');
  const [error, setError] = useState('');
  const { mutate, isPending } = useCheckIn();

  function handleCheckIn() {
    setError('');
    mutate(
      { appointmentId },
      {
        onSuccess: () => onSuccess?.(),
        onError: (e) => setError(e instanceof Error ? e.message : t('error')),
      },
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleCheckIn}
        disabled={isPending}
        className="h-7 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? t('checkingIn') : t('trigger')}
      </button>
      {error && (
        <p className="max-w-[16rem] text-end text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
