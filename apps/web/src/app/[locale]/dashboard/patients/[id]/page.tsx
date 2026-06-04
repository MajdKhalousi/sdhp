'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter, Link } from '@/i18n/navigation';
import { AlertTriangle, ArrowLeft, CalendarClock, UserPlus, Receipt } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { usePatient, useUpdatePatient, useDeletePatient } from '@/hooks/use-patient';
import { useAuthStore } from '@/store/auth';
import { useAllergies } from '@/hooks/use-allergies';
import { usePatientLabOrders } from '@/hooks/use-labs';
import { usePatientRadiologyOrders } from '@/hooks/use-radiology';
import { usePatientTimeline } from '@/hooks/use-patient-timeline';
import { PatientHeader } from '@/components/patients/patient-header';
import { PatientForm } from '@/components/patients/patient-form';
import { Tabs, TabPanel, type TabItem } from '@/components/ui/tabs';
import { TimelineTab } from '@/components/patients/timeline/timeline-tab';
import { ClinicalTypeTab } from '@/components/patients/clinical-type-tab';
import { FilesTab } from '@/components/patients/files-tab';
import { LabOrdersTab } from '@/components/patients/lab-orders-tab';
import { RadiologyOrdersTab } from '@/components/patients/radiology-orders-tab';
import { ClinicalReportsTab } from '@/components/patients/clinical-reports-tab';
import { InvoicesTab } from '@/components/patients/invoices-tab';
import { PatientAppointmentsTab } from '@/components/patients/patient-appointments-tab';
import { PatientClinicalSummary } from '@/components/patients/patient-clinical-summary';
import { PatientSafetyAlerts } from '@/components/patients/patient-safety-alerts';
import { PatientVisitStatus } from '@/components/patients/patient-visit-status';
import { PatientOutstandingBalance } from '@/components/patients/patient-outstanding-balance';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { Patient, CreatePatientInput, UpdatePatientInput } from '@/hooks/use-patient';
import type { Allergy } from '@/hooks/use-allergies';
import { formatDateDisplay } from '@/lib/format-date';

function formatBloodType(raw: string | null): string {
  if (!raw) return '—';
  return raw.replace('_POS', '+').replace('_NEG', '−');
}

const SEVERITY_BADGE: Record<string, string> = {
  MILD:     'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  MODERATE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  SEVERE:   'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const SEVERITY_CARD: Record<string, { card: string; icon: string; heading: string }> = {
  SEVERE:   { card: 'border-red-300 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20',        icon: 'text-red-600 dark:text-red-400',    heading: 'text-red-700 dark:text-red-400'    },
  MODERATE: { card: 'border-orange-200 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/20', icon: 'text-orange-600 dark:text-orange-400', heading: 'text-orange-700 dark:text-orange-400' },
  MILD:     { card: 'border-yellow-200 bg-yellow-50 dark:border-yellow-900/40 dark:bg-yellow-950/20', icon: 'text-yellow-600 dark:text-yellow-400', heading: 'text-yellow-700 dark:text-yellow-400' },
};

function maxSeverity(allergies: Allergy[]): string | null {
  for (const s of ['SEVERE', 'MODERATE', 'MILD']) {
    if (allergies.some((a) => a.severity === s)) return s;
  }
  return null;
}

function AllergiesCard({ allergies, headingLabel, noneLabel }: {
  allergies: Allergy[];
  headingLabel: string;
  noneLabel: string;
}) {
  const t = useTranslations('patient');
  if (allergies.length === 0) {
    return (
      <div className="rounded-xl border bg-card px-5 py-3 shadow-sm sm:col-span-2">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {headingLabel}
        </p>
        <p className="text-sm text-muted-foreground">{noneLabel}</p>
      </div>
    );
  }

  const top = maxSeverity(allergies);
  const cardStyle = top ? (SEVERITY_CARD[top] ?? SEVERITY_CARD.MILD) : SEVERITY_CARD.MILD;

  return (
    <div className={`rounded-xl border px-5 py-3 shadow-sm sm:col-span-2 ${cardStyle.card}`}>
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle className={`h-3.5 w-3.5 ${cardStyle.icon}`} />
        <p className={`text-xs font-semibold uppercase tracking-wide ${cardStyle.heading}`}>
          {headingLabel}
        </p>
      </div>
      <div className="space-y-2">
        {allergies.map((a) => {
          const badge = a.severity ? (SEVERITY_BADGE[a.severity] ?? SEVERITY_BADGE.MILD) : null;
          const sev =
            a.severity === 'MILD'       ? t('detail.allergies.severity.mild')
            : a.severity === 'MODERATE' ? t('detail.allergies.severity.moderate')
            : a.severity === 'SEVERE'   ? t('detail.allergies.severity.severe')
            : null;
          return (
            <div key={a.id} className="flex flex-wrap items-start gap-2">
              <span className="text-sm font-semibold text-foreground">{a.substance}</span>
              {sev && badge && (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}>
                  {sev}
                </span>
              )}
              {a.reaction && (
                <span className="text-xs text-muted-foreground">— {a.reaction}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value ?? '—'}</span>
    </div>
  );
}

function OverviewTab({ patient, allergies }: { patient: Patient; allergies: Allergy[] }) {
  const t = useTranslations('patient');
  const locale = useLocale();
  const displayLocale = locale === 'ar' ? 'ar-u-nu-latn' : 'en-US';
  const registeredDate = formatDateDisplay(patient.createdAt);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border bg-card px-5 py-3 shadow-sm">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('detail.overview.demographics')}
        </p>
        <InfoRow label={t('detail.overview.fields.dateOfBirth')} value={formatDateDisplay(patient.dateOfBirth)} />
        <InfoRow
          label={t('detail.overview.fields.gender')}
          value={patient.gender ? t(`gender.${patient.gender.toLowerCase()}` as Parameters<typeof t>[0]) : '—'}
        />
        <InfoRow label={t('detail.overview.fields.bloodType')} value={formatBloodType(patient.bloodType)} />
        <InfoRow
          label={t('detail.overview.fields.status')}
          value={
            <Badge variant={patient.isActive ? 'success' : 'outline'}>
              {patient.isActive ? t('status.active') : t('status.inactive')}
            </Badge>
          }
        />
        <InfoRow label={t('detail.overview.fields.registered')} value={registeredDate} />
      </div>

      <div className="rounded-xl border bg-card px-5 py-3 shadow-sm">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('detail.overview.contact')}
        </p>
        <InfoRow label={t('detail.overview.fields.phone')} value={patient.phone} />
        <InfoRow label={t('detail.overview.fields.email')} value={patient.email} />
        <InfoRow label={t('detail.overview.fields.nationalId')} value={patient.nationalId} />
        <InfoRow label={t('detail.overview.fields.address')} value={patient.address} />
        {patient.city && <InfoRow label={t('detail.overview.fields.city')} value={patient.city} />}
      </div>

      {(() => {
        const hasFamilyInfo = !!(patient.fatherName || patient.fatherNameAr || patient.motherName || patient.motherNameAr);
        return (
          <>
            <div className={`rounded-xl border bg-card px-5 py-3 shadow-sm${hasFamilyInfo ? '' : ' sm:col-span-2'}`}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('detail.overview.emergencyContact')}
              </p>
              {(patient.emergencyContactName ?? patient.emergencyName) || (patient.emergencyContactPhone ?? patient.emergencyPhone) ? (
                <>
                  <InfoRow label={t('detail.overview.fields.name')} value={patient.emergencyContactName ?? patient.emergencyName} />
                  <InfoRow label={t('detail.overview.fields.phone')} value={patient.emergencyContactPhone ?? patient.emergencyPhone} />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t('detail.overview.noEmergencyContact')}</p>
              )}
            </div>

            {hasFamilyInfo && (
              <div className="rounded-xl border bg-card px-5 py-3 shadow-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('detail.overview.family')}
                </p>
                {patient.fatherName && <InfoRow label={t('detail.overview.fields.fatherName')} value={patient.fatherName} />}
                {patient.fatherNameAr && <InfoRow label={t('detail.overview.fields.fatherNameAr')} value={<span dir="rtl">{patient.fatherNameAr}</span>} />}
                {patient.motherName && <InfoRow label={t('detail.overview.fields.motherName')} value={patient.motherName} />}
                {patient.motherNameAr && <InfoRow label={t('detail.overview.fields.motherNameAr')} value={<span dir="rtl">{patient.motherNameAr}</span>} />}
              </div>
            )}
          </>
        );
      })()}

      <AllergiesCard
        allergies={allergies}
        headingLabel={t('detail.allergies.heading')}
        noneLabel={t('detail.allergies.none')}
      />

      {patient.chronicDiseases && (
        <div className="rounded-xl border bg-card px-5 py-3 shadow-sm sm:col-span-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('detail.overview.chronicDiseases')}
          </p>
          <p className="text-sm text-foreground">{patient.chronicDiseases}</p>
        </div>
      )}

      {patient.notes && (
        <div className="rounded-xl border bg-card px-5 py-3 shadow-sm sm:col-span-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('detail.overview.clinicalNotes')}
          </p>
          <p className="text-sm text-foreground">{patient.notes}</p>
        </div>
      )}
    </div>
  );
}

const PATIENT_EDIT_ROLES    = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY']);
const PATIENT_ARCHIVE_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN']);
const CLINICAL_ROLES        = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR', 'NURSE']);
const SAFETY_ALERT_ROLES    = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR', 'NURSE', 'SECRETARY']);
const RECEPTION_ACTION_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY']);
const INVOICE_CREATE_ROLES   = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'ACCOUNTANT']);
const PENDING_LAB_STATUSES = new Set(['ORDERED', 'SAMPLE_COLLECTED', 'IN_PROGRESS']);
const PENDING_RADIOLOGY_STATUSES = new Set(['ORDERED', 'SCHEDULED', 'IN_PROGRESS']);

export default function PatientPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('patient');
  const tCommon = useTranslations('common');
  const { user } = useAuthStore();
  const canEdit            = user ? PATIENT_EDIT_ROLES.has(user.role) : false;
  const canArchive         = user ? PATIENT_ARCHIVE_ROLES.has(user.role) : false;
  const hasClinicalRole    = user ? CLINICAL_ROLES.has(user.role) : false;
  const canSeeSafetyAlerts = user ? SAFETY_ALERT_ROLES.has(user.role) : false;
  const canBookAppointment = user ? RECEPTION_ACTION_ROLES.has(user.role) : false;
  const canCheckIn         = user ? RECEPTION_ACTION_ROLES.has(user.role) : false;
  const canCreateInvoice   = user ? INVOICE_CREATE_ROLES.has(user.role) : false;
  const canSeeVisitStatus  = user ? SAFETY_ALERT_ROLES.has(user.role) : false;
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab');
    return tab === 'timeline' || tab === 'medical-history' ? 'timeline' : 'overview';
  });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleTabChange(tab: string) {
    setActiveTab(tab);
    const href = tab === 'overview'
      ? `/dashboard/patients/${id}`
      : `/dashboard/patients/${id}?tab=${tab}`;
    router.replace(href);
  }

  const { data: patient, isLoading, isError, error } = usePatient(id);
  const { data: allergies = [] } = useAllergies(id);
  const { data: labsData } = usePatientLabOrders(id);
  const { data: radData } = usePatientRadiologyOrders(id);
  const { data: timelineData } = usePatientTimeline(id, { types: ['ENCOUNTER'], limit: 1 });
  const updatePatient = useUpdatePatient();
  const deletePatient = useDeletePatient();

  const pendingLabsCount = (labsData ?? []).filter((l) => PENDING_LAB_STATUSES.has(l.status)).length;
  const pendingRadiologyCount = (radData ?? []).filter((r) => PENDING_RADIOLOGY_STATUSES.has(r.status)).length;
  const lastTimelineEvent = timelineData?.data?.[0];
  const lastEncounterData = lastTimelineEvent?.type === 'ENCOUNTER' ? lastTimelineEvent.data : null;
  const lastEncounterEvent = lastTimelineEvent?.type === 'ENCOUNTER' ? lastTimelineEvent : null;
  const overdueFollowUpDate = lastEncounterData?.followUpDate ?? null;

  if (isError) throw error;

  async function handleUpdate(formData: CreatePatientInput | UpdatePatientInput) {
    setUpdateError(null);
    try {
      await updatePatient.mutateAsync({ id, data: formData as UpdatePatientInput });
      setIsEditOpen(false);
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : t('detail.errors.updateFailed'));
    }
  }

  async function handleDelete() {
    setDeleteError(null);
    try {
      await deletePatient.mutateAsync(id);
      router.push('/dashboard/patients');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('detail.errors.archiveFailed'));
      setShowArchiveConfirm(false);
    }
  }

  const TABS: TabItem[] = [
    { value: 'overview',      label: t('detail.tabs.overview')      },
    { value: 'appointments',  label: t('detail.tabs.appointments')  },
    { value: 'timeline',      label: t('detail.tabs.timeline')      },
    { value: 'prescriptions', label: t('detail.tabs.prescriptions') },
    { value: 'labs',          label: t('detail.tabs.labs')          },
    { value: 'radiology',     label: t('detail.tabs.radiology')     },
    { value: 'files',         label: t('detail.tabs.files')         },
    { value: 'reports',       label: t('detail.tabs.reports')       },
    { value: 'invoices',      label: t('detail.tabs.invoices')      },
  ];

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/patients"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent"
        aria-label={tCommon('actions.back')}
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
      </Link>
      <PatientHeader patient={patient} isLoading={isLoading} />

      {patient && (canBookAppointment || canCheckIn || canCreateInvoice) && (
        <div className="flex flex-wrap items-center gap-2">
          {canBookAppointment && (
            <Link
              href={`/dashboard/appointments/new?patientId=${id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <CalendarClock className="h-3.5 w-3.5" />
              {t('detail.actions.bookAppointment')}
            </Link>
          )}
          {canCheckIn && (
            <Link
              href={`/dashboard/queue/check-in?patientId=${id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {t('detail.actions.addToQueue')}
            </Link>
          )}
          {canCreateInvoice && (
            <Link
              href={`/dashboard/invoices/new?patientId=${id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Receipt className="h-3.5 w-3.5" />
              {t('detail.actions.createInvoice')}
            </Link>
          )}
        </div>
      )}

      {patient && (canEdit || canArchive) && (
        <div className="space-y-3">
          {canArchive && showArchiveConfirm ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2.5">
              <p className="text-sm text-destructive">{t('detail.confirmArchive')}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deletePatient.isPending}
                  className="h-8 rounded-md border border-destructive/40 bg-destructive/10 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:pointer-events-none disabled:opacity-50"
                >
                  {t('detail.actions.archive')}
                </button>
                <button
                  onClick={() => setShowArchiveConfirm(false)}
                  disabled={deletePatient.isPending}
                  className="h-8 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {tCommon('actions.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {canEdit && (
                <button
                  onClick={() => { setIsEditOpen(true); setUpdateError(null); }}
                  className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {t('detail.actions.edit')}
                </button>
              )}
              {canArchive && (
                <button
                  onClick={() => setShowArchiveConfirm(true)}
                  className="rounded-lg border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  {t('detail.actions.archive')}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {deleteError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{deleteError}</p>
        </div>
      )}

      {isEditOpen && patient && (
        <div>
          {updateError && (
            <p className="mb-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive">
              {updateError}
            </p>
          )}
          <PatientForm
            mode="edit"
            initialPatient={patient}
            onSubmit={handleUpdate}
            onCancel={() => { setIsEditOpen(false); setUpdateError(null); }}
            isSubmitting={updatePatient.isPending}
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <Tabs
          tabs={TABS}
          value={activeTab}
          onChange={handleTabChange}
          aria-label="Patient sections"
        />
      </div>

      <div className="pt-2">
        <TabPanel value="overview" activeValue={activeTab}>
          <div className="space-y-4">
            {patient && canSeeVisitStatus && (
              <PatientVisitStatus
                patientId={id}
                lastEncounterEvent={lastEncounterEvent}
                canViewEncounter={hasClinicalRole}
              />
            )}
            {hasClinicalRole && (
              <PatientClinicalSummary
                patientId={id}
                onViewHistory={() => handleTabChange('timeline')}
              />
            )}
            {patient && canSeeSafetyAlerts && (
              <PatientSafetyAlerts
                allergies={allergies}
                chronicDiseases={patient.chronicDiseases}
                isActive={patient.isActive}
                hasEmergencyContact={!!(
                  (patient.emergencyContactName ?? patient.emergencyName) ||
                  (patient.emergencyContactPhone ?? patient.emergencyPhone)
                )}
                pendingLabsCount={pendingLabsCount}
                pendingRadiologyCount={pendingRadiologyCount}
                overdueFollowUpDate={overdueFollowUpDate}
              />
            )}
            {patient && canCreateInvoice && (
              <PatientOutstandingBalance
                patientId={id}
                onViewInvoices={() => handleTabChange('invoices')}
              />
            )}
            {patient ? (
              <OverviewTab patient={patient} allergies={allergies} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-52 rounded-xl" />
                <Skeleton className="h-52 rounded-xl" />
                <Skeleton className="h-24 rounded-xl sm:col-span-2" />
              </div>
            )}
          </div>
        </TabPanel>

        <TabPanel value="appointments" activeValue={activeTab}>
          <PatientAppointmentsTab patientId={id} />
        </TabPanel>

        <TabPanel value="timeline" activeValue={activeTab}>
          <TimelineTab patientId={id} />
        </TabPanel>

        <TabPanel value="prescriptions" activeValue={activeTab}>
          <ClinicalTypeTab
            patientId={id}
            type="PRESCRIPTION"
            emptyMessage={t('detail.clinicalTab.emptyPrescriptions')}
          />
        </TabPanel>

        <TabPanel value="labs" activeValue={activeTab}>
          <LabOrdersTab patientId={id} />
        </TabPanel>

        <TabPanel value="radiology" activeValue={activeTab}>
          <RadiologyOrdersTab patientId={id} />
        </TabPanel>

        <TabPanel value="files" activeValue={activeTab}>
          <FilesTab patientId={id} />
        </TabPanel>

        <TabPanel value="reports" activeValue={activeTab}>
          <ClinicalReportsTab patientId={id} />
        </TabPanel>

        <TabPanel value="invoices" activeValue={activeTab}>
          <InvoicesTab patientId={id} />
        </TabPanel>

      </div>
    </div>
  );
}
