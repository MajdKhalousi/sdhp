'use client';

import { useTranslations } from 'next-intl';
import type { MedicalFileCategory, TimelineEvent } from '@/types/timeline';
import { formatTime } from './format-time';

type Props = { event: Extract<TimelineEvent, { type: 'MEDICAL_FILE' }> };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MedicalFileCard({ event }: Props) {
  const t = useTranslations('timeline');
  const { data } = event;
  const uploader = `${data.uploadedBy.firstName} ${data.uploadedBy.lastName}`;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm border-s-4 border-s-slate-400">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-400">
          {t('cards.file')}
        </span>
        <span className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</span>
      </div>

      <p className="font-medium text-sm text-foreground">
        {t(`fileCategories.${data.category}` as Parameters<typeof t>[0])}
      </p>

      <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
        {data.mimeType} · {formatBytes(data.sizeBytes)}
      </p>

      {data.description && (
        <p className="mt-1 text-xs text-muted-foreground">{data.description}</p>
      )}

      <p className="mt-1.5 text-xs text-muted-foreground">
        {t('cards.uploadedBy', { uploader })}
      </p>
    </div>
  );
}
