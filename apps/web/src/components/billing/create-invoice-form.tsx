'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useCreateInvoice } from '@/hooks/use-invoices';
import { usePatientsList, useAppointment, useVisitTypesList } from '@/hooks/use-appointments';
import { useBillingPolicy } from '@/hooks/use-billing-policy';
import { PatientCombobox } from '@/components/appointments/patient-combobox';
import type { CreateInvoiceDto } from '@/types/invoice';

interface Props {
  initialPatientId?: string;
  appointmentId?: string;
  encounterId?: string;
}

export function CreateInvoiceForm({ initialPatientId, appointmentId, encounterId }: Props = {}) {
  const t = useTranslations('invoice.form');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [patientId, setPatientId] = useState(initialPatientId ?? '');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState('');

  const { data: policy } = useBillingPolicy();
  const policyApplied = useRef(false);

  useEffect(() => {
    if (policyApplied.current) return;
    const days = policy?.defaultDueDateDays;
    if (!days || days <= 0) return;
    policyApplied.current = true;
    const base = new Date(Date.now() + 3 * 60 * 60 * 1000);
    base.setUTCDate(base.getUTCDate() + days);
    const m = String(base.getUTCMonth() + 1).padStart(2, '0');
    const d = String(base.getUTCDate()).padStart(2, '0');
    setDueDate(`${base.getUTCFullYear()}-${m}-${d}`);
  }, [policy]);

  const { data: patientsData, isLoading: patientsLoading } = usePatientsList();
  const patients = patientsData?.data ?? [];

  const locale = useLocale();
  const { data: appointmentData } = useAppointment(appointmentId ?? '');
  const { data: visitTypes } = useVisitTypesList();
  const apptVisitType = appointmentId && appointmentData?.visitTypeId
    ? (visitTypes?.find((vt) => vt.id === appointmentData.visitTypeId) ?? null)
    : null;
  const apptVisitTypeName = apptVisitType
    ? (locale === 'ar' && apptVisitType.nameAr ? apptVisitType.nameAr : apptVisitType.name)
    : null;

  const { mutate, isPending, error: mutationError } = useCreateInvoice();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!patientId) {
      setValidationError(t('validation.patientRequired'));
      return;
    }

    setValidationError('');

    const dto: CreateInvoiceDto = {
      patientId,
      ...(appointmentId ? { appointmentId } : {}),
      ...(encounterId && !appointmentId ? { encounterId } : {}),
      ...(dueDate ? { dueDate: `${dueDate}T00:00:00.000Z` } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    mutate(dto, {
      onSuccess: (invoice) => {
        router.push(`/dashboard/invoices/${invoice.id}`);
      },
    });
  }

  const apiError = mutationError instanceof Error ? mutationError.message : null;
  const displayError = validationError || apiError;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {displayError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {displayError}
        </div>
      )}

      {appointmentId && appointmentData && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-900/40 dark:bg-blue-950/30">
          <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">
            {t('appointmentContext.title')}
          </p>
          <p className="mt-0.5 text-xs text-blue-700 dark:text-blue-400">
            {'Dr. '}{appointmentData.doctor.user.firstName}{' '}{appointmentData.doctor.user.lastName}
          </p>
          {apptVisitType?.basePrice ? (
            <p className="mt-0.5 text-xs text-blue-700 dark:text-blue-400">
              {apptVisitTypeName}{' — '}{parseFloat(apptVisitType.basePrice).toLocaleString()}{' SYP · '}{t('appointmentContext.visitTypeFeeAutoFill')}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-blue-700 dark:text-blue-400">
              {t('appointmentContext.noVisitTypeFee')}
            </p>
          )}
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">
          {t('fields.patient')} <span className="text-destructive">*</span>
        </label>
        <PatientCombobox
          patients={patients}
          value={patientId}
          onChange={(id) => {
            setPatientId(id);
            setValidationError('');
          }}
          disabled={isPending || patientsLoading || !!initialPatientId}
          placeholder={t('fields.patientPlaceholder')}
          noResultsText={t('fields.patientNoResults')}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">
          {t('fields.dueDate')}
        </label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          disabled={isPending}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">
          {t('fields.notes')}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isPending}
          placeholder={t('fields.notesPlaceholder')}
          rows={3}
          className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending || patientsLoading}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? t('actions.creating') : t('actions.create')}
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard/invoices')}
          disabled={isPending}
          className="h-9 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
        >
          {tCommon('actions.cancel')}
        </button>
      </div>
    </form>
  );
}
