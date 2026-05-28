'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useCreateInvoice } from '@/hooks/use-invoices';
import { usePatientsList } from '@/hooks/use-appointments';
import type { CreateInvoiceDto } from '@/types/invoice';

export function CreateInvoiceForm() {
  const t = useTranslations('invoice.form');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [patientId, setPatientId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState('');

  const { data: patientsData, isLoading: patientsLoading } = usePatientsList();
  const patients = patientsData?.data ?? [];

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

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">
          {t('fields.patient')} <span className="text-destructive">*</span>
        </label>
        <select
          value={patientId}
          onChange={(e) => {
            setPatientId(e.target.value);
            setValidationError('');
          }}
          disabled={isPending || patientsLoading}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
        >
          <option value="">{t('fields.patientPlaceholder')}</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName} — {p.mrn}
            </option>
          ))}
        </select>
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
