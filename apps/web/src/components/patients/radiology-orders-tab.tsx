'use client';

import { Scan } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import type { BadgeProps } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePatientRadiologyOrders,
  type RadiologyOrder,
  type RadiologyReport,
} from '@/hooks/use-radiology';
import type { RadiologyOrderStatus } from '@/types/timeline';

const STATUS_VARIANT: Record<RadiologyOrderStatus, BadgeProps['variant']> = {
  ORDERED:     'default',
  SCHEDULED:   'warning',
  IN_PROGRESS: 'warning',
  RESULTED:    'success',
  REVIEWED:    'success',
  CANCELLED:   'danger',
};

const MODALITY_OPTIONS = ['X-RAY', 'CT', 'MRI', 'ULTRASOUND', 'ECHO'] as const;
const PRIORITY_OPTIONS = ['ROUTINE', 'URGENT', 'STAT'] as const;

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function ReportSection({ report }: { report: RadiologyReport }) {
  const tRad = useTranslations('encounter');
  const locale = useLocale();
  const displayLocale = locale === 'ar' ? 'ar-SY' : 'en-US';
  const reportedBy = report.reportedBy
    ? `${report.reportedBy.user.firstName} ${report.reportedBy.user.lastName}`
    : null;
  const reviewedBy = report.reviewedBy
    ? `${report.reviewedBy.user.firstName} ${report.reviewedBy.user.lastName}`
    : null;

  return (
    <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-900/30 dark:bg-blue-950/20">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">
        {tRad('radiologyOrders.report.heading')}
      </p>
      <div className="space-y-0.5">
        {report.findings && (
          <p className="text-sm text-foreground">
            <span className="text-xs font-medium text-muted-foreground">
              {tRad('radiologyOrders.report.findings')}:{' '}
            </span>
            {report.findings}
          </p>
        )}
        {report.impression && (
          <p className="text-sm text-foreground">
            <span className="text-xs font-medium text-muted-foreground">
              {tRad('radiologyOrders.report.impression')}:{' '}
            </span>
            {report.impression}
          </p>
        )}
        {reportedBy && report.reportedAt && (
          <p className="text-xs text-muted-foreground">
            {tRad('radiologyOrders.report.reportedBy')}: {reportedBy} · {formatDate(report.reportedAt, displayLocale)}
          </p>
        )}
        {!reportedBy && report.reportedAt && (
          <p className="text-xs text-muted-foreground">
            {tRad('radiologyOrders.report.reportedAt')}: {formatDate(report.reportedAt, displayLocale)}
          </p>
        )}
        {reviewedBy && report.reviewedAt && (
          <p className="text-xs text-muted-foreground">
            {tRad('radiologyOrders.report.reviewedBy')}: {reviewedBy} · {formatDate(report.reviewedAt, displayLocale)}
          </p>
        )}
      </div>
    </div>
  );
}

function RadiologyOrderItem({ order }: { order: RadiologyOrder }) {
  const t = useTranslations('timeline');
  const tRad = useTranslations('encounter');
  const tPatient = useTranslations('patient');
  const locale = useLocale();
  const displayLocale = locale === 'ar' ? 'ar-SY' : 'en-US';
  const doctor = `${order.orderedBy.user.firstName} ${order.orderedBy.user.lastName}`;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm border-s-4 border-s-blue-400">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          {t('cards.radiology')}
        </span>
        <span className="text-xs text-muted-foreground" dir="ltr">{formatDate(order.createdAt, displayLocale)}</span>
      </div>

      <p className="font-medium text-sm text-foreground">
        {(MODALITY_OPTIONS as ReadonlyArray<string>).includes(order.modality)
          ? tRad(`radiologyOrders.modality.${order.modality}` as Parameters<typeof tRad>[0])
          : order.modality}
        {order.bodyPart && (
          <span className="ms-1.5 text-sm font-normal text-muted-foreground">— {order.bodyPart}</span>
        )}
      </p>

      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <Badge variant={STATUS_VARIANT[order.status]}>
          {t(`radiologyStatus.${order.status}` as Parameters<typeof t>[0])}
        </Badge>
        {order.priority && (
          <span className="text-xs text-muted-foreground">
            · {(PRIORITY_OPTIONS as ReadonlyArray<string>).includes(order.priority)
              ? tRad(`radiologyOrders.priority.${order.priority}` as Parameters<typeof tRad>[0])
              : order.priority}
          </span>
        )}
      </div>

      <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
        <p>{tPatient('radiologyOrders.orderedBy')}: {doctor}</p>
        {order.scheduledAt && (
          <p>{tPatient('radiologyOrders.scheduledAt')}: {formatDate(order.scheduledAt, displayLocale)}</p>
        )}
        {order.clinicalInfo && (
          <p>{tPatient('radiologyOrders.clinicalInfo')}: {order.clinicalInfo}</p>
        )}
        {order.notes && (
          <p>{tPatient('radiologyOrders.notes')}: {order.notes}</p>
        )}
        {order.cancelReason && (
          <p className="text-destructive">{tPatient('radiologyOrders.cancelReason')}: {order.cancelReason}</p>
        )}
      </div>

      {order.report && <ReportSection report={order.report} />}
    </div>
  );
}

interface RadiologyOrdersTabProps {
  patientId: string;
}

export function RadiologyOrdersTab({ patientId }: RadiologyOrdersTabProps) {
  const tError = useTranslations('patient.detail.error');
  const tTab = useTranslations('patient.detail.clinicalTab');
  const tCommon = useTranslations('common');

  const { data: orders = [], isLoading, isError, error, refetch } = usePatientRadiologyOrders(patientId);

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
        <Scan className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{tTab('emptyRadiology')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <RadiologyOrderItem key={order.id} order={order} />
      ))}
    </div>
  );
}
