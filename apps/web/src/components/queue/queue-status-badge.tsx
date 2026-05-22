'use client';

import { useTranslations } from 'next-intl';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { QueueStatus } from '@/types/queue';

type BadgeVariant = BadgeProps['variant'];

const STATUS_VARIANT: Record<QueueStatus, BadgeVariant> = {
  WAITING:     'outline',
  CALLED:      'warning',
  IN_PROGRESS: 'default',
  DONE:        'success',
  SKIPPED:     'danger',
};

export function QueueStatusBadge({ status }: { status: QueueStatus }) {
  const t = useTranslations('queue.status');
  const variant = STATUS_VARIANT[status] ?? 'outline';
  const label = t(status as Parameters<typeof t>[0]);
  return <Badge variant={variant}>{label}</Badge>;
}
