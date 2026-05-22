'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { usePatient } from '@/hooks/use-patient';
import { useAllergies } from '@/hooks/use-allergies';
import { PatientHeader } from '@/components/patients/patient-header';
import { Tabs, TabPanel, type TabItem } from '@/components/ui/tabs';
import { TimelineTab } from '@/components/patients/timeline/timeline-tab';
import { ClinicalTypeTab } from '@/components/patients/clinical-type-tab';
import { Badge } from '@/components/ui/badge';
import type { Patient } from '@/hooks/use-patient';
import type { Allergy } from '@/hooks/use-allergies';

const TABS: TabItem[] = [
  { value: 'overview',      label: 'Overview'        },
  { value: 'timeline',      label: 'Medical History' },
  { value: 'prescriptions', label: 'Prescriptions'   },
  { value: 'labs',          label: 'Lab Orders'      },
  { value: 'radiology',     label: 'Radiology'       },
  { value: 'files',         label: 'Medical Files'   },
];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
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

const SEVERITY_CLASSES: Record<string, { badge: string; row: string }> = {
  MILD:     { badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', row: '' },
  MODERATE: { badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', row: '' },
  SEVERE:   { badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', row: '' },
};

function AllergiesCard({ allergies }: { allergies: Allergy[] }) {
  if (allergies.length === 0) {
    return (
      <div className="rounded-xl border bg-card px-5 py-3 shadow-sm sm:col-span-2">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Known Allergies
        </p>
        <p className="text-sm text-muted-foreground">No known allergies on record.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 px-5 py-3 shadow-sm dark:border-orange-900/40 dark:bg-orange-950/20 sm:col-span-2">
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-400">
          Known Allergies
        </p>
      </div>
      <div className="space-y-2">
        {allergies.map((a) => {
          const style = a.severity ? (SEVERITY_CLASSES[a.severity] ?? SEVERITY_CLASSES.MILD) : null;
          return (
            <div key={a.id} className="flex flex-wrap items-start gap-2">
              <span className="text-sm font-semibold text-foreground">{a.substance}</span>
              {a.severity && style && (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style.badge}`}>
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
  const registeredDate = formatDate(patient.createdAt);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border bg-card px-5 py-3 shadow-sm">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Demographics
        </p>
        <InfoRow label="Date of Birth" value={formatDate(patient.dateOfBirth)} />
        <InfoRow label="Gender" value={formatGender(patient.gender)} />
        <InfoRow label="Blood Type" value={formatBloodType(patient.bloodType)} />
        <InfoRow
          label="Status"
          value={
            <Badge variant={patient.isActive ? 'success' : 'outline'}>
              {patient.isActive ? 'Active' : 'Inactive'}
            </Badge>
          }
        />
        <InfoRow label="Registered" value={registeredDate} />
      </div>

      <div className="rounded-xl border bg-card px-5 py-3 shadow-sm">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Contact
        </p>
        <InfoRow label="Phone" value={patient.phone} />
        <InfoRow label="Email" value={patient.email} />
        <InfoRow label="National ID" value={patient.nationalId} />
        <InfoRow label="Address" value={patient.address} />
      </div>

      {(patient.emergencyName || patient.emergencyPhone) && (
        <div className="rounded-xl border bg-card px-5 py-3 shadow-sm sm:col-span-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Emergency Contact
          </p>
          <InfoRow label="Name" value={patient.emergencyName} />
          <InfoRow label="Phone" value={patient.emergencyPhone} />
        </div>
      )}

      <AllergiesCard allergies={allergies} />

      {patient.notes && (
        <div className="rounded-xl border bg-card px-5 py-3 shadow-sm sm:col-span-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Clinical Notes
          </p>
          <p className="text-sm text-foreground">{patient.notes}</p>
        </div>
      )}
    </div>
  );
}

export default function PatientPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [activeTab, setActiveTab] = useState('overview');

  const { data: patient, isLoading, isError, error } = usePatient(id);
  const { data: allergies = [] } = useAllergies(id);

  if (isError) throw error;

  return (
    <div className="space-y-4">
      <PatientHeader patient={patient} isLoading={isLoading} />

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
            <div className="h-48" />
          )}
        </TabPanel>

        <TabPanel value="timeline" activeValue={activeTab}>
          <TimelineTab patientId={id} />
        </TabPanel>

        <TabPanel value="prescriptions" activeValue={activeTab}>
          <ClinicalTypeTab
            patientId={id}
            type="PRESCRIPTION"
            emptyMessage="No prescriptions recorded for this patient."
          />
        </TabPanel>

        <TabPanel value="labs" activeValue={activeTab}>
          <ClinicalTypeTab
            patientId={id}
            type="LAB_ORDER"
            emptyMessage="No lab orders recorded for this patient."
          />
        </TabPanel>

        <TabPanel value="radiology" activeValue={activeTab}>
          <ClinicalTypeTab
            patientId={id}
            type="RADIOLOGY_ORDER"
            emptyMessage="No radiology orders recorded for this patient."
          />
        </TabPanel>

        <TabPanel value="files" activeValue={activeTab}>
          <ClinicalTypeTab
            patientId={id}
            type="MEDICAL_FILE"
            emptyMessage="No medical files uploaded for this patient."
          />
        </TabPanel>
      </div>
    </div>
  );
}
