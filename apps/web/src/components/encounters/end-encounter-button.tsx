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
}

export function EndEncounterButton({
  encounterId,
  alreadyEnded,
  disabled = false,
  disabledReason,
  hasDiagnosis = true,
}: EndEncounterButtonProps) {
  const t = useTranslations('encounter');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const { mutate, isPending } = useUpdateEncounter();

  if (alreadyEnded) {
    return (
      <span className="text-xs text-muted-foreground">{t('close.alreadyEnded')}</span>
    );
  }

  if (disabled) {
    return (
      <div className="flex flex-col gap-1">
        <button
          disabled
          className="inline-flex h-9 items-center rounded-md border border-destructive/40 px-4 text-sm font-medium text-destructive opacity-60"
        >
          {t('actions.closeVisit')}
        </button>
        {disabledReason && <p className="text-xs text-muted-foreground">{disabledReason}</p>}
      </div>
    );
  }

  function handleConfirm() {
    setError('');
    mutate(
      { id: encounterId, payload: { endedAt: new Date().toISOString() } },
      {
        onSuccess: () => router.push('/dashboard/doctor/queue'),
        onError: (e) => {
          setConfirming(false);
          setError(e instanceof Error ? e.message : t('close.failed'));
        },
      },
    );
  }

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
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-destructive px-3 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? t('actions.closing') : t('actions.closeVisit')}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={isPending}
            className="h-8 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
          >
            {tCommon('actions.cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex h-9 items-center rounded-md border border-destructive/40 px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
      >
        {t('actions.closeVisit')}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
