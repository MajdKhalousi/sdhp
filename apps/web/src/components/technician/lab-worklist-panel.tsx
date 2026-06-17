'use client';

import { useState, Fragment } from 'react';
import { RefreshCw, FlaskConical, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  useLabOrdersWorklist,
  useUpdateLabOrderStatus,
  useUpsertLabResult,
} from '@/hooks/use-labs';
import type { LabOrder, LabResult } from '@/hooks/use-labs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateDisplay } from '@/lib/format-date';

type ViewMode = 'pending' | 'completedToday';

const PENDING_STATUSES   = ['ORDERED', 'SAMPLE_COLLECTED', 'IN_PROGRESS'] as const;
const COMPLETED_STATUSES = ['RESULTED', 'REVIEWED'] as const;

type BadgeVariant = 'default' | 'warning' | 'outline' | 'danger' | 'success';
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  ORDERED:          'outline',
  SAMPLE_COLLECTED: 'warning',
  IN_PROGRESS:      'default',
  RESULTED:         'success',
  REVIEWED:         'success',
};

const PRIORITY_OPTIONS = ['ROUTINE', 'URGENT', 'STAT'] as const;
const PRIORITY_VARIANT: Record<string, BadgeVariant> = {
  STAT:    'danger',
  URGENT:  'warning',
  ROUTINE: 'outline',
};

// Damascus-aware today string — returns YYYY-MM-DD in Asia/Damascus timezone
function todayDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Damascus' });
}

// ── Lab status badge ──────────────────────────────────────────────────────────

function LabStatusBadge({ status, label }: { status: string; label: string }) {
  const variant = STATUS_VARIANT[status] ?? 'outline';
  return <Badge variant={variant}>{label}</Badge>;
}

// ── Status-advance button (ORDERED → SAMPLE_COLLECTED or SAMPLE_COLLECTED → IN_PROGRESS) ──

function StatusActionButton({ order }: { order: LabOrder }) {
  const t = useTranslations('technicianLabs');
  const [error, setError] = useState('');
  const { mutate, isPending } = useUpdateLabOrderStatus();

  const isOrdered = order.status === 'ORDERED';

  function handleClick() {
    setError('');
    mutate(
      {
        labOrderId: order.id,
        patientId: order.patientId,
        payload: { status: isOrdered ? 'SAMPLE_COLLECTED' : 'IN_PROGRESS' },
      },
      {
        onError: (e) => {
          setError(
            e instanceof Error
              ? e.message
              : isOrdered
              ? t('actions.collectFailed')
              : t('actions.processingFailed'),
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
            {isOrdered ? t('actions.collecting') : t('actions.processing')}
          </>
        ) : isOrdered ? (
          t('actions.collectSample')
        ) : (
          t('actions.startProcessing')
        )}
      </button>
      {error && <p className="max-w-[16rem] text-end text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── Result entry form (shown when status is IN_PROGRESS) ─────────────────────

function LabResultForm({ order }: { order: LabOrder }) {
  const t = useTranslations('technicianLabs');
  const [fields, setFields] = useState({
    resultValue: '',
    unit: '',
    referenceRange: '',
    interpretation: '',
    resultNotes: '',
  });
  const [validationError, setValidationError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const { mutate, isPending } = useUpsertLabResult();

  function set(key: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFields((f) => ({ ...f, [key]: e.target.value }));
      if (key === 'resultValue') setValidationError('');
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fields.resultValue.trim()) {
      setValidationError(t('validation.resultValueRequired'));
      return;
    }
    setValidationError('');
    setSubmitError('');
    const payload: Record<string, string> = { resultValue: fields.resultValue.trim() };
    if (fields.unit.trim())           payload.unit = fields.unit.trim();
    if (fields.referenceRange.trim()) payload.referenceRange = fields.referenceRange.trim();
    if (fields.interpretation.trim()) payload.interpretation = fields.interpretation.trim();
    if (fields.resultNotes.trim())    payload.resultNotes = fields.resultNotes.trim();

    mutate(
      { labOrderId: order.id, patientId: order.patientId, payload },
      {
        onError: (e) => {
          setSubmitError(e instanceof Error ? e.message : t('actions.submitFailed'));
        },
      },
    );
  }

  const inputCls =
    'w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring';

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2.5 border-t pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('result.formTitle')}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium">{t('result.resultValueLabel')}</label>
          <input value={fields.resultValue} onChange={set('resultValue')} className={inputCls} placeholder={t('result.placeholders.resultValue')} />
          {validationError && (
            <p className="mt-0.5 text-xs text-destructive">{validationError}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">{t('result.unitLabel')}</label>
          <input value={fields.unit} onChange={set('unit')} className={inputCls} placeholder={t('result.placeholders.unit')} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">{t('result.referenceRangeLabel')}</label>
        <input value={fields.referenceRange} onChange={set('referenceRange')} className={inputCls} placeholder={t('result.placeholders.referenceRange')} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">{t('result.interpretationLabel')}</label>
        <input value={fields.interpretation} onChange={set('interpretation')} className={inputCls} placeholder={t('result.placeholders.interpretation')} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">{t('result.resultNotesLabel')}</label>
        <textarea
          value={fields.resultNotes}
          onChange={set('resultNotes')}
          rows={2}
          className={`${inputCls} resize-none`}
        />
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
          {isPending ? t('actions.submitting') : t('actions.submitResult')}
        </button>
      </div>
    </form>
  );
}

// ── Result summary (RESULTED / REVIEWED — read-only) ─────────────────────────

function LabResultSummary({ result }: { result: LabResult }) {
  const t = useTranslations('technicianLabs');
  if (!result.resultValue && !result.referenceRange && !result.interpretation) return null;
  return (
    <div className="mt-3 space-y-1 border-t pt-3">
      {result.resultValue && (
        <p className="text-xs">
          <span className="font-medium text-foreground">{t('result.resultLabel')}:</span>{' '}
          <span className="text-muted-foreground" dir="ltr">
            {result.resultValue}{result.unit ? ` ${result.unit}` : ''}
          </span>
        </p>
      )}
      {result.referenceRange && (
        <p className="text-xs">
          <span className="font-medium text-foreground">{t('result.referenceRangeLabel')}:</span>{' '}
          <span className="text-muted-foreground" dir="ltr">{result.referenceRange}</span>
        </p>
      )}
      {result.interpretation && (
        <p className="text-xs">
          <span className="font-medium text-foreground">{t('result.interpretationLabel')}:</span>{' '}
          <span className="text-muted-foreground" dir="ltr">{result.interpretation}</span>
        </p>
      )}
    </div>
  );
}

// ── Individual order card ─────────────────────────────────────────────────────

function LabOrderCard({ order }: { order: LabOrder }) {
  const t = useTranslations('technicianLabs');
  const isInProgress = order.status === 'IN_PROGRESS';
  const isCompleted  = order.status === 'RESULTED' || order.status === 'REVIEWED';

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <FlaskConical className="h-4 w-4 text-primary" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{order.testName}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>
              {order.patient.firstName} {order.patient.lastName}
              <span className="ms-1 font-mono" dir="ltr">
                {order.patient.mrn}
              </span>
            </span>
            <span>{t('card.orderedAt', { date: formatDateDisplay(order.createdAt) })}</span>
            {order.testCode && (
              <span className="font-mono text-muted-foreground/70">{order.testCode}</span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <LabStatusBadge
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
              {t('card.clinicalInfo')}: <bdi>{order.clinicalInfo}</bdi>
            </p>
          )}
          {order.orderedBy?.user && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('card.orderedBy')}: {order.orderedBy.user.firstName} {order.orderedBy.user.lastName}
            </p>
          )}
          {order.notes && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('card.notes')}: <bdi>{order.notes}</bdi>
            </p>
          )}
        </div>

        {/* Action button only for ORDERED and SAMPLE_COLLECTED */}
        {!isInProgress && !isCompleted && <StatusActionButton order={order} />}
      </div>

      {/* Result entry form for IN_PROGRESS */}
      {isInProgress && <LabResultForm order={order} />}

      {/* Read-only result summary for RESULTED / REVIEWED */}
      {isCompleted && order.result && <LabResultSummary result={order.result} />}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function LabWorklistPanel() {
  const t = useTranslations('technicianLabs');
  const tCommon = useTranslations('common');

  const [from, setFrom]                   = useState(todayDateString);
  const [to, setTo]                       = useState(todayDateString);
  const [viewMode, setViewMode]           = useState<ViewMode>('pending');
  const [patientSearch, setPatientSearch] = useState('');

  const fromIso  = from ? new Date(from + 'T00:00:00').toISOString() : undefined;
  const toIso    = to   ? new Date(to   + 'T23:59:59').toISOString() : undefined;
  const todayStr = todayDateString();

  const { data, isLoading, isError, error, refetch, isFetching } = useLabOrdersWorklist({
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

  // Status counts from full date-scoped fetch (gives the day's snapshot regardless of search)
  const statusCounts = {
    ORDERED:          allOrders.filter((o) => o.status === 'ORDERED').length,
    SAMPLE_COLLECTED: allOrders.filter((o) => o.status === 'SAMPLE_COLLECTED').length,
    IN_PROGRESS:      allOrders.filter((o) => o.status === 'IN_PROGRESS').length,
    RESULTED:         allOrders.filter((o) => o.status === 'RESULTED').length,
    REVIEWED:         allOrders.filter((o) => o.status === 'REVIEWED').length,
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
  const countItems = [
    { key: 'ordered',    count: statusCounts.ORDERED,          label: t('statusCounts.ordered',    { count: statusCounts.ORDERED })          },
    { key: 'sampled',    count: statusCounts.SAMPLE_COLLECTED, label: t('statusCounts.sampled',    { count: statusCounts.SAMPLE_COLLECTED }) },
    { key: 'inProgress', count: statusCounts.IN_PROGRESS,      label: t('statusCounts.inProgress', { count: statusCounts.IN_PROGRESS })      },
    { key: 'resulted',   count: statusCounts.RESULTED,         label: t('statusCounts.resulted',   { count: statusCounts.RESULTED })         },
    { key: 'reviewed',   count: statusCounts.REVIEWED,         label: t('statusCounts.reviewed',   { count: statusCounts.REVIEWED })         },
  ].filter((item) => item.count > 0);

  const countRow =
    !isLoading && !isError && countItems.length > 0 ? (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-muted/40 px-3 py-2">
        {countItems.map((item, idx) => (
          <Fragment key={item.key}>
            {idx > 0 && <span className="text-xs text-muted-foreground/40">·</span>}
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </Fragment>
        ))}
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
          <FlaskConical className="h-8 w-8 text-muted-foreground/50" />
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
          <LabOrderCard key={order.id} order={order} />
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
