'use client';

import { useTranslations } from 'next-intl';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { InvoiceStatus } from '@/types/invoice';

type BadgeVariant = BadgeProps['variant'];

const STATUS_VARIANT: Record<InvoiceStatus, BadgeVariant> = {
  DRAFT:          'outline',
  ISSUED:         'default',
  PARTIALLY_PAID: 'warning',
  PAID:           'success',
  CANCELLED:      'danger',
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const t = useTranslations('invoice.status');
  const variant = STATUS_VARIANT[status] ?? 'outline';
  const label = t(status as Parameters<typeof t>[0]);
  return <Badge variant={variant} className="whitespace-nowrap">{label}</Badge>;
}
