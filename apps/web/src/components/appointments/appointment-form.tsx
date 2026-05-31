'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useCreateAppointment, usePatientsList, useDoctorsList, useVisitTypesList } from '@/hooks/use-appointments';
import { VisitTypeSelect } from './visit-type-select';
import { AvailableSlotsPicker } from './available-slots-picker';
import type { VisitType } from '@/types/clinic-settings';

interface FormState {
  patientId: string;
  doctorId: string;
  date: string;
  visitTypeId: string;
  selectedSlot: string;
  notes: string;
}

const INITIAL: FormState = {
  patientId: '',
  doctorId: '',
  date: '',
  visitTypeId: '',
  selectedSlot: '',
  notes: '',
};

interface Props {
  initialPatientId?: string;
  initialDoctorId?: string;
  /** YYYY-MM-DD — pre-fills the date field */
  initialDate?: string;
  /** UUID of a visit type to pre-select */
  initialVisitTypeId?: string;
}

export function AppointmentForm({
  initialPatientId,
  initialDoctorId,
  initialDate,
  initialVisitTypeId,
}: Props = {}) {
  const t = useTranslations('appointment.form');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    ...INITIAL,
    patientId: initialPatientId ?? '',
    doctorId:  initialDoctorId  ?? '',
    date:      initialDate      ?? '',
    visitTypeId: initialVisitTypeId ?? '',
  });
  const [selectedVisitType, setSelectedVisitType] = useState<VisitType | null>(null);
  const [validationError, setValidationError] = useState('');

  const { mutate, isPending, error: mutationError } = useCreateAppointment();
  const { data: patientsData, isLoading: patientsLoading } = usePatientsList();
  const { data: doctorsData, isLoading: doctorsLoading } = useDoctorsList();
  const { data: visitTypesData } = useVisitTypesList();

  // Resolve the VisitType object for the pre-selected visit type once the list loads.
  // The ref prevents this from re-running after the user changes visit type manually.
  const visitTypeResolved = useRef(false);
  useEffect(() => {
    if (!initialVisitTypeId || !visitTypesData || visitTypeResolved.current) return;
    visitTypeResolved.current = true;
    const vt = visitTypesData.find((v) => v.id === initialVisitTypeId && v.isActive) ?? null;
    setSelectedVisitType(vt);
  }, [initialVisitTypeId, visitTypesData]);

  const selectedDoctor = doctorsData?.data.find((d) => d.id === form.doctorId) ?? null;
  const durationMin =
    selectedVisitType?.durationMinutes ??
    selectedDoctor?.consultationMinutes ??
    15;

  function handleDoctorChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const doctorId = e.target.value;
    setForm({ ...INITIAL, patientId: form.patientId, doctorId });
    setSelectedVisitType(null);
    setValidationError('');
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, date: e.target.value, selectedSlot: '' }));
    setValidationError('');
  }

  function handleVisitTypeChange(visitTypeId: string, vt: VisitType | null) {
    setForm((prev) => ({ ...prev, visitTypeId, selectedSlot: '' }));
    setSelectedVisitType(vt);
    setValidationError('');
  }

  function handleSlotSelect(time: string) {
    setForm((prev) => ({ ...prev, selectedSlot: time }));
    setValidationError('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.patientId)    { setValidationError(t('validation.patientRequired'));  return; }
    if (!form.doctorId)     { setValidationError(t('validation.doctorRequired'));   return; }
    if (!form.date)         { setValidationError(t('validation.dateTimeRequired')); return; }
    if (!form.selectedSlot) { setValidationError(t('validation.slotRequired'));     return; }

    const scheduledAt = new Date(`${form.date}T${form.selectedSlot}:00`).toISOString();

    mutate(
      {
        patientId: form.patientId,
        doctorId:  form.doctorId,
        scheduledAt,
        durationMin,
        ...(form.visitTypeId ? { visitTypeId: form.visitTypeId } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      },
      { onSuccess: () => router.push('/dashboard/appointments') },
    );
  }

  const apiError = mutationError instanceof Error ? mutationError.message : null;
  const displayError = validationError || apiError;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {displayError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {displayError}
        </div>
      )}

      {/* Patient */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="patientId">
          {t('fields.patientLabel')} <span className="text-destructive">*</span>
        </label>
        <select
          id="patientId"
          value={form.patientId}
          onChange={(e) => { setForm((prev) => ({ ...prev, patientId: e.target.value })); setValidationError(''); }}
          disabled={isPending || patientsLoading || !!initialPatientId}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
        >
          <option value="">{patientsLoading ? t('select.loadingPatients') : t('select.selectPatient')}</option>
          {patientsData?.data.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName} — {p.mrn}
            </option>
          ))}
        </select>
      </div>

      {/* Doctor */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="doctorId">
          {t('fields.doctorLabel')} <span className="text-destructive">*</span>
        </label>
        <select
          id="doctorId"
          value={form.doctorId}
          onChange={handleDoctorChange}
          disabled={isPending || doctorsLoading}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
        >
          <option value="">{doctorsLoading ? t('select.loadingDoctors') : t('select.selectDoctor')}</option>
          {doctorsData?.data.map((d) => (
            <option key={d.id} value={d.id}>
              Dr. {d.user.firstName} {d.user.lastName}
              {d.specialization ? ` — ${d.specialization}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Date */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="apptDate">
          {t('fields.dateLabel')} <span className="text-destructive">*</span>
        </label>
        <input
          id="apptDate"
          type="date"
          value={form.date}
          onChange={handleDateChange}
          disabled={isPending || !form.doctorId}
          dir="ltr"
          className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
      </div>

      {/* Visit Type */}
      <VisitTypeSelect
        value={form.visitTypeId}
        onChange={handleVisitTypeChange}
        disabled={isPending}
      />

      {/* Available Slots */}
      <AvailableSlotsPicker
        doctorId={form.doctorId}
        date={form.date}
        slotDurationMin={durationMin}
        selectedSlot={form.selectedSlot}
        onSelect={handleSlotSelect}
      />

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="notes">
          {t('fields.notesLabel')}{' '}
          <span className="text-xs text-muted-foreground">{t('fields.notesOptional')}</span>
        </label>
        <textarea
          id="notes"
          rows={3}
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          disabled={isPending}
          placeholder={t('fields.notesPlaceholder')}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? t('actions.submitting') : t('actions.submit')}
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard/appointments')}
          disabled={isPending}
          className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
        >
          {tCommon('actions.cancel')}
        </button>
      </div>
    </form>
  );
}
