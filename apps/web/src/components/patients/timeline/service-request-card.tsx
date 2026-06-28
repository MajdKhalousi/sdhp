'use client';

import { useTranslations } from 'next-intl';
import type { TimelineEvent } from '@/types/timeline';
import { formatTime } from './format-time';

type RequestedProps = { event: Extract<TimelineEvent, { type: 'SERVICE_REQUESTED' }> };
type ExecutedProps = { event: Extract<TimelineEvent, { type: 'SERVICE_EXECUTED' }> };
type CancelledProps = { event: Extract<TimelineEvent, { type: 'SERVICE_CANCELLED' }> };

export function ServiceRequestedCard({ event }: RequestedProps) {
  const t = useTranslations('timeline.cards');
  const { data } = event;
  const requestedByName = `${data.requestedBy.firstName} ${data.requestedBy.lastName}`;
  const doctorName = data.doctor ? `${data.doctor.firstName} ${data.doctor.lastName}` : null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm border-s-4 border-s-indigo-400">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
          {t('serviceRequested')}
        </span>
        <span className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</span>
      </div>

      <p className="font-medium text-sm text-foreground">{data.requestedServiceName}</p>

      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        <p>{t('requestedBy', { name: requestedByName })}</p>
        {doctorName && <p>{t('doctor', { name: doctorName })}</p>}
        {data.quantity > 1 && <p>{t('quantity', { count: data.quantity })}</p>}
        {data.notes && <p>{t('serviceNotes', { notes: data.notes })}</p>}
      </div>
    </div>
  );
}

export function ServiceExecutedCard({ event }: ExecutedProps) {
  const t = useTranslations('timeline.cards');
  const { data } = event;
  const executedByName = data.executedBy ? `${data.executedBy.firstName} ${data.executedBy.lastName}` : null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm border-s-4 border-s-green-400">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
          {t('serviceExecuted')}
        </span>
        <span className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</span>
      </div>

      <p className="font-medium text-sm text-foreground">{data.requestedServiceName}</p>

      {executedByName && (
        <p className="mt-1 text-xs text-muted-foreground">{t('executedBy', { name: executedByName })}</p>
      )}
    </div>
  );
}

export function ServiceCancelledCard({ event }: CancelledProps) {
  const t = useTranslations('timeline.cards');
  const { data } = event;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm border-s-4 border-s-destructive/60">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
          {t('serviceCancelled')}
        </span>
        <span className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</span>
      </div>

      <p className="font-medium text-sm text-foreground">{data.requestedServiceName}</p>

      {data.cancelReason && (
        <p className="mt-1 text-xs text-destructive">{t('cancelReason', { reason: data.cancelReason })}</p>
      )}
    </div>
  );
}
