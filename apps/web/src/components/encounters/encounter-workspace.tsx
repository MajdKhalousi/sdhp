'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AlertTriangle, Activity, FileText, Stethoscope, Pill, CheckCircle2, FlaskConical, Scan, ClipboardList, CalendarClock, Receipt } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useEncounter, useUpdateEncounter, useEncounters } from '@/hooks/use-encounters';
import { useAppointment, useVisitTypesList } from '@/hooks/use-appointments';
import { useAllergies } from '@/hooks/use-allergies';
import { usePatientInvoices } from '@/hooks/use-invoices';
import { useBillingPolicy } from '@/hooks/use-billing-policy';
import { InvoiceStatusBadge } from '@/components/billing/invoice-status-badge';
import { VitalsForm } from './vitals-form';
import { PrescriptionPanel } from './prescription-panel';
import { LabOrderPanel } from './lab-order-panel';
import { RadiologyOrderPanel } from './radiology-order-panel';
import { ClinicalReportPanel } from './clinical-report-panel';
import { PreviousEncounterPanel } from './previous-encounter-panel';
import { IcdCodeCombobox } from './icd-code-combobox';
import { ICD_CODES } from '@/lib/icd-codes';
import { FollowUpBookingPanel } from './follow-up-booking-panel';
import { EndEncounterButton } from './end-encounter-button';
import { CancelEncounterButton } from './cancel-encounter-button';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-messages';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { VitalsPayload, UpdateEncounterPayload } from '@/types/encounter';
import type { InvoiceStatus } from '@/types/invoice';
import { formatDateDisplay, formatDateTimeDisplay, formatTimeDisplay } from '@/lib/format-date';
import { formatAmount } from '@/lib/format-currency';
import { useAuthStore } from '@/store/auth';

interface WorkspaceForm {
  chiefComplaint: string;
  historyOfPresentIllness: string;
  notes: string;
  diagnosis: string;
  diagnosisCode: string;
  treatmentPlan: string;
  patientInstructions: string;
  followUpDate: string;
  vitals: VitalsPayload;
}

function toVitals(raw: Record<string, unknown> | null): VitalsPayload {
  if (!raw) return {};
  const s = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    temperature:      s(raw.temperature),
    bloodPressure:    s(raw.bloodPressure),
    heartRate:        s(raw.heartRate),
    oxygenSaturation: s(raw.oxygenSaturation),
    respiratoryRate:  s(raw.respiratoryRate),
    weight:           s(raw.weight),
    height:           s(raw.height),
  };
}


function formatVitalsSummary(vitals: VitalsPayload): string {
  const parts: string[] = [];
  if (vitals.bloodPressure)    parts.push(`BP ${vitals.bloodPressure}`);
  if (vitals.heartRate)        parts.push(`HR ${vitals.heartRate}`);
  if (vitals.temperature)      parts.push(`T ${vitals.temperature}`);
  if (vitals.oxygenSaturation) parts.push(`SpO2 ${vitals.oxygenSaturation}`);
  if (vitals.respiratoryRate)  parts.push(`RR ${vitals.respiratoryRate}`);
  if (vitals.weight)           parts.push(`Wt ${vitals.weight}`);
  if (vitals.height)           parts.push(`Ht ${vitals.height}`);
  return parts.join(' · ');
}

function QuickFillHint({
  previous,
  onUse,
}: {
  previous: string | null | undefined;
  onUse: () => void;
}) {
  const t = useTranslations('encounter');
  if (!previous?.trim()) return null;
  return (
    <div className="mt-1 flex items-center gap-2">
      <span className="shrink-0 text-xs text-muted-foreground">{t('quickFill.label')}</span>
      <span className="line-clamp-1 min-w-0 flex-1 text-xs text-muted-foreground" dir="auto">
        {previous}
      </span>
      <button
        type="button"
        onClick={onUse}
        className="shrink-0 text-xs font-medium text-primary hover:underline"
      >
        {t('quickFill.use')}
      </button>
    </div>
  );
}

const UNPAID_PRIORITY: Partial<Record<InvoiceStatus, number>> = {
  DRAFT:          0,
  ISSUED:         1,
  PARTIALLY_PAID: 2,
};

const BILLING_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'ACCOUNTANT', 'SECRETARY']);

function computeAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

function SectionHeading({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
      {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
      <h2 className="text-sm font-semibold text-foreground">{children}</h2>
    </div>
  );
}

function SoapSection({ letter, label }: { letter: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5 pt-1">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {letter}
      </span>
      <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

interface Props {
  encounterId: string;
  onDirtyChange?: (dirty: boolean) => void;
}

export function EncounterWorkspace({ encounterId, onDirtyChange }: Props) {
  const t = useTranslations('encounter');
  const tCommon = useTranslations('common');
  const tPatient = useTranslations('patient');
  const tRoot = useTranslations();
  const locale = useLocale();
  const { user } = useAuthStore();
  const canSeeBilling = user ? BILLING_ROLES.has(user.role) : false;

  function localizeGender(gender: string | null | undefined): string | null {
    if (!gender) return null;
    if (gender === 'MALE') return tPatient('gender.male');
    if (gender === 'FEMALE') return tPatient('gender.female');
    return tPatient('gender.other');
  }

  const { data: encounter, isLoading, isError, error, refetch } = useEncounter(encounterId);
  const { mutate: update, isPending: saving } = useUpdateEncounter();
  const { data: allergies = [] } = useAllergies(encounter?.patient.id ?? '');
  const { data: visitTypes } = useVisitTypesList();
  const { data: appointment } = useAppointment(encounter?.appointmentId ?? '');
  const appointmentVisitType = visitTypes?.find((vt) => vt.id === appointment?.visitTypeId) ?? null;
  const { data: patientInvoices } = usePatientInvoices(canSeeBilling ? (encounter?.patient.id ?? '') : '');
  const { data: policy } = useBillingPolicy({ enabled: canSeeBilling });
  const { data: prevList } = useEncounters(
    { patientId: encounter?.patient.id ?? '', limit: 7 },
    { enabled: !!encounter?.patient.id },
  );
  const unpaidInvoice = useMemo(() => {
    if (!patientInvoices) return null;
    return (
      patientInvoices
        .filter((inv) =>
          UNPAID_PRIORITY[inv.status] !== undefined &&
          !(inv.status === 'DRAFT' && parseFloat(inv.totalAmount) <= 0),
        )
        .sort((a, b) => (UNPAID_PRIORITY[a.status] ?? 99) - (UNPAID_PRIORITY[b.status] ?? 99))[0] ?? null
    );
  }, [patientInvoices]);

  const [form, setForm] = useState<WorkspaceForm | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [pendingComplete, setPendingComplete] = useState(false);

  // isDirtyRef: true when the user has unsaved edits; blocks server re-sync
  // so a background refetch never overwrites in-progress work.
  const isDirtyRef = useRef(false);

  useEffect(() => {
    if (!encounter || isDirtyRef.current) return;
    setForm({
      chiefComplaint:           encounter.chiefComplaint ?? '',
      historyOfPresentIllness:  encounter.historyOfPresentIllness ?? '',
      notes:                    encounter.notes ?? '',
      diagnosis:                encounter.diagnosis ?? '',
      diagnosisCode:            encounter.diagnosisCode ?? '',
      treatmentPlan:            encounter.treatmentPlan ?? '',
      patientInstructions:      encounter.patientInstructions ?? '',
      followUpDate:             encounter.followUpDate ? encounter.followUpDate.slice(0, 10) : '',
      vitals:                   toVitals(encounter.vitals as Record<string, unknown> | null),
    });
  }, [encounter]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  function setField<K extends keyof WorkspaceForm>(key: K, value: WorkspaceForm[K]) {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
    isDirtyRef.current = true;
    setIsDirty(true);
    onDirtyChange?.(true);
    setSavedAt(null);
    setSaveError('');
  }

  function handleSave(onSaved?: () => void) {
    if (!form || saving) return; // guard against double-submit
    setSaveError('');

    const payload: UpdateEncounterPayload = {
      chiefComplaint:          form.chiefComplaint.trim(),
      historyOfPresentIllness: form.historyOfPresentIllness.trim(),
      notes:                   form.notes.trim(),
      diagnosis:               form.diagnosis.trim(),
      diagnosisCode:           form.diagnosisCode.trim(),
      treatmentPlan:           form.treatmentPlan.trim(),
      patientInstructions:     form.patientInstructions.trim(),
      followUpDate:            form.followUpDate || undefined,
      vitals:                  Object.values(form.vitals).some(Boolean) ? form.vitals : {},
    };

    update(
      { id: encounterId, payload },
      {
        onSuccess: () => {
          isDirtyRef.current = false;
          setIsDirty(false);
          onDirtyChange?.(false);
          setSavedAt(formatTimeDisplay(new Date()));
          onSaved?.();
        },
        onError: (e) => setSaveError(getFriendlyApiErrorMessage(e, tRoot)),
      },
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (isError || !encounter) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-16 text-center">
        <p className="text-sm font-medium text-destructive">{t('error.loadFailed')}</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          {error instanceof Error ? error.message : t('error.notFound')}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-1 h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
        >
          {tCommon('actions.tryAgain')}
        </button>
      </div>
    );
  }

  if (!form) return null;

  const { patient, doctor } = encounter;
  const isEnded = !!encounter.endedAt;
  const ENCOUNTER_EDIT_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR']);
  const canEdit = ENCOUNTER_EDIT_ROLES.has(user?.role ?? '');
  const readOnly = isEnded || saving || !canEdit;
  const prevEncounters = (prevList?.data ?? []).filter((e) => e.id !== encounterId);
  const findPreviousTextValue = (
    key: 'chiefComplaint' | 'historyOfPresentIllness' | 'diagnosis' | 'treatmentPlan',
  ): string | null => {
    for (const e of prevEncounters) {
      const v = e[key];
      if (v?.trim()) return v;
    }
    return null;
  };
  const prevVitalsSource = prevEncounters.find((e) =>
    Object.values(toVitals(e.vitals as Record<string, unknown> | null)).some(Boolean),
  ) ?? null;
  const previousVitals = prevVitalsSource
    ? toVitals(prevVitalsSource.vitals as Record<string, unknown> | null)
    : null;
  const prevHasVitals = !!previousVitals && Object.values(previousVitals).some(Boolean);
  const currentVitalsEmpty = Object.values(form.vitals).every((v) => !v);
  const warnItems: string[] = [];
  if (!form.chiefComplaint.trim()) warnItems.push(t('liveStatus.chiefComplaint'));
  if (!form.diagnosis.trim())      warnItems.push(t('liveStatus.diagnosis'));
  if (currentVitalsEmpty)          warnItems.push(t('liveStatus.vitals'));
  const openWarnCount = warnItems.length;
  const prevCC            = !readOnly ? findPreviousTextValue('chiefComplaint') : null;
  const prevHPI           = !readOnly ? findPreviousTextValue('historyOfPresentIllness') : null;
  const prevDiagnosis     = !readOnly ? findPreviousTextValue('diagnosis') : null;
  const prevTreatmentPlan = !readOnly ? findPreviousTextValue('treatmentPlan') : null;
  const patientAge = computeAge(patient.dateOfBirth);
  const visitTypeName = appointmentVisitType
    ? ((locale === 'ar' && appointmentVisitType.nameAr) || appointmentVisitType.name)
    : null;
  const isFollowUpVisit =
    appointmentVisitType?.code === 'FOLLOW_UP' ||
    /follow[- ]?up|followup|recheck/i.test(appointmentVisitType?.name ?? '') ||
    /مراجعة|متابعة/.test(appointmentVisitType?.nameAr ?? '');
  const invoiceCreateHref = encounter.appointmentId
    ? `/dashboard/invoices/new?appointmentId=${encounter.appointmentId}&patientId=${patient.id}`
    : `/dashboard/invoices/new?patientId=${patient.id}&encounterId=${encounter.id}`;
  const severeAllergies = allergies.filter((a) => a.severity === 'SEVERE');
  const otherAllergies = allergies.filter((a) => a.severity !== 'SEVERE');
  const selectedIcdEntry = ICD_CODES.find((e) => e.code === form.diagnosisCode.trim()) ?? null;

  return (
    <div className="space-y-6">
      {/* ── Patient / header card ───────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              <Link href={`/dashboard/patients/${patient.id}`} className="hover:underline">
                {patient.firstName} {patient.lastName}
              </Link>
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('header.mrn')} {patient.mrn}
              {patientAge !== null && ` · ${patientAge} ${t('header.ageYears')}`}
              {patient.gender && ` · ${localizeGender(patient.gender)}`}
              {visitTypeName && (
                <>{' · '}<span className="font-medium text-foreground">{visitTypeName}</span></>
              )}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('header.doctorPrefix')} {doctor.user.firstName} {doctor.user.lastName}
              {doctor.specialization && ` · ${doctor.specialization}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-end text-xs text-muted-foreground">
            <Badge variant={isEnded ? 'success' : 'warning'}>
              {isEnded ? t('status.completed') : t('status.inProgress')}
            </Badge>
            <span>{t('timestamps.started')} {formatDateTimeDisplay(encounter.startedAt ?? encounter.createdAt)}</span>
            {isEnded && (
              <span>
                {t('timestamps.ended')}{' '}
                <span className="font-medium text-foreground">
                  {formatDateTimeDisplay(encounter.endedAt)}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Inactive patient banner ─────────────────────────────────────── */}
      {patient.isActive === false && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-xs font-semibold text-red-700 dark:text-red-400">{t('patient.inactive')}</p>
        </div>
      )}

      {/* ── Allergies banners ───────────────────────────────────────────── */}
      {severeAllergies.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 dark:border-red-800/50 dark:bg-red-950/30">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-red-700 dark:text-red-400">{t('allergies.severeHeading')}</p>
            <p className="mt-0.5 text-xs text-red-700/80 dark:text-red-400/80">
              {severeAllergies.map((a, i) => (
                <span key={a.id}>
                  {i > 0 && <span className="mx-1.5">·</span>}
                  {a.substance}
                </span>
              ))}
            </p>
          </div>
        </div>
      )}
      {otherAllergies.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-900/40 dark:bg-orange-950/20">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
          <div>
            <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">{t('allergies.heading')}</p>
            <p className="mt-0.5 text-xs text-orange-700/80 dark:text-orange-400/80">
              {otherAllergies.map((a, i) => {
                const sev =
                  a.severity === 'MILD'     ? t('allergies.severity.mild')
                  : a.severity === 'MODERATE' ? t('allergies.severity.moderate')
                  : null;
                return (
                  <span key={a.id}>
                    {i > 0 && <span className="mx-1.5">·</span>}
                    {a.substance}
                    {sev && (
                      <span className="ms-1 font-medium text-orange-700 dark:text-orange-400">({sev})</span>
                    )}
                  </span>
                );
              })}
            </p>
          </div>
        </div>
      )}

      {/* ── Chronic diseases banner ─────────────────────────────────────── */}
      {patient.chronicDiseases && (
        <div className="flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-900/40 dark:bg-orange-950/20">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
          <div>
            <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">
              {tPatient('safety.chronicDiseases')}
            </p>
            <p className="mt-0.5 text-xs text-orange-700/80 dark:text-orange-400/80" dir="auto">
              {patient.chronicDiseases}
            </p>
          </div>
        </div>
      )}

      {/* ── Unpaid invoice banner ────────────────────────────────────────── */}
      {canSeeBilling && unpaidInvoice && (() => {
        const remaining = Math.max(
          0,
          parseFloat(unpaidInvoice.totalAmount) - parseFloat(unpaidInvoice.paidAmount),
        );
        const requiresPayment = policy?.requirePaymentBeforeEncounter === true;
        const containerCls = requiresPayment
          ? 'border-destructive/30 bg-destructive/5'
          : 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20';
        const textCls = requiresPayment
          ? 'text-destructive'
          : 'text-amber-700 dark:text-amber-400';
        const subTextCls = requiresPayment
          ? 'text-destructive/80'
          : 'text-amber-700/80 dark:text-amber-400/80';
        return (
          <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 ${containerCls}`}>
            {requiresPayment
              ? <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${textCls}`} />
              : <Receipt className={`mt-0.5 h-4 w-4 shrink-0 ${textCls}`} />
            }
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-semibold ${textCls}`}>
                {t('billing.unpaidWarningTitle')}
              </p>
              {requiresPayment && (
                <p className={`mt-0.5 text-xs ${subTextCls}`}>
                  {t('billing.paymentRequiredPolicy')}
                </p>
              )}
              <div className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${subTextCls}`}>
                <span>{t('billing.invoiceNumber')} <span dir="ltr" className="font-mono">{unpaidInvoice.invoiceNumber}</span></span>
                <InvoiceStatusBadge status={unpaidInvoice.status} />
                <span>{t('billing.total')} {formatAmount(parseFloat(unpaidInvoice.totalAmount), locale)}</span>
                <span>{t('billing.paid')} {formatAmount(parseFloat(unpaidInvoice.paidAmount), locale)}</span>
                <span>{t('billing.remaining')} {formatAmount(remaining, locale)}</span>
              </div>
              <div className="mt-1.5">
                <Link
                  href={`/dashboard/invoices/${unpaidInvoice.id}`}
                  className={`text-xs font-medium underline hover:no-underline ${textCls}`}
                >
                  {t('billing.viewInvoice')}
                </Link>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Previous encounters ─────────────────────────────────────────── */}
      <PreviousEncounterPanel
        patientId={patient.id}
        currentEncounterId={encounterId}
        defaultOpen={isFollowUpVisit}
      />

      {/* ── S — Subjective ──────────────────────────────────────────────── */}
      <SoapSection letter="S" label={t('soap.subjective')} />
      <div className="rounded-xl border border-border bg-card p-5">
        <SectionHeading icon={FileText}>{t('sections.clinicalNotes')}</SectionHeading>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="chiefComplaint">
              {t('fields.chiefComplaintLabel')}
            </label>
            {!readOnly && (
              <p className="text-xs text-muted-foreground">{t('followUpContext.ccHint')}</p>
            )}
            <input
              id="chiefComplaint"
              type="text"
              dir="auto"
              value={form.chiefComplaint}
              onChange={(e) => setField('chiefComplaint', e.target.value)}
              placeholder={t('fields.chiefComplaintPlaceholder')}
              disabled={readOnly}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
            {!readOnly && !form.chiefComplaint && (
              <QuickFillHint
                previous={prevCC}
                onUse={() => { if (prevCC) setField('chiefComplaint', prevCC); }}
              />
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="historyOfPresentIllness">
              {t('fields.hpiLabel')}
            </label>
            <textarea
              id="historyOfPresentIllness"
              rows={3}
              dir="auto"
              value={form.historyOfPresentIllness}
              onChange={(e) => setField('historyOfPresentIllness', e.target.value)}
              placeholder={t('fields.hpiPlaceholder')}
              disabled={readOnly}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
            {!readOnly && !form.historyOfPresentIllness && (
              <QuickFillHint
                previous={prevHPI}
                onUse={() => { if (prevHPI) setField('historyOfPresentIllness', prevHPI); }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── O — Objective ───────────────────────────────────────────────── */}
      <SoapSection letter="O" label={t('soap.objective')} />
      <div className="rounded-xl border border-border bg-card p-5">
        <SectionHeading icon={Activity}>{t('sections.vitals')}</SectionHeading>
        {!readOnly && currentVitalsEmpty && prevHasVitals && previousVitals && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
            <span className="shrink-0 text-xs text-muted-foreground">{t('quickFill.lastVitals')}</span>
            <span className="flex-1 truncate text-xs text-muted-foreground" dir="ltr">
              {formatVitalsSummary(previousVitals)}
            </span>
            <button
              type="button"
              onClick={() => {
                const merged: VitalsPayload = { ...form.vitals };
                (Object.keys(previousVitals) as (keyof VitalsPayload)[]).forEach((k) => {
                  if (previousVitals[k] && !merged[k]) merged[k] = previousVitals[k];
                });
                setField('vitals', merged);
              }}
              className="shrink-0 text-xs font-medium text-primary hover:underline"
            >
              {t('quickFill.copyAll')}
            </button>
          </div>
        )}
        <VitalsForm
          vitals={form.vitals}
          onChange={(v) => setField('vitals', v)}
          disabled={readOnly}
        />
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <SectionHeading icon={FileText}>{t('sections.examination')}</SectionHeading>
        <textarea
          id="notes"
          rows={4}
          dir="auto"
          value={form.notes}
          onChange={(e) => setField('notes', e.target.value)}
          placeholder={t('fields.examinationPlaceholder')}
          disabled={readOnly}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
      </div>

      {/* ── A — Assessment ──────────────────────────────────────────────── */}
      <SoapSection letter="A" label={t('soap.assessment')} />
      <div className="rounded-xl border border-border bg-card p-5">
        <SectionHeading icon={Stethoscope}>{t('sections.assessment')}</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="diagnosis">
              {t('fields.diagnosisLabel')}
            </label>
            <input
              id="diagnosis"
              type="text"
              dir="auto"
              value={form.diagnosis}
              onChange={(e) => setField('diagnosis', e.target.value)}
              placeholder={t('fields.diagnosisPlaceholder')}
              disabled={readOnly}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
            {!readOnly && !form.diagnosis && (
              <QuickFillHint
                previous={prevDiagnosis}
                onUse={() => { if (prevDiagnosis) setField('diagnosis', prevDiagnosis); }}
              />
            )}
            {!readOnly && selectedIcdEntry && form.diagnosis.trim() !== selectedIcdEntry.description && (
              <div className="mt-1 flex items-center gap-2">
                <span className="line-clamp-1 min-w-0 flex-1 text-xs text-muted-foreground" dir="ltr">
                  {selectedIcdEntry.description}
                </span>
                <button
                  type="button"
                  onClick={() => setField('diagnosis', selectedIcdEntry.description)}
                  className="shrink-0 text-xs font-medium text-primary hover:underline"
                >
                  {form.diagnosis.trim() ? t('icdLookup.replaceDiagnosis') : t('icdLookup.useAsDiagnosis')}
                </button>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="diagnosisCode">
              {t('fields.icdCodeLabel')}
            </label>
            <IcdCodeCombobox
              id="diagnosisCode"
              value={form.diagnosisCode}
              onChange={(v) => setField('diagnosisCode', v)}
              readOnly={readOnly}
              placeholder={t('icdLookup.placeholder')}
            />
          </div>
        </div>
      </div>

      {/* ── P — Plan ────────────────────────────────────────────────────── */}
      <SoapSection letter="P" label={t('soap.plan')} />
      <div className="rounded-xl border border-border bg-card p-5">
        <SectionHeading icon={ClipboardList}>{t('sections.plan')}</SectionHeading>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="treatmentPlan">
              {t('fields.treatmentPlanLabel')}
            </label>
            <textarea
              id="treatmentPlan"
              rows={3}
              dir="auto"
              value={form.treatmentPlan}
              onChange={(e) => setField('treatmentPlan', e.target.value)}
              placeholder={t('fields.treatmentPlanPlaceholder')}
              disabled={readOnly}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
            {!readOnly && !form.treatmentPlan && (
              <QuickFillHint
                previous={prevTreatmentPlan}
                onUse={() => { if (prevTreatmentPlan) setField('treatmentPlan', prevTreatmentPlan); }}
              />
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="patientInstructions">
              {t('fields.patientInstructionsLabel')}
            </label>
            <textarea
              id="patientInstructions"
              rows={3}
              dir="auto"
              value={form.patientInstructions}
              onChange={(e) => setField('patientInstructions', e.target.value)}
              placeholder={t('fields.patientInstructionsPlaceholder')}
              disabled={readOnly}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="followUpDate">
              {t('fields.followUpDateLabel')}
            </label>
            <input
              id="followUpDate"
              type="date"
              dir="ltr"
              value={form.followUpDate}
              onChange={(e) => setField('followUpDate', e.target.value)}
              disabled={readOnly}
              className="h-9 w-48 rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
            {form.followUpDate &&
             form.followUpDate !== (encounter.followUpDate?.slice(0, 10) ?? '') &&
             !isEnded && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {t('followUpBooking.saveToBecomeActive')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Follow-up appointment booking ───────────────────────────────── */}
      {encounter.followUpDate && (
        <div className="rounded-xl border border-border bg-card p-5">
          <SectionHeading icon={CalendarClock}>{t('sections.followUpBooking')}</SectionHeading>
          <FollowUpBookingPanel
            encounterId={encounterId}
            patientId={encounter.patient.id}
            defaultDoctorId={encounter.doctorId}
            followUpDate={encounter.followUpDate}
          />
        </div>
      )}

      {/* ── Prescriptions ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <SectionHeading icon={Pill}>{t('sections.prescriptions')}</SectionHeading>
        <PrescriptionPanel encounterId={encounterId} readOnly={readOnly} />
      </div>

      {/* ── Lab Orders ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <SectionHeading icon={FlaskConical}>{t('sections.labOrders')}</SectionHeading>
        <LabOrderPanel
          patientId={encounter.patient.id}
          encounterId={encounterId}
          readOnly={readOnly}
        />
      </div>

      {/* ── Radiology Orders ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <SectionHeading icon={Scan}>{t('sections.radiology')}</SectionHeading>
        <RadiologyOrderPanel
          patientId={encounter.patient.id}
          encounterId={encounterId}
          readOnly={readOnly}
        />
      </div>

      {/* ── Clinical Report ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <SectionHeading icon={FileText}>{t('sections.clinicalReport')}</SectionHeading>
        <ClinicalReportPanel
          encounterId={encounterId}
          patientId={encounter.patient.id}
          encounterData={{
            chiefComplaint: form.chiefComplaint,
            historyOfPresentIllness: form.historyOfPresentIllness,
            notes: form.notes,
            diagnosis: form.diagnosis,
            treatmentPlan: form.treatmentPlan,
            patientInstructions: form.patientInstructions,
            followUpDate: form.followUpDate,
          }}
          readOnly={readOnly}
        />
      </div>

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <div className={`rounded-xl border border-border bg-card p-5 ${!isEnded ? 'sticky bottom-4 shadow-lg' : ''}`}>
        {isEnded ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
              <p className="text-sm font-semibold text-foreground">{t('complete.heading')}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">{t('complete.diagnosisLabel')}</p>
                <p className="mt-0.5 text-sm font-medium">
                  {encounter.diagnosis || '—'}
                  {encounter.diagnosisCode && (
                    <span className="ms-1.5 font-mono text-xs text-muted-foreground" dir="ltr">
                      ({encounter.diagnosisCode})
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('complete.followUpLabel')}</p>
                <p className="mt-0.5 text-sm font-medium">
                  {encounter.followUpDate ? formatDateTimeDisplay(encounter.followUpDate) : t('complete.notScheduled')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('complete.endedLabel')}</p>
                <p className="mt-0.5 text-sm font-medium">{formatDateTimeDisplay(encounter.endedAt)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t('complete.readOnly')}</p>

            {/* ── Billing follow-up ──────────────────────────────────────── */}
            {canSeeBilling && patientInvoices !== undefined && (
              <div className="border-t border-border pt-3">
                {unpaidInvoice ? (
                  <div className="flex items-start gap-2">
                    <Receipt className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                        {t('billing.billingFollowUp')}
                      </p>
                      <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400/80">
                        {t('billing.unpaidWarningTitle')} ·{' '}
                        <span dir="ltr" className="font-mono">{unpaidInvoice.invoiceNumber}</span>
                      </p>
                      <Link
                        href={`/dashboard/invoices/${unpaidInvoice.id}`}
                        className="mt-1 inline-block text-xs font-medium text-amber-700 underline hover:no-underline dark:text-amber-400"
                      >
                        {t('billing.viewInvoice')}
                      </Link>
                    </div>
                  </div>
                ) : patientInvoices.length === 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <Receipt className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                      <p className="text-xs text-muted-foreground">{t('billing.billingFollowUp')}</p>
                    </div>
                    <Link
                      href={invoiceCreateHref}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {t('billing.createOrCheckInvoice')}
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
                    <span>{t('billing.billingSettled')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            {canEdit && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSave()}
                  disabled={saving}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? t('actions.saving') : t('actions.saveChanges')}
                </button>
                {isDirty && (
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    {t('actions.unsavedChanges')}
                  </span>
                )}
                {!isDirty && savedAt && (
                  <span className="text-xs text-muted-foreground">
                    {t('actions.savedAt', { time: savedAt })}
                  </span>
                )}
                {saveError && (
                  <span className="text-xs text-destructive">{saveError}</span>
                )}
              </div>
            )}

            {canEdit && openWarnCount > 0 && (
              <div
                className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400"
                title={warnItems.join('\n')}
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{t('liveStatus.itemsToDocument', { count: openWarnCount })}</span>
              </div>
            )}

            {canEdit && isDirty && !pendingComplete && (
              <button
                onClick={() => handleSave(() => setPendingComplete(true))}
                disabled={saving}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-green-600 px-4 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-green-700 dark:hover:bg-green-600"
              >
                {saving ? t('actions.saving') : t('actions.saveAndComplete')}
              </button>
            )}

            {canEdit && !isEnded && (
              <CancelEncounterButton
                encounterId={encounterId}
                disabled={saving}
              />
            )}

            {canEdit && (!isDirty || pendingComplete) && (
              <EndEncounterButton
                encounterId={encounterId}
                patientId={encounter.patient.id}
                alreadyEnded={isEnded}
                disabled={isDirty || saving}
                disabledReason={isDirty ? t('actions.saveBeforeClosing') : undefined}
                completionContext={{
                  chiefComplaint:          form.chiefComplaint,
                  historyOfPresentIllness: form.historyOfPresentIllness,
                  notes:                   form.notes,
                  diagnosis:               form.diagnosis,
                  treatmentPlan:           form.treatmentPlan,
                  patientInstructions:     form.patientInstructions,
                  followUpDate:            form.followUpDate,
                  vitalsEmpty:             Object.values(form.vitals).every((v) => !v),
                  hasUnpaidInvoice:        !!unpaidInvoice,
                }}
                confirmOpen={pendingComplete}
                onConfirmClose={() => setPendingComplete(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
