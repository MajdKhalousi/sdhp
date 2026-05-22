import { Badge } from '@/components/ui/badge';
import type { TimelineEvent } from '@/types/timeline';
import { formatTime } from './format-time';

type Props = { event: Extract<TimelineEvent, { type: 'ENCOUNTER' }> };

function encounterDuration(start: string, end: string | null): string {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m`;
}

export function EncounterCard({ event }: Props) {
  const { data } = event;
  const doctor = `Dr. ${data.doctor.firstName} ${data.doctor.lastName}`;
  const isActive = !data.endedAt;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm border-s-4 border-s-blue-400">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            Encounter
          </span>
          {isActive && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              In Progress
            </span>
          )}
        </div>
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
        <span className="opacity-70">
          · {isActive ? `ongoing · ${encounterDuration(data.startedAt, null)}` : encounterDuration(data.startedAt, data.endedAt)}
        </span>
      </div>

      {(data.diagnosisCode || data.hasDiagnosis) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {data.diagnosisCode && (
            <span className="font-mono text-xs text-foreground" dir="ltr">{data.diagnosisCode}</span>
          )}
          {data.hasDiagnosis && !data.diagnosisCode && (
            <Badge variant="outline" className="text-xs">Diagnosis on record</Badge>
          )}
        </div>
      )}
    </div>
  );
}
