'use client';

import { useState } from 'react';
import { Plus, Trash2, ClipboardList, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  useEncounterPrescriptions,
  useCreatePrescription,
  useDeletePrescription,
  type CreatePrescriptionPayload,
} from '@/hooks/use-prescriptions';
import { usePrescriptionTemplates } from '@/hooks/use-prescription-templates';
import type { PrescriptionTemplate } from '@/types/prescription-templates';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  encounterId: string;
  readOnly?: boolean;
}

interface PrescriptionForm {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const EMPTY_FORM: PrescriptionForm = {
  medication: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: '',
};

const FIELD_CLASS =
  'h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring';

export function PrescriptionPanel({ encounterId, readOnly }: Props) {
  const t = useTranslations('encounter.prescription');
  const tCommon = useTranslations('common');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PrescriptionForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const [pickerOpen, setPickerOpen] = useState(false);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState('');

  const { data, isLoading } = useEncounterPrescriptions(encounterId);
  const { mutate: create, mutateAsync: createAsync, isPending: creating } = useCreatePrescription();
  const { mutate: deletePrescription, isPending: deleting } = useDeletePrescription();
  const {
    data: templatesData,
    isLoading: templatesLoading,
    isError: templatesIsError,
    error: templatesErrorObj,
    refetch: refetchTemplates,
  } = usePrescriptionTemplates();

  const prescriptions = data?.data ?? [];
  const templates = templatesData ?? [];

  function setField(key: keyof PrescriptionForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError('');
  }

  function handleAdd() {
    if (!form.medication.trim()) {
      setFormError(t('validation.medicationRequired'));
      return;
    }
    const payload: CreatePrescriptionPayload = {
      encounterId,
      medication: form.medication.trim(),
      dosage: form.dosage.trim() || undefined,
      frequency: form.frequency.trim() || undefined,
      duration: form.duration.trim() || undefined,
      instructions: form.instructions.trim() || undefined,
    };
    create(payload, {
      onSuccess: () => {
        setForm(EMPTY_FORM);
        setShowForm(false);
        setFormError('');
      },
      onError: (e) => setFormError(e instanceof Error ? e.message : t('error.addFailed')),
    });
  }

  function handleCancel() {
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(false);
  }

  function openPicker() {
    setPickerOpen(true);
    setExpandedTemplateId(null);
    setApplyError('');
  }

  function closePicker() {
    setPickerOpen(false);
    setExpandedTemplateId(null);
    setApplyError('');
  }

  async function handleApplyTemplate(template: PrescriptionTemplate) {
    setApplyError('');
    setApplying(true);
    let done = 0;
    const total = template.items.length;
    try {
      for (const item of template.items) {
        const payload: CreatePrescriptionPayload = {
          encounterId,
          medication: item.medication,
          dosage: item.dosage ?? undefined,
          frequency: item.frequency ?? undefined,
          duration: item.duration ?? undefined,
          instructions: item.instructions ?? undefined,
          quantity: item.quantity ?? undefined,
          refillsLeft: item.refillsLeft ?? undefined,
        };
        try {
          await createAsync(payload);
          done += 1;
        } catch (err) {
          const detail = err instanceof Error ? err.message : t('template.error');
          setApplyError(
            `${t('template.appliedPartial', { done, total, medication: item.medication })} ${detail}`,
          );
          return;
        }
      }
      closePicker();
    } finally {
      setApplying(false);
    }
  }

  function handleDelete(id: string) {
    setDeleteError('');
    deletePrescription(
      { id, encounterId },
      {
        onSuccess: () => setConfirmDeleteId(null),
        onError: (e) => {
          setDeleteError(e instanceof Error ? e.message : t('error.deleteFailed'));
          setConfirmDeleteId(null);
        },
      },
    );
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
      {deleteError && (
        <p className="text-xs text-destructive">{deleteError}</p>
      )}

      {prescriptions.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      )}

      {prescriptions.map((rx) => {
        const details = [rx.dosage, rx.frequency, rx.duration].filter(Boolean).join(' · ');
        const isConfirming = confirmDeleteId === rx.id;
        return (
          <div
            key={rx.id}
            className="flex items-start gap-3 rounded-lg border border-border bg-background px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{rx.medication}</p>
              {details && (
                <p className="mt-0.5 text-xs text-muted-foreground">{details}</p>
              )}
              {rx.instructions && (
                <p className="mt-0.5 text-xs italic text-muted-foreground">{rx.instructions}</p>
              )}
            </div>

            {!readOnly && (
              isConfirming ? (
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="text-xs text-muted-foreground">{t('deleteConfirm')}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDelete(rx.id)}
                      disabled={deleting}
                      className="inline-flex h-7 items-center rounded-md bg-destructive px-2.5 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-60"
                    >
                      {deleting ? t('deleting') : t('confirmRemove')}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={deleting}
                      className="inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
                    >
                      {tCommon('actions.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(rx.id)}
                  className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label={t('deleteConfirm')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )
            )}
          </div>
        );
      })}

      {!readOnly && !showForm && !pickerOpen && (
        <div className="mt-1 flex items-center gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('addMedication')}
          </button>
          <button
            onClick={openPicker}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            {t('applyTemplate')}
          </button>
        </div>
      )}

      {!readOnly && showForm && (
        <div className="rounded-lg border border-dashed border-border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">
                {t('fields.medicationLabel')} *
              </label>
              <input
                type="text"
                value={form.medication}
                onChange={(e) => setField('medication', e.target.value)}
                placeholder={t('placeholders.medication')}
                className={FIELD_CLASS}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t('fields.dosageLabel')}
              </label>
              <input
                type="text"
                value={form.dosage}
                onChange={(e) => setField('dosage', e.target.value)}
                placeholder={t('placeholders.dosage')}
                className={FIELD_CLASS}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t('fields.frequencyLabel')}
              </label>
              <input
                type="text"
                value={form.frequency}
                onChange={(e) => setField('frequency', e.target.value)}
                placeholder={t('placeholders.frequency')}
                className={FIELD_CLASS}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t('fields.durationLabel')}
              </label>
              <input
                type="text"
                value={form.duration}
                onChange={(e) => setField('duration', e.target.value)}
                placeholder={t('placeholders.duration')}
                className={FIELD_CLASS}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t('fields.instructionsLabel')}
              </label>
              <input
                type="text"
                value={form.instructions}
                onChange={(e) => setField('instructions', e.target.value)}
                placeholder={t('placeholders.instructions')}
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
              {creating ? t('adding') : t('addMedication')}
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
      )}

      {!readOnly && pickerOpen && (
        <div className="rounded-lg border border-dashed border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">{t('template.heading')}</p>
            <button
              onClick={closePicker}
              disabled={applying}
              className="inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
            >
              {tCommon('actions.cancel')}
            </button>
          </div>

          {templatesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : templatesIsError ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">{t('template.loadFailed')}</p>
              <p className="text-xs text-muted-foreground">
                {templatesErrorObj instanceof Error ? templatesErrorObj.message : ''}
              </p>
              <button
                onClick={() => refetchTemplates()}
                className="h-7 rounded-md border px-2.5 text-xs font-medium transition-colors hover:bg-accent"
              >
                {tCommon('actions.tryAgain')}
              </button>
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('template.empty')}</p>
          ) : (
            <div className="space-y-2">
              {templates.map((tpl) => {
                const isExpanded = expandedTemplateId === tpl.id;
                return (
                  <div key={tpl.id} className="rounded-md border border-border">
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedTemplateId(isExpanded ? null : tpl.id);
                        setApplyError('');
                      }}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start transition-colors hover:bg-accent"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{tpl.name}</p>
                        {tpl.nameAr && (
                          <p className="text-xs text-muted-foreground" dir="rtl">{tpl.nameAr}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {t('template.itemCount', { count: tpl.items.length })}
                        </p>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="space-y-2 border-t border-border p-3">
                        <ul className="space-y-1">
                          {tpl.items.map((item, i) => {
                            const details = [item.dosage, item.frequency, item.duration]
                              .filter(Boolean)
                              .join(' · ');
                            return (
                              <li key={i} className="text-sm">
                                <span className="font-medium">{item.medication}</span>
                                {details && (
                                  <span className="text-xs text-muted-foreground"> — {details}</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>

                        {applyError && (
                          <p className="text-xs text-destructive">{applyError}</p>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApplyTemplate(tpl)}
                            disabled={applying}
                            className="inline-flex h-7 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {applying ? t('template.applying') : t('template.apply')}
                          </button>
                          <button
                            onClick={() => setExpandedTemplateId(null)}
                            disabled={applying}
                            className="inline-flex h-7 items-center rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
                          >
                            {tCommon('actions.cancel')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
