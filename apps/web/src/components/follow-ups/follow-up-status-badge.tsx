'use client';

import { useTranslations } from 'next-intl';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { FollowUpStatus } from '@/types/follow-up';

type BadgeVariant = BadgeProps['variant'];

const STATUS_VARIANT: Record<FollowUpStatus, BadgeVariant> = {
  PENDING:   'outline',
  DUE_TODAY: 'warning',
  UPCOMING:  'default',
  OVERDUE:   'danger',
  COMPLETED: 'success',
  MISSED:    'danger',
};

export function FollowUpStatusBadge({ status }: { status: FollowUpStatus }) {
  const t = useTranslations('followups.status');
  const variant = STATUS_VARIANT[status] ?? 'outline';
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {t(status as Parameters<typeof t>[0])}
    </Badge>
  );
}
