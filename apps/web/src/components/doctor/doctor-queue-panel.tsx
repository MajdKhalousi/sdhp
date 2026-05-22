'use client';

import { RefreshCw, Stethoscope } from 'lucide-react';
import { useQueue } from '@/hooks/use-queue';
import { QueueStatusBadge } from '@/components/queue/queue-status-badge';
import { StartEncounterButton } from './start-encounter-button';
import { Skeleton } from '@/components/ui/skeleton';

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatScheduled(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function relativeWait(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function DoctorQueuePanel() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQueue({
    status: ['WAITING', 'CALLED'],
    date: todayDate(),
    limit: 50,
  });

  const header = (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-sm font-semibold">My Queue — Today</h2>
        <p className="text-xs text-muted-foreground">Auto-refreshes every 30s</p>
      </div>
      <button
        onClick={() => refetch()}
        disabled={isFetching}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent disabled:opacity-40"
        aria-label="Refresh queue"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {header}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        {header}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
          <p className="text-sm font-medium text-destructive">Failed to load queue</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            {error instanceof Error ? error.message : 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-1 h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="space-y-4">
        {header}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Stethoscope className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">No patients waiting</p>
          <p className="text-xs text-muted-foreground">Your queue is clear for today.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}
      <div className="space-y-3">
        {data.data.map((entry) => {
          const { appointment } = entry;
          const { patient, doctor } = appointment;
          return (
            <div key={entry.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base font-bold text-primary">
                  #{entry.ticketNumber}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {patient.firstName} {patient.lastName}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>Scheduled {formatScheduled(appointment.scheduledAt)}</span>
                    <span>Waited {relativeWait(entry.createdAt)}</span>
                  </div>
                  <div className="mt-1.5">
                    <QueueStatusBadge status={entry.status} />
                  </div>
                </div>

                <StartEncounterButton
                  patientId={patient.id}
                  doctorId={doctor.id}
                  appointmentId={appointment.id}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {data.total} patient{data.total !== 1 ? 's' : ''} waiting
      </p>
    </div>
  );
}
