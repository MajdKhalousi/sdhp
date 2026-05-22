import { QueueStatusBadge } from './queue-status-badge';
import type { QueueEntry } from '@/types/queue';

function relativeTime(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

export function QueueTicket({ entry }: { entry: QueueEntry }) {
  const { ticketNumber, status, createdAt, appointment } = entry;
  const { patient, doctor } = appointment;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
        #{ticketNumber}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {patient.firstName} {patient.lastName}
          <span className="ml-1.5 font-mono text-xs font-normal text-muted-foreground">
            {patient.mrn}
          </span>
        </p>
        <p className="truncate text-xs text-muted-foreground">
          Dr. {doctor.user.firstName} {doctor.user.lastName}
          {doctor.specialization ? ` · ${doctor.specialization}` : ''}
        </p>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-xs text-muted-foreground">Wait</p>
        <p className="text-sm">{relativeTime(createdAt)}</p>
      </div>

      <QueueStatusBadge status={status} />
    </div>
  );
}
