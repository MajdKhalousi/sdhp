'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, Activity, FileText, Stethoscope, Pill, CheckCircle2, FlaskConical, Scan, ClipboardList, ChevronRight } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useEncounter, useUpdateEncounter } from '@/hooks/use-encounters';
import { useVisitTypesList } from '@/hooks/use-appointments';
import { useAllergies } from '@/hooks/use-allergies';
import { VitalsForm } from './vitals-form';
import { PrescriptionPanel } from './prescription-panel';
import { LabOrderPanel } from './lab-order-panel';
import { RadiologyOrderPanel } from './radiology-order-panel';
import { ClinicalReportPanel } from './clinical-report-panel';
import { EndEncounterButton } from './end-encounter-button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { VitalsPayload, UpdateEncounterPayload } from '@/types/encounter';

interface WorkspaceForm {
  chiefComplaint: string;
  notes: string;
  diagnosis: string;
  diagnosisCode: string;
  treatmentPlan: string;
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

function formatDate(iso: string | null, locale = 'en-US') {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string | null, locale = 'en-US') {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(locale, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
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

interface Props {
  encounterId: string;
  onDirtyChange?: (dirty: boolean) => void;
}

export function EncounterWorkspace({ encounterId, onDirtyChange }: Props) {
  const t = useTranslations('encounter');
  const tCommon = useTranslations('common');
  const tPatient = useTranslations('patient');
  const locale = useLocale();
  const displayLocale = locale === 'ar' ? 'ar-SY' : 'en-US';

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
  const followUpVisitType = visitTypes?.find((vt) => vt.code === 'FOLLOW_UP' && vt.isActive) ?? null;

  const [form, setForm] = useState<WorkspaceForm | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // isDirtyRef: true when the user has unsaved edits; blocks server re-sync
  // so a background refetch never overwrites in-progress work.
  const isDirtyRef = useRef(false);

  useEffect(() => {
    if (!encounter || isDirtyRef.current) return;
    setForm({
      chiefComplaint: encounter.chiefComplaint ?? '',
      notes:          encounter.notes ?? '',
      diagnosis:      encounter.diagnosis ?? '',
      diagnosisCode:  encounter.diagnosisCode ?? '',
      treatmentPlan:  encounter.treatmentPlan ?? '',
      followUpDate:   encounter.followUpDate ? encounter.followUpDate.slice(0, 10) : '',
      vitals:         toVitals(encounter.vitals as Record<string, unknown> | null),
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

  function handleSave() {
    if (!form || saving) return; // guard against double-submit
    setSaveError('');

    const payload: UpdateEncounterPayload = {
      chiefComplaint: form.chiefComplaint.trim(),
      notes:          form.notes.trim(),
      diagnosis:      form.diagnosis.trim(),
      diagnosisCode:  form.diagnosisCode.trim(),
      treatmentPlan:  form.treatmentPlan.trim(),
      followUpDate:   form.followUpDate || undefined,
      vitals:         Object.values(form.vitals).some(Boolean) ? form.vitals : {},
    };

    update(
      { id: encounterId, payload },
      {
        onSuccess: () => {
          isDirtyRef.current = false;
          setIsDirty(false);
          onDirtyChange?.(false);
          setSavedAt(new Date().toLocaleTimeString(displayLocale, { hour: 'numeric', minute: '2-digit' }));
        },
        onError: (e) => setSaveError(e instanceof Error ? e.message : 'Save failed'),
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
  const readOnly = isEnded || saving;

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
              {patient.dateOfBirth && ` · ${t('header.dob')} ${formatDate(patient.dateOfBirth, displayLocale)}`}
              {patient.gender && ` · ${localizeGender(patient.gender)}`}
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
            <span>{t('timestamps.started')} {formatDateTime(encounter.startedAt ?? encounter.createdAt, displayLocale)}</span>
            {isEnded && <span>{t('timestamps.ended')} {formatDateTime(encounter.endedAt, displayLocale)}</span>}
          </div>
        </div>
      </div>

      {/* ── Allergies banner ────────────────────────────────────────────── */}
      {allergies.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-900/40 dark:bg-orange-950/20">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
          <div>
            <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">{t('allergies.heading')}</p>
            <p className="mt-0.5 text-xs text-orange-700/80 dark:text-orange-400/80">
              {allergies.map((a, i) => {
                const sev =
                  a.severity === 'MILD'     ? t('allergies.severity.mild')
                  : a.severity === 'MODERATE' ? t('allergies.severity.moderate')
                  : a.severity === 'SEVERE'   ? t('allergies.severity.severe')
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

      {/* ── Clinical ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <SectionHeading icon={FileText}>{t('sections.clinicalNotes')}</SectionHeading>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="chiefComplaint">
              {t('fields.chiefComplaintLabel')}
            </label>
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
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="notes">
              {t('fields.examinationLabel')}
            </label>
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
        </div>
      </div>

      {/* ── Vitals ──────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <SectionHeading icon={Activity}>{t('sections.vitals')}</SectionHeading>
        <VitalsForm
          vitals={form.vitals}
          onChange={(v) => setField('vitals', v)}
          disabled={readOnly}
        />
      </div>

      {/* ── Diagnosis & Treatment ────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <SectionHeading icon={Stethoscope}>{t('sections.diagnosisAndTreatment')}</SectionHeading>
        <div className="space-y-4">
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
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="diagnosisCode">
                {t('fields.icdCodeLabel')}
              </label>
              <input
                id="diagnosisCode"
                type="text"
                dir="ltr"
                value={form.diagnosisCode}
                onChange={(e) => setField('diagnosisCode', e.target.value)}
                placeholder={t('fields.icdCodePlaceholder')}
                disabled={readOnly}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm font-mono outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
              />
            </div>
          </div>
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
          </div>
        </div>
      </div>

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
        <SectionHeading icon={ClipboardList}>{t('sections.clinicalReport')}</SectionHeading>
        <ClinicalReportPanel
          encounterId={encounterId}
          patientId={encounter.patient.id}
          encounterData={{
            chiefComplaint: form.chiefComplaint,
            notes: form.notes,
            diagnosis: form.diagnosis,
            treatmentPlan: form.treatmentPlan,
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
                {encounter.followUpDate ? (
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">
                      {formatDateTime(encounter.followUpDate, displayLocale)}
                    </p>
                    <Link
                      href={`/dashboard/appointments/new?patientId=${encounter.patientId}&doctorId=${encounter.doctorId}&followUpDate=${encounter.followUpDate.slice(0, 10)}${followUpVisitType ? `&visitTypeId=${followUpVisitType.id}` : ''}`}
                      className="inline-flex h-6 items-center gap-1 rounded border border-primary/40 px-2 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
                    >
                      {t('complete.bookFollowUp')}
                      <ChevronRight className="h-3 w-3 rtl:rotate-180" />
                    </Link>
                  </div>
                ) : (
                  <p className="mt-0.5 text-sm font-medium">{t('complete.notScheduled')}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('complete.endedLabel')}</p>
                <p className="mt-0.5 text-sm font-medium">{formatDateTime(encounter.endedAt, displayLocale)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t('complete.readOnly')}</p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
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

            <EndEncounterButton
              encounterId={encounterId}
              alreadyEnded={isEnded}
              disabled={isDirty || saving}
              disabledReason={isDirty ? t('actions.saveBeforeClosing') : undefined}
              hasDiagnosis={!!form.diagnosis.trim()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
