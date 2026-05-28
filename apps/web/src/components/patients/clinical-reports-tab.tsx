'use client';

import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import {
  usePatientClinicalReports,
  useDownloadReportPdf,
} from '@/hooks/use-clinical-reports';
import { Skeleton } from '@/components/ui/skeleton';
import type { ClinicalReport } from '@/hooks/use-clinical-reports';

interface Props {
  patientId: string;
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function ReportCard({
  report,
  expanded,
  onToggle,
}: {
  report: ClinicalReport;
  expanded: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations('patient');
  const locale = useLocale();
  const displayLocale = locale === 'ar' ? 'ar-SY' : 'en-US';
  const isDraft = report.status === 'DRAFT';

  const { download: downloadPdf, downloadingId } = useDownloadReportPdf();
  const [downloadError, setDownloadError] = useState('');

  async function handleDownload() {
    setDownloadError('');
    try {
      await downloadPdf(report.id);
    } catch {
      setDownloadError(t('reports.downloadFailed'));
    }
  }

  const author = report.createdBy
    ? `${report.createdBy.firstName} ${report.createdBy.lastName}`
    : null;

  return (
    <div
      className={`rounded-lg border bg-background border-s-4 ${
        isDraft ? 'border-s-amber-400' : 'border-s-green-500'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  isDraft
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400'
                }`}
              >
                {isDraft ? t('reports.statusDraft') : t('reports.statusFinalized')}
              </span>
            </div>

            <p className="text-sm font-semibold text-foreground" dir="auto">
              {report.title}
            </p>

            <p className="mt-0.5 text-xs text-muted-foreground">
              {author && `${t('reports.createdBy')} ${author} · `}
              {t('reports.createdAt')} {formatDate(report.createdAt, displayLocale)}
              {report.updatedAt !== report.createdAt &&
                ` · ${t('reports.updatedAt')} ${formatDate(report.updatedAt, displayLocale)}`}
            </p>

            {report.encounter && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('reports.encounter')}: {formatDate(report.encounter.startedAt, displayLocale)}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {!isDraft && (
              <button
                onClick={handleDownload}
                disabled={downloadingId === report.id}
                className="inline-flex h-7 items-center rounded-md border border-input bg-background px-2.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
              >
                {downloadingId === report.id
                  ? t('reports.downloading')
                  : t('reports.downloadPdf')}
              </button>
            )}
            <button
              onClick={onToggle}
              className="inline-flex h-7 items-center rounded-md border border-input bg-background px-2.5 text-xs font-medium transition-colors hover:bg-accent"
            >
              {expanded ? t('reports.hideContent') : t('reports.viewContent')}
            </button>
          </div>
        </div>

        {downloadError && (
          <p className="mt-1 text-xs text-destructive">{downloadError}</p>
        )}

        {!expanded && (
          <p className="mt-2 line-clamp-3 text-xs text-muted-foreground" dir="auto">
            {report.content}
          </p>
        )}

        {expanded && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="whitespace-pre-wrap text-sm text-foreground" dir="auto">
              {report.content}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ClinicalReportsTab({ patientId }: Props) {
  const t = useTranslations('patient');
  const { data: reports = [], isLoading, isError, error } = usePatientClinicalReports(patientId);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : t('reports.errorLoad')}
      </p>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm font-medium text-foreground">{t('reports.empty')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          expanded={expandedIds.has(report.id)}
          onToggle={() => toggleExpand(report.id)}
        />
      ))}
    </div>
  );
}
