'use client';

import { useState } from 'react';
import { RefreshCw, ScanLine, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  useRadiologyOrdersWorklist,
  useUpdateRadiologyOrderStatus,
  useUpsertRadiologyReport,
} from '@/hooks/use-radiology';
import type { RadiologyOrder, RadiologyReport } from '@/hooks/use-radiology';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateDisplay } from '@/lib/format-date';

type ViewMode = 'pending' | 'completedToday';

const PENDING_STATUSES   = ['ORDERED', 'SCHEDULED', 'IN_PROGRESS'] as const;
const COMPLETED_STATUSES = ['RESULTED', 'REVIEWED'] as const;

type BadgeVariant = 'default' | 'warning' | 'outline' | 'danger' | 'success';
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  ORDERED:     'outline',
  SCHEDULED:   'warning',
  IN_PROGRESS: 'default',
  RESULTED:    'success',
  REVIEWED:    'success',
};

const MODALITY_OPTIONS = ['X-RAY', 'CT', 'MRI', 'ULTRASOUND', 'ECHO'] as const;
const PRIORITY_OPTIONS = ['ROUTINE', 'URGENT', 'STAT'] as const;
const PRIORITY_VARIANT: Record<string, BadgeVariant> = {
  STAT:    'danger',
  URGENT:  'warning',
  ROUTINE: 'outline',
};

function todayDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Damascus' });
}

// ── Radiology status badge ────────────────────────────────────────────────────

function RadiologyStatusBadge({ status, label }: { status: string; label: string }) {
  const variant = STATUS_VARIANT[status] ?? 'outline';
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
        payload: { findings: findings.trim(), impression: impression.trim() },
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

// ── Report summary (RESULTED / REVIEWED — read-only) ─────────────────────────

function RadiologyReportSummary({ report }: { report: RadiologyReport }) {
  const t = useTranslations('technicianRadiology');
  return (
    <div className="mt-3 space-y-1.5 border-t pt-3">
      {report.findings && (
        <div>
          <p className="text-xs font-medium text-foreground">{t('report.findingsDisplayLabel')}</p>
          <p className="line-clamp-2 text-xs text-muted-foreground">{report.findings}</p>
        </div>
      )}
      {report.impression && (
        <div>
          <p className="text-xs font-medium text-foreground">{t('report.impressionDisplayLabel')}</p>
          <p className="text-xs text-muted-foreground">{report.impression}</p>
        </div>
      )}
    </div>
  );
}

// ── Individual order card ─────────────────────────────────────────────────────

function RadiologyOrderCard({ order }: { order: RadiologyOrder }) {
  const t = useTranslations('technicianRadiology');
  const isInProgress = order.status === 'IN_PROGRESS';
  const isCompleted  = order.status === 'RESULTED' || order.status === 'REVIEWED';

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <ScanLine className="h-4 w-4 text-primary" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {(MODALITY_OPTIONS as ReadonlyArray<string>).includes(order.modality)
              ? t(`modality.${order.modality}` as Parameters<typeof t>[0])
              : order.modality}
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
            <span>{t('card.orderedAt', { date: formatDateDisplay(order.createdAt) })}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <RadiologyStatusBadge
              status={order.status}
              label={t(`status.${order.status}` as Parameters<typeof t>[0])}
            />
            {order.priority && (
              <Badge variant={PRIORITY_VARIANT[order.priority] ?? 'outline'}>
                {(PRIORITY_OPTIONS as ReadonlyArray<string>).includes(order.priority)
                  ? t(`priority.${order.priority}` as Parameters<typeof t>[0])
                  : order.priority}
              </Badge>
            )}
          </div>
          {order.clinicalInfo && (
            <p className="mt-1 text-xs italic text-muted-foreground">
              {t('card.clinicalInfo')}: {order.clinicalInfo}
            </p>
          )}
        </div>

        {/* Action button only for ORDERED and SCHEDULED */}
        {!isInProgress && !isCompleted && <StatusActionButton order={order} />}
      </div>

      {/* Report entry form for IN_PROGRESS */}
      {isInProgress && <RadiologyReportForm order={order} />}

      {/* Read-only report summary for RESULTED / REVIEWED */}
      {isCompleted && order.report && <RadiologyReportSummary report={order.report} />}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function RadiologyWorklistPanel() {
  const t = useTranslations('technicianRadiology');
  const tCommon = useTranslations('common');

  const [from, setFrom]                   = useState(todayDateString);
  const [to, setTo]                       = useState(todayDateString);
  const [viewMode, setViewMode]           = useState<ViewMode>('pending');
  const [patientSearch, setPatientSearch] = useState('');

  const fromIso  = from ? new Date(from + 'T00:00:00').toISOString() : undefined;
  const toIso    = to   ? new Date(to   + 'T23:59:59').toISOString() : undefined;
  const todayStr = todayDateString();

  const { data, isLoading, isError, error, refetch, isFetching } = useRadiologyOrdersWorklist({
    ...(fromIso ? { from: fromIso } : {}),
    ...(toIso   ? { to:   toIso   } : {}),
  });

  const allOrders = data ?? [];

  // Patient search (case-insensitive, firstName + lastName + MRN)
  const searchLower = patientSearch.toLowerCase();
  const searchFiltered = patientSearch
    ? allOrders.filter((o) =>
        o.patient.firstName.toLowerCase().includes(searchLower) ||
        o.patient.lastName.toLowerCase().includes(searchLower) ||
        o.patient.mrn.toLowerCase().includes(searchLower),
      )
    : allOrders;

  // View mode status filter
  const activeStatuses: readonly string[] =
    viewMode === 'pending' ? PENDING_STATUSES : COMPLETED_STATUSES;
  const visibleOrders = searchFiltered.filter((o) => activeStatuses.includes(o.status));

  // Status counts from full date-scoped fetch
  const statusCounts = {
    ORDERED:     allOrders.filter((o) => o.status === 'ORDERED').length,
    SCHEDULED:   allOrders.filter((o) => o.status === 'SCHEDULED').length,
    IN_PROGRESS: allOrders.filter((o) => o.status === 'IN_PROGRESS').length,
    RESULTED:    allOrders.filter((o) => o.status === 'RESULTED').length,
    REVIEWED:    allOrders.filter((o) => o.status === 'REVIEWED').length,
  };

  // ── Header ────────────────────────────────────────────────────────────────
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

  // ── Filter row ────────────────────────────────────────────────────────────
  const filterRow = (
    <div className="flex flex-col gap-2">
      {/* View toggle + patient search */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border bg-muted/30 p-0.5">
          <button
            onClick={() => setViewMode('pending')}
            className={`h-7 rounded-md px-3 text-xs font-medium transition-colors ${
              viewMode === 'pending'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('filter.pending')}
          </button>
          <button
            onClick={() => setViewMode('completedToday')}
            className={`h-7 rounded-md px-3 text-xs font-medium transition-colors ${
              viewMode === 'completedToday'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('filter.completedToday')}
          </button>
        </div>
        <div className="relative flex-1 min-w-[160px]">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            placeholder={t('filter.searchPlaceholder')}
            className="h-7 w-full rounded-md border bg-background ps-7 pe-3 text-xs outline-none transition-colors focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      {/* Date range */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="whitespace-nowrap text-xs text-muted-foreground">{t('filter.from')}</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            dir="ltr"
            className="h-8 w-36 rounded-md border bg-background px-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="whitespace-nowrap text-xs text-muted-foreground">{t('filter.to')}</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            dir="ltr"
            className="h-8 w-36 rounded-md border bg-background px-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
          />
        </div>
        {(from !== todayStr || to !== todayStr) && (
          <button
            onClick={() => { setFrom(todayStr); setTo(todayStr); }}
            className="h-8 rounded-md border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {t('filter.today')}
          </button>
        )}
      </div>
    </div>
  );

  // ── Status count row ──────────────────────────────────────────────────────
  const countRow =
    !isLoading && !isError && allOrders.length > 0 ? (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-muted/40 px-3 py-2">
        <span className="text-xs text-muted-foreground">
          {t('statusCounts.ordered', { count: statusCounts.ORDERED })}
        </span>
        <span className="text-xs text-muted-foreground/40">·</span>
        <span className="text-xs text-muted-foreground">
          {t('statusCounts.scheduled', { count: statusCounts.SCHEDULED })}
        </span>
        <span className="text-xs text-muted-foreground/40">·</span>
        <span className="text-xs text-muted-foreground">
          {t('statusCounts.inProgress', { count: statusCounts.IN_PROGRESS })}
        </span>
        <span className="text-xs text-muted-foreground/40">·</span>
        <span className="text-xs text-muted-foreground">
          {t('statusCounts.resulted', { count: statusCounts.RESULTED })}
        </span>
        <span className="text-xs text-muted-foreground/40">·</span>
        <span className="text-xs text-muted-foreground">
          {t('statusCounts.reviewed', { count: statusCounts.REVIEWED })}
        </span>
      </div>
    ) : null;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4">
        {header}
        {filterRow}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="space-y-4">
        {header}
        {filterRow}
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

  // ── Empty state ───────────────────────────────────────────────────────────
  let emptyTitle: string;
  let emptySubtitle: string;
  if (patientSearch && searchFiltered.length === 0) {
    emptyTitle    = t('empty.withSearch');
    emptySubtitle = t('empty.withSearchSub');
  } else if (allOrders.length === 0) {
    emptyTitle    = t('empty.title');
    emptySubtitle = t('empty.subtitle');
  } else if (viewMode === 'pending') {
    emptyTitle    = t('empty.noPending');
    emptySubtitle = t('empty.noPendingSub');
  } else {
    emptyTitle    = t('empty.noCompleted');
    emptySubtitle = t('empty.noCompletedSub');
  }

  if (visibleOrders.length === 0) {
    return (
      <div className="space-y-4">
        {header}
        {filterRow}
        {countRow}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <ScanLine className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">{emptyTitle}</p>
          <p className="text-xs text-muted-foreground">{emptySubtitle}</p>
        </div>
      </div>
    );
  }

  // ── Order list ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {header}
      {filterRow}
      {countRow}
      <div className="space-y-3">
        {visibleOrders.map((order) => (
          <RadiologyOrderCard key={order.id} order={order} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {viewMode === 'pending'
          ? t('counter', { count: visibleOrders.length })
          : t('counterCompleted', { count: visibleOrders.length })}
      </p>
    </div>
  );
}
