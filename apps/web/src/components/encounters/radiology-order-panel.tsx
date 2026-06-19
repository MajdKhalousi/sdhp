'use client';

import { useState } from 'react';
import { AlertCircle, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import type { BadgeProps } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePatientRadiologyOrders,
  useCreateRadiologyOrder,
  useReviewRadiologyReport,
  type CreateRadiologyOrderPayload,
  type RadiologyOrder,
  type RadiologyReport,
} from '@/hooks/use-radiology';
import type { RadiologyOrderStatus } from '@/types/timeline';
import { formatDateDisplay } from '@/lib/format-date';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-messages';

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

const FIELD_CLASS =
  'h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring';

function ReportSection({ report }: { report: RadiologyReport }) {
  const tRad = useTranslations('encounter');
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
      <div className="space-y-0.5 text-sm">
        {report.findings && (
          <p>
            <span className="text-xs font-medium text-muted-foreground">
              {tRad('radiologyOrders.report.findings')}:{' '}
            </span>
            <span className="text-foreground">{report.findings}</span>
          </p>
        )}
        {report.impression && (
          <p>
            <span className="text-xs font-medium text-muted-foreground">
              {tRad('radiologyOrders.report.impression')}:{' '}
            </span>
            <span className="text-foreground">{report.impression}</span>
          </p>
        )}
        {reportedBy && report.reportedAt && (
          <p className="text-xs text-muted-foreground">
            {tRad('radiologyOrders.report.reportedBy')}: {reportedBy} · {formatDateDisplay(report.reportedAt)}
          </p>
        )}
        {!reportedBy && report.reportedAt && (
          <p className="text-xs text-muted-foreground">
            {tRad('radiologyOrders.report.reportedAt')}: {formatDateDisplay(report.reportedAt)}
          </p>
        )}
        {reviewedBy && report.reviewedAt && (
          <p className="text-xs text-muted-foreground">
            {tRad('radiologyOrders.report.reviewedBy')}: {reviewedBy} · {formatDateDisplay(report.reviewedAt)}
          </p>
        )}
      </div>
    </div>
  );
}

interface OrderCardProps {
  order: RadiologyOrder;
  readOnly?: boolean;
}

function OrderCard({ order, readOnly }: OrderCardProps) {
  const t = useTranslations('timeline');
  const tRad = useTranslations('encounter');
  const [reviewError, setReviewError] = useState('');
  const { mutate: review, isPending: reviewing } = useReviewRadiologyReport();

  function handleReview() {
    setReviewError('');
    review(
      { radiologyOrderId: order.id, patientId: order.patientId },
      { onError: (e) => setReviewError(e instanceof Error ? e.message : tRad('radiologyOrders.error.reviewFailed')) },
    );
  }

  const canReview = !readOnly && order.status === 'RESULTED' && order.report !== null;

  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">
            {(MODALITY_OPTIONS as ReadonlyArray<string>).includes(order.modality)
              ? tRad(`radiologyOrders.modality.${order.modality}` as Parameters<typeof tRad>[0])
              : order.modality}
          </p>
          {order.bodyPart && (
            <span className="text-xs text-muted-foreground">— {order.bodyPart}</span>
          )}
          <Badge variant={STATUS_VARIANT[order.status]}>
            {t(`radiologyStatus.${order.status}` as Parameters<typeof t>[0])}
          </Badge>
        </div>
        {order.priority && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {(PRIORITY_OPTIONS as ReadonlyArray<string>).includes(order.priority)
              ? tRad(`radiologyOrders.priority.${order.priority}` as Parameters<typeof tRad>[0])
              : order.priority}
          </p>
        )}
        {order.clinicalInfo && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-medium">{tRad('radiologyOrders.fields.clinicalInfoLabel')}:</span> {order.clinicalInfo}
          </p>
        )}
        {order.notes && (
          <p className="mt-0.5 text-xs italic text-muted-foreground">{order.notes}</p>
        )}

        {order.report && <ReportSection report={order.report} />}

        {canReview && (
          <div className="mt-3">
            <button
              onClick={handleReview}
              disabled={reviewing}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-blue-400 px-3 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
            >
              {reviewing
                ? tRad('radiologyOrders.actions.reviewing')
                : tRad('radiologyOrders.actions.review')}
            </button>
          </div>
        )}
        {reviewError && (
          <p className="mt-1.5 text-xs text-destructive">{reviewError}</p>
        )}
      </div>
    </div>
  );
}

interface Form {
  modality: string;
  bodyPart: string;
  priority: string;
  clinicalInfo: string;
  notes: string;
}

const EMPTY_FORM: Form = {
  modality: '', bodyPart: '', priority: '', clinicalInfo: '', notes: '',
};

interface Props {
  patientId: string;
  encounterId: string;
  readOnly?: boolean;
}

export function RadiologyOrderPanel({ patientId, encounterId, readOnly }: Props) {
  const tRad = useTranslations('encounter');
  const tCommon = useTranslations('common');
  const tRoot = useTranslations();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const { data: allOrders = [], isLoading } = usePatientRadiologyOrders(patientId);
  const { mutate: create, isPending: creating } = useCreateRadiologyOrder();

  const orders = allOrders.filter((o) => o.encounterId === encounterId);
  const pendingReview = allOrders.filter(
    (o) =>
      o.encounterId !== encounterId &&
      o.status === 'RESULTED' &&
      o.report !== null &&
      o.report.reviewedAt === null,
  );

  function setField(key: keyof Form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError('');
  }

  function handleAdd() {
    if (!form.modality) {
      setFormError(tRad('radiologyOrders.validation.modalityRequired'));
      return;
    }
    const payload: CreateRadiologyOrderPayload = {
      patientId,
      encounterId,
      modality: form.modality,
      bodyPart: form.bodyPart.trim() || undefined,
      clinicalInfo: form.clinicalInfo.trim() || undefined,
      priority: form.priority || undefined,
      notes: form.notes.trim() || undefined,
    };
    create(payload, {
      onSuccess: () => {
        setForm(EMPTY_FORM);
        setShowForm(false);
        setFormError('');
      },
      onError: (e) => setFormError(getFriendlyApiErrorMessage(e, tRoot)),
    });
  }

  function handleCancel() {
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(false);
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {pendingReview.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/40 dark:bg-amber-950/10">
          <div className="mb-2 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                {tRad('radiologyOrders.pendingReview.heading')} ({pendingReview.length})
              </p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                {tRad('radiologyOrders.pendingReview.fromPreviousVisits')}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {pendingReview.map((order) => (
              <div key={order.id}>
                <p className="mb-1 ps-1 text-xs text-muted-foreground">
                  {tRad('radiologyOrders.pendingReview.ordered')}: {formatDateDisplay(order.createdAt)}
                </p>
                <OrderCard order={order} readOnly={false} />
              </div>
            ))}
          </div>
        </div>
      )}

      {orders.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">{tRad('radiologyOrders.empty')}</p>
      )}

      {orders.map((order) => (
        <OrderCard key={order.id} order={order} readOnly={readOnly} />
      ))}

      {!readOnly && (
        showForm ? (
          <div className="rounded-lg border border-dashed border-border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {tRad('radiologyOrders.fields.modalityLabel')}
                </label>
                <select
                  value={form.modality}
                  onChange={(e) => setField('modality', e.target.value)}
                  className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
                  autoFocus
                >
                  <option value="">{tRad('radiologyOrders.placeholders.selectModality')}</option>
                  {MODALITY_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {tRad(`radiologyOrders.modality.${m}` as Parameters<typeof tRad>[0])}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {tRad('radiologyOrders.fields.bodyPartLabel')}
                </label>
                <input
                  type="text"
                  dir="auto"
                  value={form.bodyPart}
                  onChange={(e) => setField('bodyPart', e.target.value)}
                  placeholder={tRad('radiologyOrders.placeholders.bodyPart')}
                  className={FIELD_CLASS}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {tRad('radiologyOrders.fields.priorityLabel')}
                </label>
                <select
                  value={form.priority}
                  onChange={(e) => setField('priority', e.target.value)}
                  className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
                >
                  <option value="">{tRad('radiologyOrders.placeholders.selectPriority')}</option>
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {tRad(`radiologyOrders.priority.${p}` as Parameters<typeof tRad>[0])}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {tRad('radiologyOrders.fields.clinicalInfoLabel')}
                </label>
                <input
                  type="text"
                  dir="auto"
                  value={form.clinicalInfo}
                  onChange={(e) => setField('clinicalInfo', e.target.value)}
                  placeholder={tRad('radiologyOrders.placeholders.clinicalInfo')}
                  className={FIELD_CLASS}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">
                  {tRad('radiologyOrders.fields.notesLabel')}
                </label>
                <input
                  type="text"
                  dir="auto"
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  placeholder={tRad('radiologyOrders.placeholders.notes')}
                  className={FIELD_CLASS}
                />
              </div>
            </div>

            {formError && (
              <p className="mt-2 text-xs text-destructive">{formError}</p>
            )}

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleAdd}
                disabled={creating}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? tRad('radiologyOrders.actions.adding') : tRad('radiologyOrders.actions.add')}
              </button>
              <button
                onClick={handleCancel}
                disabled={creating}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
              >
                {tCommon('actions.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            {tRad('radiologyOrders.addOrder')}
          </button>
        )
      )}
    </div>
  );
}
