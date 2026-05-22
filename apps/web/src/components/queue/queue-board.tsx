'use client';

import { useState } from 'react';
import { RefreshCw, Inbox } from 'lucide-react';
import { useQueue } from '@/hooks/use-queue';
import { useDoctorsList } from '@/hooks/use-appointments';
import { QueueTicket } from './queue-ticket';
import { Skeleton } from '@/components/ui/skeleton';
import type { QueueStatus } from '@/types/queue';

const ALL_STATUSES: { value: QueueStatus; label: string }[] = [
  { value: 'WAITING',     label: 'Waiting'     },
  { value: 'CALLED',      label: 'Called'      },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DONE',        label: 'Done'        },
  { value: 'SKIPPED',     label: 'Skipped'     },
];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function QueueBoard() {
  const [status, setStatus] = useState<QueueStatus | ''>('');
  const [todayOnly, setTodayOnly] = useState(true);
  const [doctorId, setDoctorId] = useState('');

  const date = todayOnly ? todayDate() : '';

  const { data, isLoading, isError, error, refetch, isFetching } = useQueue({
    ...(status ? { status: [status] } : {}),
    ...(date ? { date } : {}),
    ...(doctorId ? { doctorId } : {}),
    limit: 100,
  });

  const { data: doctorsData } = useDoctorsList();

  const filters = (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as QueueStatus | '')}
        className="h-8 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        {ALL_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      <select
        value={doctorId}
        onChange={(e) => setDoctorId(e.target.value)}
        className="h-8 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        aria-label="Filter by doctor"
      >
        <option value="">All doctors</option>
        {doctorsData?.data.map((d) => (
          <option key={d.id} value={d.id}>
            Dr. {d.user.firstName} {d.user.lastName}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-1.5 text-sm select-none">
        <input
          type="checkbox"
          checked={todayOnly}
          onChange={(e) => setTodayOnly(e.target.checked)}
          className="rounded border"
        />
        Today only
      </label>

      {(status || doctorId || !todayOnly) && (
        <button
          onClick={() => { setStatus(''); setDoctorId(''); setTodayOnly(true); }}
          className="h-8 rounded-md border px-3 text-xs text-muted-foreground transition-colors hover:bg-accent"
        >
          Clear filters
        </button>
      )}

      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Auto-refreshes every 30s</span>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent disabled:opacity-40"
          aria-label="Refresh now"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {filters}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        {filters}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-16 text-center">
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
        {filters}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">Queue is empty</p>
          <p className="text-xs text-muted-foreground">
            {status || doctorId || !todayOnly
              ? 'Try adjusting your filters.'
              : 'No patients checked in yet today.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filters}
      <div className="space-y-3">
        {data.data.map((entry) => (
          <QueueTicket key={entry.id} entry={entry} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{data.total} entries total</p>
    </div>
  );
}
