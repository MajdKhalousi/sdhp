'use client';

import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Props {
  onStay: () => void;
  onDiscard: () => void;
}

export function DiscardConfirm({ onStay, onDiscard }: Props) {
  const t = useTranslations('patient.unsaved');

  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 dark:border-destructive/30 dark:bg-destructive/10">
      <div className="mb-3 flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div>
          <p className="text-sm font-semibold text-destructive">{t('heading')}</p>
          <p className="mt-0.5 text-xs text-destructive/80 dark:text-destructive/70">{t('description')}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onStay}
          className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t('actions.stay')}
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="inline-flex h-8 items-center rounded-md border border-destructive/40 px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 dark:hover:bg-destructive/20"
        >
          {t('actions.discard')}
        </button>
      </div>
    </div>
  );
}
