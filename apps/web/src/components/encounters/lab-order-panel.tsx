'use client';

import { useState } from 'react';
import { AlertCircle, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import type { BadgeProps } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePatientLabOrders,
  useCreateLabOrder,
  useReviewLabResult,
  type CreateLabOrderPayload,
  type LabOrder,
  type LabResult,
} from '@/hooks/use-labs';
import type { LabOrderStatus } from '@/types/timeline';
import { formatDateDisplay } from '@/lib/format-date';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-messages';

const STATUS_VARIANT: Record<LabOrderStatus, BadgeProps['variant']> = {
  ORDERED:          'default',
  SAMPLE_COLLECTED: 'warning',
  IN_PROGRESS:      'warning',
  RESULTED:         'success',
  REVIEWED:         'success',
  CANCELLED:        'danger',
};

const PRIORITY_OPTIONS = ['ROUTINE', 'URGENT', 'STAT'] as const;

const FIELD_CLASS =
  'h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring';

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

interface OrderCardProps {
  order: LabOrder;
  readOnly?: boolean;
}

function OrderCard({ order, readOnly }: OrderCardProps) {
  const t = useTranslations('timeline');
  const tLab = useTranslations('encounter');
  const [reviewError, setReviewError] = useState('');
  const { mutate: review, isPending: reviewing } = useReviewLabResult();

  function handleReview() {
    setReviewError('');
    review(
      { labOrderId: order.id, patientId: order.patientId },
      { onError: (e) => setReviewError(e instanceof Error ? e.message : tLab('labOrders.error.reviewFailed')) },
    );
  }

  const canReview = !readOnly && order.status === 'RESULTED' && order.result !== null;

  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{order.testName}</p>
          {order.testCode && (
            <span className="font-mono text-xs text-muted-foreground" dir="ltr">
              ({order.testCode})
            </span>
          )}
          <Badge variant={STATUS_VARIANT[order.status]}>
            {t(`labOrderStatus.${order.status}` as Parameters<typeof t>[0])}
          </Badge>
        </div>
        {order.priority && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {(PRIORITY_OPTIONS as ReadonlyArray<string>).includes(order.priority)
              ? tLab(`labOrders.priority.${order.priority}` as Parameters<typeof tLab>[0])
              : order.priority}
          </p>
        )}
        {order.clinicalInfo && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-medium">{tLab('labOrders.fields.clinicalInfoLabel')}:</span> {order.clinicalInfo}
          </p>
        )}
        {order.notes && (
          <p className="mt-0.5 text-xs italic text-muted-foreground">{order.notes}</p>
        )}

        {order.result && <ResultSection result={order.result} />}

        {canReview && (
          <div className="mt-3">
            <button
              onClick={handleReview}
              disabled={reviewing}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-green-400 px-3 text-xs font-medium text-green-700 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950/30"
            >
              {reviewing
                ? tLab('labOrders.actions.reviewing')
                : tLab('labOrders.actions.review')}
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
  testName: string;
  testCode: string;
  clinicalInfo: string;
  priority: string;
  notes: string;
}

const EMPTY_FORM: Form = { testName: '', testCode: '', clinicalInfo: '', priority: '', notes: '' };

interface Props {
  patientId: string;
  encounterId: string;
  readOnly?: boolean;
}

export function LabOrderPanel({ patientId, encounterId, readOnly }: Props) {
  const tLab = useTranslations('encounter');
  const tCommon = useTranslations('common');
  const tRoot = useTranslations();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const { data: allOrders = [], isLoading } = usePatientLabOrders(patientId);
  const { mutate: create, isPending: creating } = useCreateLabOrder();

  const orders = allOrders.filter((o) => o.encounterId === encounterId);
  const pendingReview = allOrders.filter(
    (o) =>
      o.encounterId !== encounterId &&
      o.status === 'RESULTED' &&
      o.result !== null &&
      o.result.reviewedAt === null,
  );

  function setField(key: keyof Form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError('');
  }

  function handleAdd() {
    if (!form.testName.trim()) {
      setFormError(tLab('labOrders.validation.testNameRequired'));
      return;
    }
    const payload: CreateLabOrderPayload = {
      patientId,
      encounterId,
      testName: form.testName.trim(),
      testCode: form.testCode.trim() || undefined,
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
                {tLab('labOrders.pendingReview.heading')} ({pendingReview.length})
              </p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                {tLab('labOrders.pendingReview.fromPreviousVisits')}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {pendingReview.map((order) => (
              <div key={order.id}>
                <p className="mb-1 ps-1 text-xs text-muted-foreground">
                  {tLab('labOrders.pendingReview.ordered')}: {formatDateDisplay(order.createdAt)}
                </p>
                <OrderCard order={order} readOnly={false} />
              </div>
            ))}
          </div>
        </div>
      )}

      {orders.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">{tLab('labOrders.empty')}</p>
      )}

      {orders.map((order) => (
        <OrderCard key={order.id} order={order} readOnly={readOnly} />
      ))}

      {!readOnly && (
        showForm ? (
          <div className="rounded-lg border border-dashed border-border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">
                  {tLab('labOrders.fields.testNameLabel')}
                </label>
                <input
                  type="text"
                  dir="auto"
                  value={form.testName}
                  onChange={(e) => setField('testName', e.target.value)}
                  placeholder={tLab('labOrders.placeholders.testName')}
                  className={FIELD_CLASS}
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {tLab('labOrders.fields.testCodeLabel')}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={form.testCode}
                  onChange={(e) => setField('testCode', e.target.value)}
                  placeholder={tLab('labOrders.placeholders.testCode')}
                  className={FIELD_CLASS}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {tLab('labOrders.fields.priorityLabel')}
                </label>
                <select
                  value={form.priority}
                  onChange={(e) => setField('priority', e.target.value)}
                  className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
                >
                  <option value="">{tLab('labOrders.placeholders.selectPriority')}</option>
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {tLab(`labOrders.priority.${p}` as Parameters<typeof tLab>[0])}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">
                  {tLab('labOrders.fields.clinicalInfoLabel')}
                </label>
                <input
                  type="text"
                  dir="auto"
                  value={form.clinicalInfo}
                  onChange={(e) => setField('clinicalInfo', e.target.value)}
                  placeholder={tLab('labOrders.placeholders.clinicalInfo')}
                  className={FIELD_CLASS}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">
                  {tLab('labOrders.fields.notesLabel')}
                </label>
                <input
                  type="text"
                  dir="auto"
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  placeholder={tLab('labOrders.placeholders.notes')}
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
                {creating ? tLab('labOrders.actions.adding') : tLab('labOrders.actions.add')}
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
            {tLab('labOrders.addOrder')}
          </button>
        )
      )}
    </div>
  );
}
