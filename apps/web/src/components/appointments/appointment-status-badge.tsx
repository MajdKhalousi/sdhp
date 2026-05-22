'use client';

import { useTranslations } from 'next-intl';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { AppointmentStatus } from '@/types/appointment';

type BadgeVariant = BadgeProps['variant'];

const STATUS_VARIANT: Record<AppointmentStatus, BadgeVariant> = {
  SCHEDULED:   'outline',
  CONFIRMED:   'default',
  CHECKED_IN:  'warning',
  IN_QUEUE:    'warning',
  IN_PROGRESS: 'default',
  COMPLETED:   'success',
  CANCELLED:   'danger',
  NO_SHOW:     'danger',
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const t = useTranslations('appointment.status');
  const variant = STATUS_VARIANT[status] ?? 'outline';
  const label = t(status as Parameters<typeof t>[0]);
  return <Badge variant={variant} className="whitespace-nowrap">{label}</Badge>;
}
