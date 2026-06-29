'use client';

import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type MissingSectionKey = 'family' | 'additional' | 'medical' | 'emergency';

const SECTION_LABEL_KEYS: Record<MissingSectionKey, string> = {
  family: 'sections.family',
  additional: 'sections.additional',
  medical: 'sections.medical',
  emergency: 'sections.emergency',
};

interface Props {
  sections: MissingSectionKey[];
  onCreateAnyway: () => void;
  onCancel: () => void;
  isCreating: boolean;
}

export function MissingInfoWarning({ sections, onCreateAnyway, onCancel, isCreating }: Props) {
  const t = useTranslations('patient.missingInfo');
  const tForm = useTranslations('patient.form');

  if (sections.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700/50 dark:bg-amber-900/10">
      <div className="mb-3 flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">{t('heading')}</p>
          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">{t('description')}</p>
        </div>
      </div>

      <ul className="mb-3 ms-1 list-inside list-disc space-y-0.5 text-xs text-amber-800 dark:text-amber-300">
        {sections.map((key) => (
          <li key={key}>{tForm(SECTION_LABEL_KEYS[key] as Parameters<typeof tForm>[0])}</li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onCreateAnyway}
          disabled={isCreating}
          className="inline-flex h-8 items-center rounded-md bg-amber-600 px-3 text-xs font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-700 dark:hover:bg-amber-600"
        >
          {t('actions.createAnyway')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isCreating}
          className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
        >
          {t('actions.complete')}
        </button>
      </div>
    </div>
  );
}
