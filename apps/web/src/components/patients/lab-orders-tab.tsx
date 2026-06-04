'use client';

import { FolderOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import type { BadgeProps } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePatientLabOrders, type LabOrder, type LabResult } from '@/hooks/use-labs';
import type { LabOrderStatus } from '@/types/timeline';
import { formatDateDisplay } from '@/lib/format-date';

const STATUS_VARIANT: Record<LabOrderStatus, BadgeProps['variant']> = {
  ORDERED:          'default',
  SAMPLE_COLLECTED: 'warning',
  IN_PROGRESS:      'warning',
  RESULTED:         'success',
  REVIEWED:         'success',
  CANCELLED:        'danger',
};

const PRIORITY_OPTIONS = ['ROUTINE', 'URGENT', 'STAT'] as const;

function ResultSection({ result }: { result: LabResult }) {
  const tLab = useTranslations('encounter');
  const reviewer = result.reviewedBy
    ? `${result.reviewedBy.user.firstName} ${result.reviewedBy.user.lastName}`
    : null;

  return (
    <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 dark:border-green-900/30 dark:bg-green-950/20">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
        {tLab('labOrders.result.heading')}
      </p>
      <div className="space-y-0.5 text-sm">
        {result.resultValue && (
          <p>
            <span className="font-medium text-foreground">{result.resultValue}</span>
            {result.unit && <span className="ms-1 text-muted-foreground">{result.unit}</span>}
            {result.referenceRange && (
              <span className="ms-2 text-xs text-muted-foreground">
                {tLab('labOrders.result.reference')}: {result.referenceRange}
              </span>
            )}
          </p>
        )}
        {result.interpretation && (
          <p className="text-xs text-muted-foreground">
            {tLab('labOrders.result.interpretation')}: {result.interpretation}
          </p>
        )}
        {result.resultNotes && (
          <p className="text-xs text-muted-foreground">
            {tLab('labOrders.result.notes')}: {result.resultNotes}
          </p>
        )}
        {result.resultAt && (
          <p className="text-xs text-muted-foreground">
            {tLab('labOrders.result.resultAt')}: {formatDateDisplay(result.resultAt)}
          </p>
        )}
        {reviewer && result.reviewedAt && (
          <p className="text-xs text-muted-foreground">
            {tLab('labOrders.result.reviewedBy')}: {reviewer} · {formatDateDisplay(result.reviewedAt)}
          </p>
        )}
      </div>
    </div>
  );
}

function LabOrderItem({ order }: { order: LabOrder }) {
  const t = useTranslations('timeline');
  const tLab = useTranslations('encounter');
  const tPatient = useTranslations('patient');
  const doctor = `${order.orderedBy.user.firstName} ${order.orderedBy.user.lastName}`;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm border-s-4 border-s-amber-400">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          {t('cards.labOrder')}
        </span>
        <span className="text-xs text-muted-foreground" dir="ltr">{formatDateDisplay(order.createdAt)}</span>
      </div>

      <p className="font-medium text-sm text-foreground">
        {order.testName}
        {order.testCode && (
          <span className="ms-1.5 font-mono text-xs text-muted-foreground" dir="ltr">
            ({order.testCode})
          </span>
        )}
      </p>

      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <Badge variant={STATUS_VARIANT[order.status]}>
          {t(`labOrderStatus.${order.status}` as Parameters<typeof t>[0])}
        </Badge>
        {order.priority && (
          <span className="text-xs text-muted-foreground">
            · {(PRIORITY_OPTIONS as ReadonlyArray<string>).includes(order.priority)
              ? tLab(`labOrders.priority.${order.priority}` as Parameters<typeof tLab>[0])
              : order.priority}
          </span>
        )}
      </div>

      <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
        <p>{tPatient('labOrders.orderedBy')}: {doctor}</p>
        {order.collectedAt && (
          <p>{tPatient('labOrders.collectedAt')}: {formatDateDisplay(order.collectedAt)}</p>
        )}
        {order.clinicalInfo && (
          <p>{tPatient('labOrders.clinicalInfo')}: {order.clinicalInfo}</p>
        )}
        {order.notes && (
          <p>{tPatient('labOrders.notes')}: {order.notes}</p>
        )}
        {order.cancelReason && (
          <p className="text-destructive">{tPatient('labOrders.cancelReason')}: {order.cancelReason}</p>
        )}
      </div>

      {order.result && <ResultSection result={order.result} />}
    </div>
  );
}

interface LabOrdersTabProps {
  patientId: string;
}

export function LabOrdersTab({ patientId }: LabOrdersTabProps) {
  const tError = useTranslations('patient.detail.error');
  const tTab = useTranslations('patient.detail.clinicalTab');
  const tCommon = useTranslations('common');

  const { data: orders = [], isLoading, isError, error, refetch } = usePatientLabOrders(patientId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
        <p className="text-sm font-medium text-destructive">{tError('loadFailed')}</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          {error instanceof Error ? error.message : tError('occurred')}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-1 h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
        >
          {tCommon('actions.tryAgain')}
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <FolderOpen className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{tTab('emptyLabOrders')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <LabOrderItem key={order.id} order={order} />
      ))}
    </div>
  );
}
