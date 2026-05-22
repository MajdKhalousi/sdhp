'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import type { BadgeProps } from '@/components/ui/badge';
import type { LabOrderStatus, TimelineEvent } from '@/types/timeline';
import { formatTime } from './format-time';

type Props = { event: Extract<TimelineEvent, { type: 'LAB_ORDER' }> };

const STATUS_VARIANT: Record<LabOrderStatus, BadgeProps['variant']> = {
  ORDERED:          'default',
  SAMPLE_COLLECTED: 'warning',
  IN_PROGRESS:      'warning',
  RESULTED:         'success',
  REVIEWED:         'success',
  CANCELLED:        'danger',
};

export function LabOrderCard({ event }: Props) {
  const t = useTranslations('timeline');
  const { data } = event;
  const doctor = `Dr. ${data.orderedBy.firstName} ${data.orderedBy.lastName}`;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm border-s-4 border-s-amber-400">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          {t('cards.labOrder')}
        </span>
        <span className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</span>
      </div>

      <p className="font-medium text-sm text-foreground">
        {data.testName}
        {data.testCode && (
          <span className="ms-1.5 font-mono text-xs text-muted-foreground" dir="ltr">({data.testCode})</span>
        )}
      </p>

      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <Badge variant={STATUS_VARIANT[data.status]}>
          {t(`labOrderStatus.${data.status}` as Parameters<typeof t>[0])}
        </Badge>
        {data.priority && (
          <span className="text-xs text-muted-foreground">· {data.priority}</span>
        )}
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">{doctor}</p>
    </div>
  );
}
