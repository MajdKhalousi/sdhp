'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { usePatient, useUpdatePatient, useDeletePatient } from '@/hooks/use-patient';
import { useAllergies } from '@/hooks/use-allergies';
import { PatientHeader } from '@/components/patients/patient-header';
import { PatientForm } from '@/components/patients/patient-form';
import { Tabs, TabPanel, type TabItem } from '@/components/ui/tabs';
import { TimelineTab } from '@/components/patients/timeline/timeline-tab';
import { ClinicalTypeTab } from '@/components/patients/clinical-type-tab';
import { FilesTab } from '@/components/patients/files-tab';
import { LabOrdersTab } from '@/components/patients/lab-orders-tab';
import { RadiologyOrdersTab } from '@/components/patients/radiology-orders-tab';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { Patient, CreatePatientInput, UpdatePatientInput } from '@/hooks/use-patient';
import type { Allergy } from '@/hooks/use-allergies';

function formatDate(iso: string | null, locale = 'en-US'): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(locale, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatGender(raw: string | null): string {
  if (!raw) return '—';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

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
          return (
            <div key={a.id} className="flex flex-wrap items-start gap-2">
              <span className="text-sm font-semibold text-foreground">{a.substance}</span>
              {a.severity && badge && (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}>
                  {a.severity.charAt(0) + a.severity.slice(1).toLowerCase()}
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
  const displayLocale = locale === 'ar' ? 'ar-SY' : 'en-US';
  const registeredDate = formatDate(patient.createdAt, displayLocale);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border bg-card px-5 py-3 shadow-sm">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('detail.overview.demographics')}
        </p>
        <InfoRow label={t('detail.overview.fields.dateOfBirth')} value={formatDate(patient.dateOfBirth, displayLocale)} />
        <InfoRow label={t('detail.overview.fields.gender')} value={formatGender(patient.gender)} />
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
        {patient.city && <InfoRow label="المدينة" value={patient.city} />}
      </div>

      {((patient.emergencyContactName ?? patient.emergencyName) || (patient.emergencyContactPhone ?? patient.emergencyPhone)) && (
        <div className="rounded-xl border bg-card px-5 py-3 shadow-sm sm:col-span-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('detail.overview.emergencyContact')}
          </p>
          <InfoRow label={t('detail.overview.fields.name')} value={patient.emergencyContactName ?? patient.emergencyName} />
          <InfoRow label={t('detail.overview.fields.phone')} value={patient.emergencyContactPhone ?? patient.emergencyPhone} />
        </div>
      )}

      {patient.chronicDiseases && (
        <div className="rounded-xl border bg-card px-5 py-3 shadow-sm sm:col-span-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            الأمراض المزمنة
          </p>
          <p className="text-sm text-foreground">{patient.chronicDiseases}</p>
        </div>
      )}

      <AllergiesCard
        allergies={allergies}
        headingLabel={t('detail.allergies.heading')}
        noneLabel={t('detail.allergies.none')}
      />

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

export default function PatientPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const t = useTranslations('patient');
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: patient, isLoading, isError, error } = usePatient(id);
  const { data: allergies = [] } = useAllergies(id);
  const updatePatient = useUpdatePatient();
  const deletePatient = useDeletePatient();

  if (isError) throw error;

  async function handleUpdate(formData: CreatePatientInput | UpdatePatientInput) {
    setUpdateError(null);
    try {
      await updatePatient.mutateAsync({ id, data: formData as UpdatePatientInput });
      setIsEditOpen(false);
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'حدث خطأ أثناء تعديل بيانات المريض');
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm('هل أنت متأكد من أرشفة هذا المريض؟');
    if (!confirmed) return;
    setDeleteError(null);
    try {
      await deletePatient.mutateAsync(id);
      router.push('/dashboard/patients');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'حدث خطأ أثناء أرشفة المريض');
    }
  }

  const TABS: TabItem[] = [
    { value: 'overview',      label: t('detail.tabs.overview')      },
    { value: 'timeline',      label: t('detail.tabs.timeline')      },
    { value: 'prescriptions', label: t('detail.tabs.prescriptions') },
    { value: 'labs',          label: t('detail.tabs.labs')          },
    { value: 'radiology',     label: t('detail.tabs.radiology')     },
    { value: 'files',         label: t('detail.tabs.files')         },
  ];

  return (
    <div className="space-y-4">
      <PatientHeader patient={patient} isLoading={isLoading} />

      {patient && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setIsEditOpen(true); setUpdateError(null); }}
            className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            تعديل البيانات
          </button>
          <button
            onClick={handleDelete}
            disabled={deletePatient.isPending}
            className="rounded-lg border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
          >
            أرشفة المريض
          </button>
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
          onChange={setActiveTab}
          aria-label="Patient sections"
        />
      </div>

      <div className="pt-2">
        <TabPanel value="overview" activeValue={activeTab}>
          {patient ? (
            <OverviewTab patient={patient} allergies={allergies} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-52 rounded-xl" />
              <Skeleton className="h-52 rounded-xl" />
              <Skeleton className="h-24 rounded-xl sm:col-span-2" />
            </div>
          )}
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

      </div>
    </div>
  );
}
