'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useCancelEncounter } from '@/hooks/use-encounters';
import { useToast } from '@/hooks/use-toast';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-messages';

interface CancelEncounterButtonProps {
  encounterId: string;
  disabled?: boolean;
  disabledReason?: string;
}

export function CancelEncounterButton({
  encounterId,
  disabled = false,
  disabledReason,
}: CancelEncounterButtonProps) {
  const t = useTranslations('encounter');
  const tRoot = useTranslations();
  const router = useRouter();
  const { toast } = useToast();
  const { mutate, isPending } = useCancelEncounter();

  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  function openConfirm() {
    setError('');
    setReason('');
    setConfirming(true);
  }

  function closeConfirm() {
    if (isPending) return;
    setConfirming(false);
  }

  function handleConfirm() {
    if (isPending) return;
    setError('');
    const trimmed = reason.trim();
    mutate(
      { id: encounterId, reason: trimmed || undefined },
      {
        onSuccess: () => {
          toast({ title: t('cancel.success'), variant: 'success' });
          router.push('/dashboard/doctor/queue');
        },
        onError: (e) => {
          setError(getFriendlyApiErrorMessage(e, tRoot));
        },
      },
    );
  }

  if (confirming) {
    return (
      <>
        <div
          className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60"
          onClick={isPending ? undefined : closeConfirm}
        />
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="w-full max-w-sm overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            <div className="px-5 py-4">
              <p className="text-base font-semibold text-foreground">{t('cancel.title')}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{t('cancel.description')}</p>

              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-foreground">
                  {t('cancel.reasonLabel')}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder={t('cancel.reasonPlaceholder')}
                  disabled={isPending}
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-4">
              <button
                onClick={closeConfirm}
                disabled={isPending}
                className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
              >
                {t('cancel.dismiss')}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="inline-flex h-9 items-center rounded-md border border-destructive/40 bg-destructive/10 px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t('cancel.confirm')}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (disabled) {
    return (
      <div className="flex flex-col gap-1">
        <button
          disabled
          className="inline-flex h-9 items-center rounded-md border border-input px-4 text-sm font-medium text-muted-foreground opacity-60"
        >
          {t('actions.cancelVisit')}
        </button>
        {disabledReason && <p className="text-xs text-muted-foreground">{disabledReason}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={openConfirm}
        className="inline-flex h-9 items-center rounded-md border border-input px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {t('actions.cancelVisit')}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
