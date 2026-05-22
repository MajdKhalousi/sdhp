'use client';

import { useState } from 'react';
import { useUpdateAppointment } from '@/hooks/use-appointments';

export function NoShowButton({ appointmentId }: { appointmentId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const { mutate, isPending } = useUpdateAppointment();

  function handleConfirm() {
    setError('');
    mutate(
      { id: appointmentId, dto: { status: 'NO_SHOW' } },
      {
        onSuccess: () => setConfirming(false),
        onError: (e) => setError(e instanceof Error ? e.message : 'Failed to mark no-show'),
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
            {isPending ? '…' : 'Confirm'}
          </button>
          <button
            onClick={() => { setConfirming(false); setError(''); }}
            disabled={isPending}
            className="h-6 rounded border px-2 text-xs transition-colors hover:bg-accent disabled:opacity-60"
          >
            Cancel
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
      No-show
    </button>
  );
}
