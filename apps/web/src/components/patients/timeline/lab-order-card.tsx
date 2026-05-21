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

const STATUS_LABEL: Record<LabOrderStatus, string> = {
  ORDERED:          'Ordered',
  SAMPLE_COLLECTED: 'Sample Collected',
  IN_PROGRESS:      'In Progress',
  RESULTED:         'Resulted',
  REVIEWED:         'Reviewed',
  CANCELLED:        'Cancelled',
};

export function LabOrderCard({ event }: Props) {
  const { data } = event;
  const doctor = `Dr. ${data.orderedBy.firstName} ${data.orderedBy.lastName}`;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm border-l-4 border-l-amber-400">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          Lab Order
        </span>
        <span className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</span>
      </div>

      <p className="font-medium text-sm text-foreground">
        {data.testName}
        {data.testCode && (
          <span className="ml-1.5 font-mono text-xs text-muted-foreground">({data.testCode})</span>
        )}
      </p>

      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <Badge variant={STATUS_VARIANT[data.status]}>{STATUS_LABEL[data.status]}</Badge>
        {data.priority && (
          <span className="text-xs text-muted-foreground">· {data.priority}</span>
        )}
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">{doctor}</p>
    </div>
  );
}
