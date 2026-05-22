import type { TimelineEvent } from '@/types/timeline';
import { formatTime } from './format-time';

type Props = { event: Extract<TimelineEvent, { type: 'PRESCRIPTION' }> };

export function PrescriptionCard({ event }: Props) {
  const { data } = event;
  const details = [data.dosage, data.frequency, data.duration].filter(Boolean).join(' · ');

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm border-s-4 border-s-green-400">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Prescription
        </span>
        <span className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</span>
      </div>

      <p className="font-medium text-sm text-foreground">{data.medication}</p>

      {details && (
        <p className="mt-1 text-xs text-muted-foreground" dir="ltr">{details}</p>
      )}
    </div>
  );
}
