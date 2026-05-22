'use client';

import { useState } from 'react';
import { useUpdateQueueEntry } from '@/hooks/use-queue';

export function SkipQueueButton({ entryId }: { entryId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const { mutate, isPending } = useUpdateQueueEntry();

  function handleConfirm() {
    setError('');
    mutate(
      { id: entryId, dto: { status: 'SKIPPED' } },
      {
        onSuccess: () => setConfirming(false),
        onError: (e) => setError(e instanceof Error ? e.message : 'Failed to skip'),
      },
    );
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1">
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="h-6 rounded bg-destructive px-2 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-60"
          >
            {isPending ? '…' : 'Skip'}
          </button>
          <button
            onClick={() => { setConfirming(false); setError(''); }}
            disabled={isPending}
            className="h-6 rounded border px-2 text-xs transition-colors hover:bg-accent disabled:opacity-60"
          >
            No
          </button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="h-6 rounded border px-2 text-xs text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
    >
      Skip
    </button>
  );
}
