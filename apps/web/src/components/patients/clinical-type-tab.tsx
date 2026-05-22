'use client';

import { FolderOpen } from 'lucide-react';
import { usePatientTimeline } from '@/hooks/use-patient-timeline';
import { TimelineEventCard } from './timeline/timeline-event-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { TimelineEventType } from '@/types/timeline';

interface Props {
  patientId: string;
  type: TimelineEventType;
  emptyMessage: string;
}

export function ClinicalTypeTab({ patientId, type, emptyMessage }: Props) {
  const { data, isLoading, isError, error, refetch } = usePatientTimeline(patientId, {
    types: [type],
    limit: 50,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
        <p className="text-sm font-medium text-destructive">Failed to load records</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          {error instanceof Error ? error.message : 'An error occurred.'}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-1 h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
        >
          Try again
        </button>
      </div>
    );
  }

  const events = data?.data ?? [];

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <FolderOpen className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <TimelineEventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
