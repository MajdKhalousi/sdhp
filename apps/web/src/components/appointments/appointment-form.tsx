'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateAppointment, usePatientsList, useDoctorsList } from '@/hooks/use-appointments';

interface FormState {
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  durationMin: string;
  notes: string;
}

const INITIAL: FormState = {
  patientId: '',
  doctorId: '',
  scheduledAt: '',
  durationMin: '15',
  notes: '',
};

export function AppointmentForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [validationError, setValidationError] = useState('');

  const { mutate, isPending, error: mutationError } = useCreateAppointment();
  const { data: patientsData, isLoading: patientsLoading } = usePatientsList();
  const { data: doctorsData, isLoading: doctorsLoading } = useDoctorsList();

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setValidationError('');
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.patientId) { setValidationError('Please select a patient.'); return; }
    if (!form.doctorId)  { setValidationError('Please select a doctor.');  return; }
    if (!form.scheduledAt) { setValidationError('Please set the appointment date and time.'); return; }

    const duration = parseInt(form.durationMin, 10);
    if (!duration || duration < 5) { setValidationError('Duration must be at least 5 minutes.'); return; }

    mutate(
      {
        patientId: form.patientId,
        doctorId: form.doctorId,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMin: duration,
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
          Patient <span className="text-destructive">*</span>
        </label>
        <select
          id="patientId"
          value={form.patientId}
          onChange={set('patientId')}
          disabled={isPending || patientsLoading}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
        >
          <option value="">{patientsLoading ? 'Loading patients…' : 'Select a patient'}</option>
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
          Doctor <span className="text-destructive">*</span>
        </label>
        <select
          id="doctorId"
          value={form.doctorId}
          onChange={set('doctorId')}
          disabled={isPending || doctorsLoading}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
        >
          <option value="">{doctorsLoading ? 'Loading doctors…' : 'Select a doctor'}</option>
          {doctorsData?.data.map((d) => (
            <option key={d.id} value={d.id}>
              Dr. {d.user.firstName} {d.user.lastName}
              {d.specialization ? ` — ${d.specialization}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Scheduled At */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="scheduledAt">
          Date &amp; Time <span className="text-destructive">*</span>
        </label>
        <input
          id="scheduledAt"
          type="datetime-local"
          value={form.scheduledAt}
          onChange={set('scheduledAt')}
          disabled={isPending}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
      </div>

      {/* Duration */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="durationMin">
          Duration (minutes) <span className="text-destructive">*</span>
        </label>
        <input
          id="durationMin"
          type="number"
          min={5}
          step={5}
          value={form.durationMin}
          onChange={set('durationMin')}
          disabled={isPending}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="notes">
          Notes <span className="text-muted-foreground text-xs">(optional)</span>
        </label>
        <textarea
          id="notes"
          rows={3}
          value={form.notes}
          onChange={set('notes')}
          disabled={isPending}
          placeholder="Add any relevant notes…"
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
          {isPending ? 'Creating…' : 'Create Appointment'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard/appointments')}
          disabled={isPending}
          className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
