'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useUpdateEncounter } from '@/hooks/use-encounters';

interface EndEncounterButtonProps {
  encounterId: string;
  alreadyEnded: boolean;
  disabled?: boolean;
  disabledReason?: string;
  hasDiagnosis?: boolean;
  confirmOpen?: boolean;
  onConfirmClose?: () => void;
}

export function EndEncounterButton({
  encounterId,
  alreadyEnded,
  disabled = false,
  disabledReason,
  hasDiagnosis = true,
  confirmOpen,
  onConfirmClose,
}: EndEncounterButtonProps) {
  const t = useTranslations('encounter');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [internalConfirming, setInternalConfirming] = useState(false);
  const confirming = !!confirmOpen || internalConfirming;
  const [error, setError] = useState('');
  const { mutate, isPending } = useUpdateEncounter();

  function handleConfirm() {
    setError('');
    mutate(
      { id: encounterId, payload: { endedAt: new Date().toISOString() } },
      {
        onSuccess: () => router.push('/dashboard/doctor/queue'),
        onError: (e) => {
          setInternalConfirming(false);
          onConfirmClose?.();
          setError(e instanceof Error ? e.message : t('close.failed'));
        },
      },
    );
  }

  function handleCancelConfirm() {
    setInternalConfirming(false);
    onConfirmClose?.();
  }

  if (alreadyEnded) {
    return (
      <span className="text-xs text-muted-foreground">{t('close.alreadyEnded')}</span>
    );
  }

  // confirming check is before disabled so that Save & Complete can reach this
  // state immediately after save succeeds (at which point disabled becomes false)
  if (confirming) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground">
          {t('close.confirm')}
        </p>
        {!hasDiagnosis && (
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
            {t('close.noDiagnosisWarning')}
          </p>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex items-center gap-2">
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-green-600 px-3 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? t('actions.closing') : t('actions.closeVisit')}
          </button>
          <button
            onClick={handleCancelConfirm}
            disabled={isPending}
            className="h-8 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
          >
            {tCommon('actions.cancel')}
          </button>
        </div>
      </div>
    );
  }

  if (disabled) {
    return (
      <div className="flex flex-col gap-1">
        <button
          disabled
          className="inline-flex h-9 items-center rounded-md border border-green-600/40 px-4 text-sm font-medium text-green-700 opacity-60 dark:text-green-400"
        >
          {t('actions.closeVisit')}
        </button>
        {disabledReason && <p className="text-xs text-muted-foreground">{disabledReason}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => setInternalConfirming(true)}
        className="inline-flex h-9 items-center rounded-md border border-green-600/40 px-4 text-sm font-medium text-green-700 transition-colors hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30"
      >
        {t('actions.closeVisit')}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
