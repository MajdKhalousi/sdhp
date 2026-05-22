import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { AppointmentStatus } from '@/types/appointment';

type BadgeVariant = BadgeProps['variant'];

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; variant: BadgeVariant }> = {
  SCHEDULED:   { label: 'Scheduled',   variant: 'outline'  },
  CONFIRMED:   { label: 'Confirmed',   variant: 'default'  },
  CHECKED_IN:  { label: 'Checked In',  variant: 'warning'  },
  IN_QUEUE:    { label: 'In Queue',    variant: 'warning'  },
  IN_PROGRESS: { label: 'In Progress', variant: 'default'  },
  COMPLETED:   { label: 'Completed',   variant: 'success'  },
  CANCELLED:   { label: 'Cancelled',   variant: 'danger'   },
  NO_SHOW:     { label: 'No Show',     variant: 'danger'   },
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const { label, variant } = STATUS_CONFIG[status] ?? { label: status, variant: 'outline' };
  return <Badge variant={variant}>{label}</Badge>;
}
