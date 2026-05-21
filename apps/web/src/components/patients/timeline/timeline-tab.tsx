'use client';

import { useState, useCallback } from 'react';
import { usePatientTimeline } from '@/hooks/use-patient-timeline';
import { Skeleton } from '@/components/ui/skeleton';
import { TimelineFilters } from './timeline-filters';
import { TimelineEventList } from './timeline-event-list';
import type { TimelineEventType } from '@/types/timeline';

const LIMIT = 20;

interface Props {
  patientId: string;
}

function TimelineSkeleton() {
  return (
    <div className="space-y-8">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function TimelineTab({ patientId }: Props) {
  const [selectedTypes, setSelectedTypes] = useState<TimelineEventType[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const handleTypesChange = useCallback((types: TimelineEventType[]) => {
    setSelectedTypes(types);
    setPage(1);
  }, []);

  const handleFromChange = useCallback((value: string) => {
    setFrom(value);
    setPage(1);
  }, []);

  const handleToChange = useCallback((value: string) => {
    setTo(value);
    setPage(1);
  }, []);

  const { data, isLoading, isError, error } = usePatientTimeline(patientId, {
    types: selectedTypes,
    from: from || undefined,
    to: to || undefined,
    page,
    limit: LIMIT,
  });

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  return (
    <div className="space-y-4">
      <TimelineFilters
        selectedTypes={selectedTypes}
        onTypesChange={handleTypesChange}
        from={from}
        to={to}
        onFromChange={handleFromChange}
        onToChange={handleToChange}
      />

      {isLoading && <TimelineSkeleton />}

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {(error as Error)?.message || 'Failed to load timeline.'}
        </div>
      )}

      {data && data.data.length === 0 && (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
          No events found for the selected filters.
        </div>
      )}

      {data && data.data.length > 0 && (
        <>
          <TimelineEventList events={data.data} />

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
