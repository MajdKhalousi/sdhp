'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateAppointment, usePatientsList, useDoctorsList } from '@/hooks/use-appointments';
import { useCheckIn } from '@/hooks/use-queue';

interface Step1Form {
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  durationMin: string;
}

const INITIAL: Step1Form = {
  patientId: '',
  doctorId: '',
  scheduledAt: '',
  durationMin: '15',
};

export function WalkInWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<Step1Form>(INITIAL);
  const [validationError, setValidationError] = useState('');
  const [createdAppointmentId, setCreatedAppointmentId] = useState('');

  const { mutate: createAppt, isPending: creatingAppt, error: apptError } = useCreateAppointment();
  const { mutate: checkIn, isPending: checkingIn, error: checkInError } = useCheckIn();
  const { data: patientsData, isLoading: patientsLoading } = usePatientsList();
  const { data: doctorsData, isLoading: doctorsLoading } = useDoctorsList();

  function set(field: keyof Step1Form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setValidationError('');
    };
  }

  function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.patientId)  { setValidationError('Please select a patient.'); return; }
    if (!form.doctorId)   { setValidationError('Please select a doctor.'); return; }
    if (!form.scheduledAt){ setValidationError('Please set the appointment date and time.'); return; }
    const duration = parseInt(form.durationMin, 10);
    if (!duration || duration < 5) { setValidationError('Duration must be at least 5 minutes.'); return; }

    createAppt(
      {
        patientId: form.patientId,
        doctorId: form.doctorId,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMin: duration,
      },
      {
        onSuccess: (appt) => {
          setCreatedAppointmentId(appt.id);
          setStep(2);
        },
      },
    );
  }

  function handleCheckIn() {
    checkIn(
      { appointmentId: createdAppointmentId },
      { onSuccess: () => router.push('/dashboard/queue') },
    );
  }

  const apiError =
    (apptError instanceof Error ? apptError.message : null) ||
    (checkInError instanceof Error ? checkInError.message : null);
  const displayError = validationError || apiError;

  const stepIndicator = (
    <div className="mb-6 flex items-center gap-2">
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
          step === 1
            ? 'bg-primary text-primary-foreground'
            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        }`}
      >
        {step === 1 ? '1' : '✓'}
      </span>
      <span className={`text-sm font-medium ${step === 1 ? '' : 'text-muted-foreground'}`}>
        Create Appointment
      </span>
      <span className="text-muted-foreground">→</span>
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
          step === 2
            ? 'bg-primary text-primary-foreground'
            : 'border text-muted-foreground'
        }`}
      >
        2
      </span>
      <span className={`text-sm ${step === 2 ? 'font-medium' : 'text-muted-foreground'}`}>
        Check In
      </span>
    </div>
  );

  if (step === 2) {
    return (
      <div className="space-y-5">
        {stepIndicator}

        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-400">
          Appointment created successfully. Issue a queue ticket to check this patient in.
        </div>

        {displayError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {displayError}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleCheckIn}
            disabled={checkingIn}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checkingIn ? 'Checking in…' : 'Check In & Issue Ticket'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/queue')}
            disabled={checkingIn}
            className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleStep1Submit} className="space-y-5">
      {stepIndicator}

      {displayError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {displayError}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="wi-patientId">
          Patient <span className="text-destructive">*</span>
        </label>
        <select
          id="wi-patientId"
          value={form.patientId}
          onChange={set('patientId')}
          disabled={creatingAppt || patientsLoading}
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

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="wi-doctorId">
          Doctor <span className="text-destructive">*</span>
        </label>
        <select
          id="wi-doctorId"
          value={form.doctorId}
          onChange={set('doctorId')}
          disabled={creatingAppt || doctorsLoading}
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

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="wi-scheduledAt">
          Date &amp; Time <span className="text-destructive">*</span>
        </label>
        <input
          id="wi-scheduledAt"
          type="datetime-local"
          value={form.scheduledAt}
          onChange={set('scheduledAt')}
          disabled={creatingAppt}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="wi-durationMin">
          Duration (minutes) <span className="text-destructive">*</span>
        </label>
        <input
          id="wi-durationMin"
          type="number"
          min={5}
          step={5}
          value={form.durationMin}
          onChange={set('durationMin')}
          disabled={creatingAppt}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={creatingAppt}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creatingAppt ? 'Creating…' : 'Next: Check In →'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard/queue')}
          disabled={creatingAppt}
          className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
