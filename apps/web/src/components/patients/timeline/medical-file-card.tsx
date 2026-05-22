import type { MedicalFileCategory, TimelineEvent } from '@/types/timeline';
import { formatTime } from './format-time';

type Props = { event: Extract<TimelineEvent, { type: 'MEDICAL_FILE' }> };

const CATEGORY_LABELS: Record<MedicalFileCategory, string> = {
  LAB_RESULT:        'Lab Result',
  RADIOLOGY_IMAGE:   'Radiology Image',
  PRESCRIPTION:      'Prescription',
  REFERRAL:          'Referral',
  DISCHARGE_SUMMARY: 'Discharge Summary',
  CONSENT_FORM:      'Consent Form',
  INSURANCE:         'Insurance',
  CLINICAL_NOTE:     'Clinical Note',
  ID_DOCUMENT:       'ID Document',
  OTHER:             'Other',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MedicalFileCard({ event }: Props) {
  const { data } = event;
  const uploader = `${data.uploadedBy.firstName} ${data.uploadedBy.lastName}`;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm border-s-4 border-s-slate-400">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-400">
          File
        </span>
        <span className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</span>
      </div>

      <p className="font-medium text-sm text-foreground">{CATEGORY_LABELS[data.category]}</p>

      <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
        {data.mimeType} · {formatBytes(data.sizeBytes)}
      </p>

      {data.description && (
        <p className="mt-1 text-xs text-muted-foreground">{data.description}</p>
      )}

      <p className="mt-1.5 text-xs text-muted-foreground">Uploaded by {uploader}</p>
    </div>
  );
}
