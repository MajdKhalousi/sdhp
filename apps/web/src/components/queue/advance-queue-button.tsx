'use client';

import { useState } from 'react';
import { useUpdateQueueEntry } from '@/hooks/use-queue';
import type { QueueStatus } from '@/types/queue';

interface Config { next: QueueStatus; label: string; className: string }

const ADVANCE: Partial<Record<QueueStatus, Config>> = {
  WAITING: {
    next: 'CALLED',
    label: 'Call In',
    className: 'border border-amber-400 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30',
  },
  CALLED: {
    next: 'IN_PROGRESS',
    label: 'Begin',
    className: 'bg-primary text-primary-foreground hover:bg-primary/90',
  },
};

export function AdvanceQueueButton({ entryId, status }: { entryId: string; status: QueueStatus }) {
  const cfg = ADVANCE[status];
  const [error, setError] = useState('');
  const { mutate, isPending } = useUpdateQueueEntry();

  if (!cfg) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => {
          setError('');
          mutate(
            { id: entryId, dto: { status: cfg.next } },
            { onError: (e) => setError(e instanceof Error ? e.message : 'Failed') },
          );
        }}
        disabled={isPending}
        className={`h-6 rounded px-2 text-xs font-medium transition-colors disabled:opacity-60 ${cfg.className}`}
      >
        {isPending ? '…' : cfg.label}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
