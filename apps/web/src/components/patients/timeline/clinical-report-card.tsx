'use client';

import { useTranslations } from 'next-intl';
import type { ClinicalReportEventData, TimelineEvent } from '@/types/timeline';
import { formatTime } from './format-time';

type Props = { event: Extract<TimelineEvent, { type: 'CLINICAL_REPORT_CREATED' }> };

export function ClinicalReportCard({ event }: Props) {
  const t = useTranslations('timeline');
  const { data } = event;
  const isDraft = data.status === 'DRAFT';
  const author = data.createdBy
    ? `${data.createdBy.firstName} ${data.createdBy.lastName}`
    : null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm border-s-4 border-s-indigo-400">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
            {t('cards.clinicalReport')}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              isDraft
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                : 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400'
            }`}
          >
            {isDraft ? t('clinicalReport.draft') : t('clinicalReport.finalized')}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</span>
      </div>

      <p className="font-medium text-sm text-foreground" dir="auto">
        {data.title}
      </p>

      {author && (
        <p className="mt-1 text-xs text-muted-foreground">
          {t('clinicalReport.createdBy', { author })}
        </p>
      )}
    </div>
  );
}
