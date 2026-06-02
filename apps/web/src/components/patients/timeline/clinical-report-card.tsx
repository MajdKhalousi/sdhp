'use client';

import { useTranslations, useLocale } from 'next-intl';
import type { TimelineEvent } from '@/types/timeline';
import { useDownloadReportPdf } from '@/hooks/use-clinical-reports';
import { formatTime } from './format-time';

type Props = { event: Extract<TimelineEvent, { type: 'CLINICAL_REPORT_CREATED' }> };

export function ClinicalReportCard({ event }: Props) {
  const t = useTranslations('timeline');
  const locale = useLocale();
  const displayLocale = locale === 'ar' ? 'ar-u-nu-latn' : 'en-US';
  const { data } = event;
  const isDraft = data.status === 'DRAFT';
  const author = data.createdBy
    ? `${data.createdBy.firstName} ${data.createdBy.lastName}`
    : null;
  const { reportId } = data;

  const { download, downloadingId } = useDownloadReportPdf();

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
        <span className="text-xs text-muted-foreground">{formatTime(event.timestamp, displayLocale)}</span>
      </div>

      <p className="font-medium text-sm text-foreground" dir="auto">
        {data.title}
      </p>

      {author && (
        <p className="mt-1 text-xs text-muted-foreground">
          {t('clinicalReport.createdBy', { author })}
        </p>
      )}

      {/* Download PDF — finalized reports only */}
      {!isDraft && reportId && (
        <div className="mt-3 border-t border-border pt-2.5">
          <button
            onClick={() => download(reportId)}
            disabled={downloadingId === reportId}
            className="text-xs font-medium text-primary hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {downloadingId === reportId
              ? t('cards.downloading')
              : t('cards.downloadReport')}
          </button>
        </div>
      )}
    </div>
  );
}
