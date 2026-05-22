import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { QueueStatus } from '@/types/queue';

type BadgeVariant = BadgeProps['variant'];

const STATUS_CONFIG: Record<QueueStatus, { label: string; variant: BadgeVariant }> = {
  WAITING:     { label: 'Waiting',     variant: 'outline'  },
  CALLED:      { label: 'Called',      variant: 'warning'  },
  IN_PROGRESS: { label: 'In Progress', variant: 'default'  },
  DONE:        { label: 'Done',        variant: 'success'  },
  SKIPPED:     { label: 'Skipped',     variant: 'danger'   },
};

export function QueueStatusBadge({ status }: { status: QueueStatus }) {
  const { label, variant } = STATUS_CONFIG[status] ?? { label: status, variant: 'outline' };
  return <Badge variant={variant}>{label}</Badge>;
}
