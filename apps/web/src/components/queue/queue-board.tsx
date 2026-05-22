'use client';

import { useState } from 'react';
import { RefreshCw, Inbox } from 'lucide-react';
import { useQueue } from '@/hooks/use-queue';
import { useDoctorsList } from '@/hooks/use-appointments';
import { QueueTicket } from './queue-ticket';
import { AdvanceQueueButton } from './advance-queue-button';
import { SkipQueueButton } from './skip-queue-button';
import { Skeleton } from '@/components/ui/skeleton';
import type { QueueStatus } from '@/types/queue';

const SKIPPABLE: QueueStatus[] = ['WAITING', 'CALLED'];

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

  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useQueue({
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
        {dataUpdatedAt > 0 && !isFetching && (
          <span className="text-xs text-muted-foreground">
            Updated {new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </span>
        )}
        {isFetching && !isLoading && (
          <span className="text-xs text-muted-foreground">Refreshing…</span>
        )}
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

  // Full error — no cached data to fall back on
  if (isError && !data) {
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

  // Stale-data banner — background refresh failed but previous data still shown
  const staleErrorBanner = isError && data ? (
    <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-400">
      <span>Live refresh failed — showing cached data.</span>
      <button onClick={() => refetch()} className="ml-2 underline hover:no-underline">
        Retry
      </button>
    </div>
  ) : null;

  if (!data || data.data.length === 0) {
    return (
      <div className="space-y-4">
        {filters}
        {staleErrorBanner}
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
      {staleErrorBanner}
      <div className="space-y-3">
        {data.data.map((entry) => (
          <div key={entry.id} className="space-y-1">
            <QueueTicket entry={entry} />
            {SKIPPABLE.includes(entry.status) && (
              <div className="flex items-center justify-end gap-2 px-1">
                <AdvanceQueueButton entryId={entry.id} status={entry.status} />
                <SkipQueueButton entryId={entry.id} />
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{data.total} entries total</p>
    </div>
  );
}
