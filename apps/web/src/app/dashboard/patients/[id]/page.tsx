'use client';

import { useState } from 'react';
import { usePatient } from '@/hooks/use-patient';
import { PatientHeader } from '@/components/patients/patient-header';
import { Tabs, TabPanel, type TabItem } from '@/components/ui/tabs';
import { TimelineTab } from '@/components/patients/timeline/timeline-tab';
import { Badge } from '@/components/ui/badge';
import type { Patient } from '@/hooks/use-patient';

const TABS: TabItem[] = [
  { value: 'overview',  label: 'Overview'        },
  { value: 'timeline',  label: 'Medical History' },
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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value ?? '—'}</span>
    </div>
  );
}

function OverviewTab({ patient }: { patient: Patient }) {
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

      {patient.notes && (
        <div className="rounded-xl border bg-card px-5 py-3 shadow-sm sm:col-span-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Notes
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

  if (isError) throw error;

  return (
    <div className="space-y-4">
      <PatientHeader patient={patient} isLoading={isLoading} />

      <Tabs
        tabs={TABS}
        value={activeTab}
        onChange={setActiveTab}
        aria-label="Patient sections"
      />

      <div className="pt-2">
        <TabPanel value="overview" activeValue={activeTab}>
          {patient ? (
            <OverviewTab patient={patient} />
          ) : (
            <div className="h-48" />
          )}
        </TabPanel>

        <TabPanel value="timeline" activeValue={activeTab}>
          <TimelineTab patientId={id} />
        </TabPanel>
      </div>
    </div>
  );
}
