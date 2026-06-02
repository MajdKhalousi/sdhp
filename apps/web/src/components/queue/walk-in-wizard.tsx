'use client';

import { useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useCreateAppointment, usePatientsList, useDoctorsList, useVisitTypesList } from '@/hooks/use-appointments';
import { useCheckIn } from '@/hooks/use-queue';

interface Step1Form {
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  durationMin: string;
  visitTypeId: string;
}

function nowDateTimeLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

const INITIAL: Step1Form = {
  patientId: '',
  doctorId: '',
  scheduledAt: '',
  durationMin: '15',
  visitTypeId: '',
};

export function WalkInWizard() {
  const t = useTranslations('queue.walkIn');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const locale = useLocale();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<Step1Form>(() => ({ ...INITIAL, scheduledAt: nowDateTimeLocal() }));
  const [patientSearch, setPatientSearch] = useState('');
  const [validationError, setValidationError] = useState('');
  const [createdAppointmentId, setCreatedAppointmentId] = useState('');

  const { mutate: createAppt, isPending: creatingAppt, error: apptError } = useCreateAppointment();
  const [checkInConflict, setCheckInConflict] = useState(false);
  const { mutate: checkIn, isPending: checkingIn, error: checkInError } = useCheckIn();
  const { data: patientsData, isLoading: patientsLoading } = usePatientsList();
  const { data: doctorsData, isLoading: doctorsLoading } = useDoctorsList();
  const { data: visitTypesData, isLoading: visitTypesLoading } = useVisitTypesList();

  const activePatients = (patientsData?.data ?? []).filter((p) => p.isActive);
  const activeDoctors  = (doctorsData?.data  ?? []).filter((d) => d.isActive !== false);
  const activeVisitTypes = (visitTypesData ?? []).filter((vt) => vt.isActive);

  const searchNorm = patientSearch.toLowerCase().replace(/\s+/g, ' ').trim();
  const filteredPatients = searchNorm
    ? activePatients.filter((p) => {
        const full = `${p.firstName} ${p.lastName}`.toLowerCase();
        const rev  = `${p.lastName} ${p.firstName}`.toLowerCase();
        return (
          full.includes(searchNorm) ||
          rev.includes(searchNorm) ||
          (p.mrn ?? '').toLowerCase().includes(searchNorm) ||
          (p.phone ?? '').includes(patientSearch.trim())
        );
      })
    : activePatients;

  function set(field: keyof Step1Form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setValidationError('');
    };
  }

  function handlePatientSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPatientSearch(e.target.value);
    setForm((prev) => ({ ...prev, patientId: '' }));
    setValidationError('');
  }

  function handleDoctorChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const doctorId = e.target.value;
    const doc = doctorsData?.data.find((d) => d.id === doctorId);
    setForm((prev) => ({
      ...prev,
      doctorId,
      durationMin: doc ? String(doc.consultationMinutes) : prev.durationMin,
    }));
    setValidationError('');
  }

  function handleNow() {
    setForm((prev) => ({ ...prev, scheduledAt: nowDateTimeLocal() }));
    setValidationError('');
  }

  function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.patientId)   { setValidationError(t('validation.patientRequired'));  return; }
    if (!form.doctorId)    { setValidationError(t('validation.doctorRequired'));   return; }
    if (!form.scheduledAt) { setValidationError(t('validation.dateTimeRequired')); return; }
    const duration = parseInt(form.durationMin, 10);
    if (!duration || duration < 5) { setValidationError(t('validation.durationMinimum')); return; }

    createAppt(
      {
        patientId: form.patientId,
        doctorId: form.doctorId,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMin: duration,
        ...(form.visitTypeId ? { visitTypeId: form.visitTypeId } : {}),
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
    setCheckInConflict(false);
    checkIn(
      { appointmentId: createdAppointmentId },
      {
        onSuccess: () => router.push('/dashboard/queue'),
        onError: (e) => {
          if (e instanceof Error && e.name === 'ConflictError') {
            setCheckInConflict(true);
          }
        },
      },
    );
  }

  const apptApiError = apptError instanceof Error ? apptError.message : null;
  const checkInApiError =
    checkInError instanceof Error && !checkInConflict ? checkInError.message : null;
  const apiError = apptApiError || checkInApiError;
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
        {t('steps.createAppointment')}
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
        {t('steps.checkIn')}
      </span>
    </div>
  );

  if (step === 2) {
    return (
      <div className="space-y-5">
        {stepIndicator}

        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-400">
          {t('booked')}
        </div>

        {displayError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {displayError}
          </div>
        )}

        {checkInConflict && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-400">
            {t('conflict')}{' '}
            <Link
              href="/dashboard/queue"
              locale={locale}
              className="font-medium underline hover:no-underline"
            >
              {t('actions.viewQueue')}
            </Link>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleCheckIn}
            disabled={checkingIn || checkInConflict}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checkingIn ? t('actions.checkingIn') : t('actions.checkIn')}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/queue')}
            disabled={checkingIn}
            className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
          >
            {t('actions.backToQueue')}
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

      {/* Patient search + select */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="wi-patientId">
          {t('fields.patientLabel')} <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={patientSearch}
          onChange={handlePatientSearchChange}
          disabled={creatingAppt || patientsLoading}
          placeholder={t('fields.patientSearchPlaceholder')}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
        <select
          id="wi-patientId"
          value={form.patientId}
          onChange={set('patientId')}
          disabled={creatingAppt || patientsLoading}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
        >
          <option value="">{patientsLoading ? t('select.loadingPatients') : t('select.selectPatient')}</option>
          {filteredPatients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName} — {p.mrn}
            </option>
          ))}
        </select>
      </div>

      {/* Doctor */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="wi-doctorId">
          {t('fields.doctorLabel')} <span className="text-destructive">*</span>
        </label>
        <select
          id="wi-doctorId"
          value={form.doctorId}
          onChange={handleDoctorChange}
          disabled={creatingAppt || doctorsLoading}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
        >
          <option value="">{doctorsLoading ? t('select.loadingDoctors') : t('select.selectDoctor')}</option>
          {activeDoctors.map((d) => (
            <option key={d.id} value={d.id}>
              Dr. {d.user.firstName} {d.user.lastName}
              {d.specialization ? ` — ${d.specialization}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Visit Type (optional) */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="wi-visitTypeId">
          {t('fields.visitTypeLabel')}{' '}
          <span className="text-xs text-muted-foreground">{t('fields.visitTypeOptional')}</span>
        </label>
        <select
          id="wi-visitTypeId"
          value={form.visitTypeId}
          onChange={set('visitTypeId')}
          disabled={creatingAppt || visitTypesLoading}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
        >
          <option value="">
            {visitTypesLoading ? t('select.loadingVisitTypes') : t('select.selectVisitType')}
          </option>
          {activeVisitTypes.map((vt) => {
            const name = locale === 'ar' && vt.nameAr ? vt.nameAr : vt.name;
            const price = vt.basePrice
              ? `${parseFloat(vt.basePrice).toLocaleString(locale === 'ar' ? 'ar-u-nu-latn' : 'en-US')} SYP`
              : null;
            const label = [name, price, `${vt.durationMinutes} min`].filter(Boolean).join(' — ');
            return (
              <option key={vt.id} value={vt.id}>
                {label}
              </option>
            );
          })}
        </select>
      </div>

      {/* Date & Time with Now button */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="wi-scheduledAt">
          {t('fields.dateTimeLabel')} <span className="text-destructive">*</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            id="wi-scheduledAt"
            type="datetime-local"
            value={form.scheduledAt}
            onChange={set('scheduledAt')}
            disabled={creatingAppt}
            className="h-9 flex-1 rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
          <button
            type="button"
            onClick={handleNow}
            disabled={creatingAppt}
            className="h-9 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
          >
            {t('actions.setNow')}
          </button>
        </div>
      </div>

      {/* Duration */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="wi-durationMin">
          {t('fields.durationLabel')} <span className="text-destructive">*</span>
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
          {creatingAppt ? t('actions.booking') : t('actions.next')}
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard/queue')}
          disabled={creatingAppt}
          className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
        >
          {tCommon('actions.cancel')}
        </button>
      </div>
    </form>
  );
}
