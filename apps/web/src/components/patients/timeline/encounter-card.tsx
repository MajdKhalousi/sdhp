import { Badge } from '@/components/ui/badge';
import type { TimelineEvent } from '@/types/timeline';

type Props = { event: Extract<TimelineEvent, { type: 'ENCOUNTER' }> };

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
}

export function EncounterCard({ event }: Props) {
  const { data } = event;
  const doctor = `Dr. ${data.doctor.firstName} ${data.doctor.lastName}`;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm border-l-4 border-l-blue-400">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          Encounter
        </span>
        <span className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</span>
      </div>

      <p className="font-medium text-sm text-foreground">
        {data.chiefComplaint || 'Visit'}
      </p>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span>{doctor}</span>
        {data.doctor.specialization && (
          <span className="opacity-70">· {data.doctor.specialization}</span>
        )}
      </div>

      {(data.diagnosisCode || data.hasDiagnosis) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {data.diagnosisCode && (
            <span className="font-mono text-xs text-foreground">{data.diagnosisCode}</span>
          )}
          {data.hasDiagnosis && (
            <Badge variant="outline" className="text-xs">Has Diagnosis</Badge>
          )}
        </div>
      )}
    </div>
  );
}
