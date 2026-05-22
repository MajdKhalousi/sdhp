import { Badge } from '@/components/ui/badge';
import type { BadgeProps } from '@/components/ui/badge';
import type { RadiologyOrderStatus, TimelineEvent } from '@/types/timeline';
import { formatTime } from './format-time';

type Props = { event: Extract<TimelineEvent, { type: 'RADIOLOGY_ORDER' }> };

const STATUS_VARIANT: Record<RadiologyOrderStatus, BadgeProps['variant']> = {
  ORDERED:     'default',
  SCHEDULED:   'warning',
  IN_PROGRESS: 'warning',
  RESULTED:    'success',
  REVIEWED:    'success',
  CANCELLED:   'danger',
};

const STATUS_LABEL: Record<RadiologyOrderStatus, string> = {
  ORDERED:     'Ordered',
  SCHEDULED:   'Scheduled',
  IN_PROGRESS: 'In Progress',
  RESULTED:    'Resulted',
  REVIEWED:    'Reviewed',
  CANCELLED:   'Cancelled',
};

export function RadiologyOrderCard({ event }: Props) {
  const { data } = event;
  const doctor = `Dr. ${data.orderedBy.firstName} ${data.orderedBy.lastName}`;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm border-s-4 border-s-purple-400">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
          Radiology
        </span>
        <span className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</span>
      </div>

      <p className="font-medium text-sm text-foreground">
        {data.modality}
        {data.bodyPart && (
          <span className="ms-1.5 text-xs text-muted-foreground">— {data.bodyPart}</span>
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
