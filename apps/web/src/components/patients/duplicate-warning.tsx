'use client';

import { AlertTriangle } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { DuplicateCandidate, DuplicateReason } from '@/hooks/use-patient';

interface Props {
  matches: DuplicateCandidate[];
  onCreateAnyway: () => void;
  onCancel: () => void;
  isCreating: boolean;
}

const REASON_BADGE_CLASS = 'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium';
const REASON_COLORS: Record<DuplicateReason, string> = {
  nationalId: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  phone:      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  name:       'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  nameAndDob: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

export function DuplicateWarning({ matches, onCreateAnyway, onCancel, isCreating }: Props) {
  const t = useTranslations('patient.duplicate');
  const tForm = useTranslations('patient.form');
  const locale = useLocale();

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700/50 dark:bg-amber-900/10">
      <div className="mb-3 flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">{t('heading')}</p>
          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">{t('description')}</p>
        </div>
      </div>

      <div className="mb-4 space-y-2">
        {matches.map((c) => {
          const displayName =
            locale === 'ar' && c.firstNameAr
              ? `${c.firstNameAr}${c.lastNameAr ? ` ${c.lastNameAr}` : ''}`
              : `${c.firstName} ${c.lastName}`;

          return (
            <div
              key={c.id}
              className="rounded-lg border border-amber-200 bg-white px-3 py-2.5 dark:border-amber-800/40 dark:bg-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground">{displayName}</span>
                    {c.isArchived && (
                      <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {t('archivedBadge')}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span dir="ltr" className="font-mono">{c.mrn}</span>
                    {c.phone && <span dir="ltr">{c.phone}</span>}
                    {c.dateOfBirth && <span dir="ltr">{c.dateOfBirth}</span>}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {c.reasons.map((r) => (
                      <span key={r} className={`${REASON_BADGE_CLASS} ${REASON_COLORS[r]}`}>
                        {t(`reasons.${r}`)}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  href={`/dashboard/patients/${c.id}`}
                  className="shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent"
                >
                  {t('actions.viewPatient')}
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
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
          {tForm('actions.cancel')}
        </button>
      </div>
    </div>
  );
}
