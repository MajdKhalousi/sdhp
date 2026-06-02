'use client';

import { useState } from 'react';
import { RefreshCw, FlaskConical } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import {
  useLabOrdersWorklist,
  useUpdateLabOrderStatus,
  useUpsertLabResult,
} from '@/hooks/use-labs';
import type { LabOrder } from '@/hooks/use-labs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateDisplay } from '@/lib/format-date';

const PENDING_STATUSES = ['ORDERED', 'SAMPLE_COLLECTED', 'IN_PROGRESS'] as const;
type PendingStatus = typeof PENDING_STATUSES[number];

type BadgeVariant = 'default' | 'warning' | 'outline';
const STATUS_VARIANT: Record<PendingStatus, BadgeVariant> = {
  ORDERED:          'outline',
  SAMPLE_COLLECTED: 'warning',
  IN_PROGRESS:      'default',
};

// ── Lab status badge ──────────────────────────────────────────────────────────

function LabStatusBadge({ status, label }: { status: string; label: string }) {
  const variant = STATUS_VARIANT[status as PendingStatus] ?? 'outline';
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

// ── Individual order card ─────────────────────────────────────────────────────

function LabOrderCard({ order }: { order: LabOrder }) {
  const t = useTranslations('technicianLabs');
  const locale = useLocale();
  const isInProgress = order.status === 'IN_PROGRESS';

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
          <div className="mt-1.5">
            <LabStatusBadge
              status={order.status}
              label={t(`status.${order.status}` as Parameters<typeof t>[0])}
            />
          </div>
        </div>

        {!isInProgress && <StatusActionButton order={order} />}
      </div>

      {isInProgress && <LabResultForm order={order} />}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function LabWorklistPanel() {
  const t = useTranslations('technicianLabs');
  const tCommon = useTranslations('common');

  const { data, isLoading, isError, error, refetch, isFetching } = useLabOrdersWorklist();

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
          <FlaskConical className="h-8 w-8 text-muted-foreground/50" />
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
          <LabOrderCard key={order.id} order={order} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {t('counter', { count: pendingOrders.length })}
      </p>
    </div>
  );
}
