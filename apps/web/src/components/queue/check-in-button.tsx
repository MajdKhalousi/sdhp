'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useCheckIn } from '@/hooks/use-queue';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-messages';

interface CheckInButtonProps {
  appointmentId: string;
  onSuccess?: () => void;
}

export function CheckInButton({ appointmentId, onSuccess }: CheckInButtonProps) {
  const t = useTranslations('queue.checkIn');
  const tRoot = useTranslations();
  const [error, setError] = useState('');
  const [isDuplicate, setIsDuplicate] = useState(false);
  const { mutate, isPending } = useCheckIn();

  function handleCheckIn() {
    setError('');
    setIsDuplicate(false);
    mutate(
      { appointmentId },
      {
        onSuccess: () => onSuccess?.(),
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
      <button
        onClick={handleCheckIn}
        disabled={isPending}
        className="h-7 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? t('checkingIn') : t('trigger')}
      </button>
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
