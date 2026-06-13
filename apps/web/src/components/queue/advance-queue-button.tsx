'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useUpdateQueueEntry } from '@/hooks/use-queue';
import type { QueueStatus } from '@/types/queue';

interface Config { next: QueueStatus; className: string }

const ADVANCE: Partial<Record<QueueStatus, Config>> = {
  WAITING: {
    next: 'CALLED',
    className: 'border border-amber-400 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30',
  },
  CALLED: {
    next: 'IN_PROGRESS',
    className: 'bg-primary text-primary-foreground hover:bg-primary/90',
  },
};

export function AdvanceQueueButton({
  entryId,
  status,
  onSuccess,
}: {
  entryId: string;
  status: QueueStatus;
  onSuccess?: () => void;
}) {
  const t = useTranslations('queue.advance');
  const cfg = ADVANCE[status];
  const [error, setError] = useState('');
  const { mutate, isPending } = useUpdateQueueEntry();

  if (!cfg) return null;

  const label = status === 'WAITING' ? t('callIn') : t('begin');

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => {
          setError('');
          mutate(
            { id: entryId, dto: { status: cfg.next } },
            {
              onSuccess: () => onSuccess?.(),
              onError: (e) => setError(e instanceof Error ? e.message : 'Failed'),
            },
          );
        }}
        disabled={isPending}
        className={`h-6 rounded px-2 text-xs font-medium transition-colors disabled:opacity-60 ${cfg.className}`}
      >
        {isPending ? '…' : label}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
