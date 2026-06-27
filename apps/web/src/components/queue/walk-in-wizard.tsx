'use client';

import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useCreateAppointment, usePatientsList, useDoctorsList, useVisitTypesList } from '@/hooks/use-appointments';
import { useCheckIn } from '@/hooks/use-queue';
import { PatientCombobox } from '@/components/appointments/patient-combobox';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-messages';
import { formatAmount } from '@/lib/format-currency';
import { InvoiceStatusBadge } from '@/components/billing/invoice-status-badge';
import { PaymentCollectionOverlay } from '@/components/billing/payment-collection-overlay';
import type { PaymentReadiness } from '@/types/queue';

interface WalkInWizardProps {
  initialPatientId?: string;
  onClose?: () => void;
}

interface Step1Form {
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  durationMin: string;
  visitTypeId: string;
}

const WALK_IN_WINDOW_MS = 2 * 60 * 60 * 1000;

function damascusDateTimeLocalAt(ms: number): string {
  const d = new Date(ms + 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function nowDamascusDateTimeLocal(): string {
  return damascusDateTimeLocalAt(Date.now());
}

const INITIAL: Step1Form = {
  patientId: '',
  doctorId: '',
  scheduledAt: '',
  durationMin: '15',
  visitTypeId: '',
};

type GateState =
  | { kind: 'closed' }
  | { kind: 'unpaid'; readiness: PaymentReadiness }
  | { kind: 'unknown' }
  | { kind: 'collecting'; readiness: PaymentReadiness };

export function WalkInWizard({ initialPatientId, onClose }: WalkInWizardProps = {}) {
  const t = useTranslations('queue.walkIn');
  const tQueue = useTranslations('queue');
  const tGate = useTranslations('queue.paymentGate');
  const tCommon = useTranslations('common');
  const tRoot = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const qc = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<Step1Form>(() => ({
    ...INITIAL,
    scheduledAt: nowDamascusDateTimeLocal(),
    patientId: initialPatientId ?? '',
  }));
  const [validationError, setValidationError] = useState('');
  const [initialPatientError, setInitialPatientError] = useState('');
  const [createdAppointmentId, setCreatedAppointmentId] = useState('');

  const { mutate: createAppt, isPending: creatingAppt, error: apptError } = useCreateAppointment();
  const [checkInConflict, setCheckInConflict] = useState(false);
  const [gate, setGate] = useState<GateState>({ kind: 'closed' });
  // autoInvalidate is disabled here for the same reason as CheckInButton — invalidating
  // ['queue']/['appointments'] immediately would refetch before the payment gate panel
  // below has a chance to show. Invalidation happens manually in resolveGate.
  const { mutate: checkIn, isPending: checkingIn, error: checkInError } = useCheckIn({ autoInvalidate: false });
  const { data: patientsData, isLoading: patientsLoading } = usePatientsList();
  const { data: doctorsData, isLoading: doctorsLoading } = useDoctorsList();
  const { data: visitTypesData, isLoading: visitTypesLoading } = useVisitTypesList();

  const activePatients = (patientsData?.data ?? []).filter((p) => p.isActive);
  const activeDoctors  = (doctorsData?.data  ?? []).filter((d) => d.isActive !== false);
  const activeVisitTypes = (visitTypesData ?? []).filter((vt) => vt.isActive);

  const initialCheckDone = useRef(false);
  useEffect(() => {
    if (!initialPatientId || initialCheckDone.current || patientsLoading) return;
    initialCheckDone.current = true;
    const found = activePatients.some((p) => p.id === initialPatientId);
    if (!found) {
      setForm((prev) => ({ ...prev, patientId: '' }));
      setInitialPatientError(t('validation.patientNotFound'));
    }
  }, [patientsLoading, activePatients, initialPatientId, t]);

  function set(field: keyof Step1Form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setValidationError('');
    };
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
    setForm((prev) => ({ ...prev, scheduledAt: nowDamascusDateTimeLocal() }));
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
        scheduledAt: new Date(`${form.scheduledAt}:00+03:00`).toISOString(),
        durationMin: duration,
        isWalkIn: true,
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

  function resolveGate() {
    setGate({ kind: 'closed' });
    qc.invalidateQueries({ queryKey: ['queue'] });
    qc.invalidateQueries({ queryKey: ['appointments'] });
    onClose ? onClose() : router.push('/dashboard/queue');
  }

  function handleCheckIn() {
    setCheckInConflict(false);
    checkIn(
      { appointmentId: createdAppointmentId },
      {
        onSuccess: (result) => {
          const readiness = result.paymentReadiness;
          if (readiness.readiness === 'DEPOSIT_UNPAID' || readiness.readiness === 'FULL_UNPAID') {
            setGate({ kind: 'unpaid', readiness });
          } else if (readiness.readiness === 'READINESS_UNKNOWN') {
            setGate({ kind: 'unknown' });
          } else {
            resolveGate();
          }
        },
        onError: (e) => {
          if (e instanceof Error && e.name === 'ConflictError') {
            setCheckInConflict(true);
          }
        },
      },
    );
  }

  const apptApiError = apptError ? getFriendlyApiErrorMessage(apptError, tRoot) : null;
  const checkInApiError =
    checkInError && !checkInConflict ? getFriendlyApiErrorMessage(checkInError, tRoot) : null;
  const apiError = apptApiError || checkInApiError;
  const displayError = validationError || apiError;

  const bookedPatient = activePatients.find((p) => p.id === form.patientId) ?? null;
  const bookedDoctor  = activeDoctors.find((d) => d.id === form.doctorId)   ?? null;
  const bookedVisitType = form.visitTypeId
    ? (activeVisitTypes.find((vt) => vt.id === form.visitTypeId) ?? null)
    : null;
  const bookedVisitTypeName = bookedVisitType
    ? (locale === 'ar' && bookedVisitType.nameAr ? bookedVisitType.nameAr : bookedVisitType.name)
    : null;

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

        {bookedPatient && bookedDoctor && (
          <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-muted-foreground">{t('fields.patientLabel')}</span>
                <span className="font-medium">{bookedPatient.firstName} {bookedPatient.lastName}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-muted-foreground">{t('fields.doctorLabel')}</span>
                <span className="font-medium">{tQueue('doctorPrefix')}{bookedDoctor.user.firstName} {bookedDoctor.user.lastName}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-muted-foreground">{t('fields.dateTimeLabel')}</span>
                <span className="font-medium" dir="ltr">{form.scheduledAt.replace('T', ' ')}</span>
              </div>
              {bookedVisitTypeName && (
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-muted-foreground">{t('fields.visitTypeLabel')}</span>
                  <span className="font-medium">{bookedVisitTypeName}</span>
                </div>
              )}
            </div>
          </div>
        )}

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

        {gate.kind === 'closed' && (
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
              onClick={() => onClose ? onClose() : router.push('/dashboard/queue')}
              disabled={checkingIn}
              className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
            >
              {t('actions.backToQueue')}
            </button>
          </div>
        )}

        {gate.kind === 'unpaid' && (
          <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
            <p className="font-semibold text-amber-800 dark:text-amber-300">{tGate('title')}</p>
            <div className="space-y-1 text-amber-900/80 dark:text-amber-200/80">
              {gate.readiness.requiredAmount !== null && (
                <p>
                  {tGate('requiredAmount')}:{' '}
                  <span dir="ltr">{formatAmount(gate.readiness.requiredAmount, locale)}</span>
                </p>
              )}
              <p>
                {tGate('paidAmount')}:{' '}
                <span dir="ltr">{formatAmount(gate.readiness.paidAmount, locale)}</span>
              </p>
              {gate.readiness.remainingAmount !== null && (
                <p>
                  {tGate('remainingAmount')}:{' '}
                  <span dir="ltr">{formatAmount(gate.readiness.remainingAmount, locale)}</span>
                </p>
              )}
              {gate.readiness.invoiceStatus && (
                <p className="flex items-center gap-1.5">
                  <span>{tGate('invoiceStatus')}:</span>
                  <InvoiceStatusBadge status={gate.readiness.invoiceStatus} />
                </p>
              )}
              {!gate.readiness.invoiceId && (
                <p className="text-amber-700/70 dark:text-amber-400/70">{tGate('noInvoiceAvailable')}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {gate.readiness.invoiceId && (
                <button
                  type="button"
                  onClick={() => setGate({ kind: 'collecting', readiness: gate.readiness })}
                  className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {tGate('collectPaymentNow')}
                </button>
              )}
              <button
                type="button"
                onClick={resolveGate}
                className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent"
              >
                {tGate('continueWithoutPayment')}
              </button>
            </div>
          </div>
        )}

        {gate.kind === 'collecting' && gate.readiness.invoiceId && (
          <PaymentCollectionOverlay
            invoiceId={gate.readiness.invoiceId}
            onSuccess={resolveGate}
            onCancel={() => setGate({ kind: 'unpaid', readiness: gate.readiness })}
          />
        )}

        {gate.kind === 'unknown' && (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-semibold">{tGate('unknownTitle')}</p>
            <p className="text-muted-foreground">{tGate('unknownBody')}</p>
            <button
              type="button"
              onClick={resolveGate}
              className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              {tGate('continueWithoutPayment')}
            </button>
          </div>
        )}
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

      {initialPatientError && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-400">
          {initialPatientError}
        </div>
      )}

      {/* Patient */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="wi-patientId">
          {t('fields.patientLabel')} <span className="text-destructive">*</span>
        </label>
        <PatientCombobox
          id="wi-patientId"
          patients={activePatients}
          value={form.patientId}
          onChange={(patientId) => { setForm((prev) => ({ ...prev, patientId })); setValidationError(''); }}
          disabled={creatingAppt || patientsLoading}
          placeholder={patientsLoading ? t('select.loadingPatients') : t('select.selectPatient')}
          noResultsText={t('select.noPatients')}
        />
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
              {tQueue('doctorPrefix')}{d.user.firstName} {d.user.lastName}
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
            min={damascusDateTimeLocalAt(Date.now() - WALK_IN_WINDOW_MS)}
            max={damascusDateTimeLocalAt(Date.now() + WALK_IN_WINDOW_MS)}
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
        <p className="text-xs text-muted-foreground">{t('fields.dateTimeHint')}</p>
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
          onClick={() => onClose ? onClose() : router.push('/dashboard/queue')}
          disabled={creatingAppt}
          className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
        >
          {tCommon('actions.cancel')}
        </button>
      </div>
    </form>
  );
}
