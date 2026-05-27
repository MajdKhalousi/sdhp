'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import type { BadgeProps } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePatientLabOrders,
  useCreateLabOrder,
  type CreateLabOrderPayload,
} from '@/hooks/use-labs';
import type { LabOrderStatus } from '@/types/timeline';

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

interface Form {
  testName: string;
  testCode: string;
  priority: string;
  notes: string;
}

const EMPTY_FORM: Form = { testName: '', testCode: '', priority: '', notes: '' };

interface Props {
  patientId: string;
  encounterId: string;
  readOnly?: boolean;
}

export function LabOrderPanel({ patientId, encounterId, readOnly }: Props) {
  const t = useTranslations('timeline');
  const tLab = useTranslations('encounter');
  const tCommon = useTranslations('common');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const { data: allOrders = [], isLoading } = usePatientLabOrders(patientId);
  const { mutate: create, isPending: creating } = useCreateLabOrder();

  const orders = allOrders.filter((o) => o.encounterId === encounterId);

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
      priority: form.priority || undefined,
      notes: form.notes.trim() || undefined,
    };
    create(payload, {
      onSuccess: () => {
        setForm(EMPTY_FORM);
        setShowForm(false);
        setFormError('');
      },
      onError: (e) => setFormError(e instanceof Error ? e.message : tLab('labOrders.error.addFailed')),
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
      {orders.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">{tLab('labOrders.empty')}</p>
      )}

      {orders.map((order) => (
        <div
          key={order.id}
          className="flex items-start gap-3 rounded-lg border border-border bg-background px-4 py-3"
        >
          <div className="min-w-0 flex-1">
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
            {order.notes && (
              <p className="mt-0.5 text-xs italic text-muted-foreground">{order.notes}</p>
            )}
          </div>
        </div>
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
