import Link from 'next/link';
import { QueueStatusBadge } from './queue-status-badge';
import type { QueueEntry, QueueStatus } from '@/types/queue';

function relativeTime(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

const STATUS_LEFT: Record<QueueStatus, string> = {
  WAITING:     'border-l-4 border-l-border',
  CALLED:      'border-l-4 border-l-amber-400',
  IN_PROGRESS: 'border-l-4 border-l-primary',
  DONE:        'border-l-4 border-l-green-400',
  SKIPPED:     'border-l-4 border-l-muted-foreground/30',
};

export function QueueTicket({ entry }: { entry: QueueEntry }) {
  const { ticketNumber, status, createdAt, calledAt, appointment } = entry;
  const { patient, doctor } = appointment;

  const isDim = status === 'DONE' || status === 'SKIPPED';

  return (
    <div
      className={`flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-opacity ${STATUS_LEFT[status]} ${isDim ? 'opacity-55' : ''}`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
        #{ticketNumber}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          <Link
            href={`/dashboard/patients/${patient.id}`}
            className="hover:underline"
          >
            {patient.firstName} {patient.lastName}
          </Link>
          <span className="ml-1.5 font-mono text-xs font-normal text-muted-foreground">
            {patient.mrn}
          </span>
        </p>
        <p className="truncate text-xs text-muted-foreground">
          Dr. {doctor.user.firstName} {doctor.user.lastName}
          {doctor.specialization ? ` · ${doctor.specialization}` : ''}
          {patient.phone ? ` · ${patient.phone}` : ''}
        </p>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        {status === 'CALLED' && calledAt ? (
          <>
            <p className="text-xs text-muted-foreground">Called</p>
            <p className="text-sm tabular-nums">{relativeTime(calledAt)}</p>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">In queue</p>
            <p className="text-sm tabular-nums">{relativeTime(createdAt)}</p>
          </>
        )}
      </div>

      <QueueStatusBadge status={status} />
    </div>
  );
}
