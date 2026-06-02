'use client';

import { useState } from 'react';
import { RefreshCw, ScanLine } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import {
  useRadiologyOrdersWorklist,
  useUpdateRadiologyOrderStatus,
  useUpsertRadiologyReport,
} from '@/hooks/use-radiology';
import type { RadiologyOrder } from '@/hooks/use-radiology';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const PENDING_STATUSES = ['ORDERED', 'SCHEDULED', 'IN_PROGRESS'] as const;
type PendingStatus = typeof PENDING_STATUSES[number];

type BadgeVariant = 'default' | 'warning' | 'outline';
const STATUS_VARIANT: Record<PendingStatus, BadgeVariant> = {
  ORDERED:     'outline',
  SCHEDULED:   'warning',
  IN_PROGRESS: 'default',
};

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === 'ar' ? 'ar-u-nu-latn' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// ── Radiology status badge ────────────────────────────────────────────────────

function RadiologyStatusBadge({ status, label }: { status: string; label: string }) {
  const variant = STATUS_VARIANT[status as PendingStatus] ?? 'outline';
  return <Badge variant={variant}>{label}</Badge>;
}

// ── Status-advance button (ORDERED → SCHEDULED or SCHEDULED → IN_PROGRESS) ───

function StatusActionButton({ order }: { order: RadiologyOrder }) {
  const t = useTranslations('technicianRadiology');
  const [error, setError] = useState('');
  const { mutate, isPending } = useUpdateRadiologyOrderStatus();

  const isOrdered = order.status === 'ORDERED';

  function handleClick() {
    setError('');
    mutate(
      {
        radiologyOrderId: order.id,
        patientId: order.patientId,
        payload: { status: isOrdered ? 'SCHEDULED' : 'IN_PROGRESS' },
      },
      {
        onError: (e) => {
          setError(
            e instanceof Error
              ? e.message
              : isOrdered
              ? t('actions.scheduleFailed')
              : t('actions.startFailed'),
          );
        },
      },
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <>
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
            {isOrdered ? t('actions.scheduling') : t('actions.starting')}
          </>
        ) : isOrdered ? (
          t('actions.schedule')
        ) : (
          t('actions.startScan')
        )}
      </button>
      {error && <p className="max-w-[16rem] text-end text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── Report entry form (shown when status is IN_PROGRESS) ─────────────────────

function RadiologyReportForm({ order }: { order: RadiologyOrder }) {
  const t = useTranslations('technicianRadiology');
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');
  const [findingsError, setFindingsError] = useState('');
  const [impressionError, setImpressionError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const { mutate, isPending } = useUpsertRadiologyReport();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let valid = true;
    if (!findings.trim()) {
      setFindingsError(t('validation.findingsRequired'));
      valid = false;
    } else {
      setFindingsError('');
    }
    if (!impression.trim()) {
      setImpressionError(t('validation.impressionRequired'));
      valid = false;
    } else {
      setImpressionError('');
    }
    if (!valid) return;

    setSubmitError('');
    mutate(
      {
        radiologyOrderId: order.id,
        patientId: order.patientId,
        payload: {
          findings: findings.trim(),
          impression: impression.trim(),
        },
      },
      {
        onError: (e) => {
          setSubmitError(e instanceof Error ? e.message : t('actions.submitFailed'));
        },
      },
    );
  }

  const textareaCls =
    'w-full resize-none rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring';

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2.5 border-t pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('report.formTitle')}
      </p>

      <div>
        <label className="mb-1 block text-xs font-medium">{t('report.findingsLabel')}</label>
        <textarea
          value={findings}
          onChange={(e) => { setFindings(e.target.value); setFindingsError(''); }}
          rows={3}
          className={textareaCls}
        />
        {findingsError && <p className="mt-0.5 text-xs text-destructive">{findingsError}</p>}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">{t('report.impressionLabel')}</label>
        <textarea
          value={impression}
          onChange={(e) => { setImpression(e.target.value); setImpressionError(''); }}
          rows={2}
          className={textareaCls}
        />
        {impressionError && <p className="mt-0.5 text-xs text-destructive">{impressionError}</p>}
      </div>

      {submitError && <p className="text-xs text-destructive">{submitError}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending && (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
          )}
          {isPending ? t('actions.submitting') : t('actions.submitReport')}
        </button>
      </div>
    </form>
  );
}

// ── Individual order card ─────────────────────────────────────────────────────

function RadiologyOrderCard({ order }: { order: RadiologyOrder }) {
  const t = useTranslations('technicianRadiology');
  const locale = useLocale();
  const isInProgress = order.status === 'IN_PROGRESS';

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <ScanLine className="h-4 w-4 text-primary" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {order.modality}
            {order.bodyPart && (
              <span className="ms-1.5 text-xs font-normal text-muted-foreground">
                — {order.bodyPart}
              </span>
            )}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>
              {order.patient.firstName} {order.patient.lastName}
              <span className="ms-1 font-mono" dir="ltr">
                {order.patient.mrn}
              </span>
            </span>
            <span>{t('card.orderedAt', { date: formatDate(order.createdAt, locale) })}</span>
          </div>
          <div className="mt-1.5">
            <RadiologyStatusBadge
              status={order.status}
              label={t(`status.${order.status}` as Parameters<typeof t>[0])}
            />
          </div>
        </div>

        {!isInProgress && <StatusActionButton order={order} />}
      </div>

      {isInProgress && <RadiologyReportForm order={order} />}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function RadiologyWorklistPanel() {
  const t = useTranslations('technicianRadiology');
  const tCommon = useTranslations('common');

  const { data, isLoading, isError, error, refetch, isFetching } = useRadiologyOrdersWorklist();

  const pendingOrders = data?.filter((o) =>
    (PENDING_STATUSES as readonly string[]).includes(o.status),
  ) ?? [];

  const header = (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-sm font-semibold">{t('panelTitle')}</h2>
        <p className="text-xs text-muted-foreground">{t('autoRefresh')}</p>
      </div>
      <button
        onClick={() => refetch()}
        disabled={isFetching}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent disabled:opacity-40"
        aria-label={t('refreshLabel')}
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {header}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        {header}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
          <p className="text-sm font-medium text-destructive">{t('error.loadFailed')}</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            {error instanceof Error ? error.message : t('error.occurred')}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-1 h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
          >
            {tCommon('actions.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  if (pendingOrders.length === 0) {
    return (
      <div className="space-y-4">
        {header}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <ScanLine className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">{t('empty.title')}</p>
          <p className="text-xs text-muted-foreground">{t('empty.subtitle')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}
      <div className="space-y-3">
        {pendingOrders.map((order) => (
          <RadiologyOrderCard key={order.id} order={order} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {t('counter', { count: pendingOrders.length })}
      </p>
    </div>
  );
}
