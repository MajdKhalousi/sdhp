'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  useEncounterPrescriptions,
  useCreatePrescription,
  type CreatePrescriptionPayload,
} from '@/hooks/use-prescriptions';
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

  const { data, isLoading } = useEncounterPrescriptions(encounterId);
  const { mutate: create, isPending: creating } = useCreatePrescription();

  const prescriptions = data?.data ?? [];

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
      {prescriptions.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      )}

      {prescriptions.map((rx) => {
        const details = [rx.dosage, rx.frequency, rx.duration].filter(Boolean).join(' · ');
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
          </div>
        );
      })}

      {!readOnly && (
        showForm ? (
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
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('addMedication')}
          </button>
        )
      )}
    </div>
  );
}
