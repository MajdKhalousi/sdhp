'use client';

import { useState } from 'react';
import { usePatient } from '@/hooks/use-patient';
import { PatientHeader } from '@/components/patients/patient-header';
import { Tabs, TabPanel, type TabItem } from '@/components/ui/tabs';
import { TimelineTab } from '@/components/patients/timeline/timeline-tab';

const TABS: TabItem[] = [
  { value: 'overview',      label: 'Overview' },
  { value: 'timeline',      label: 'Timeline' },
  { value: 'encounters',    label: 'Encounters' },
  { value: 'prescriptions', label: 'Prescriptions' },
  { value: 'lab-orders',    label: 'Lab Orders' },
  { value: 'radiology',     label: 'Radiology' },
  { value: 'files',         label: 'Files' },
];

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex h-48 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
      {label} — coming soon
    </div>
  );
}

export default function PatientPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [activeTab, setActiveTab] = useState('timeline');

  const { data: patient, isLoading, isError, error } = usePatient(id);

  // Propagate to error.tsx boundary
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
          <Placeholder label="Patient overview" />
        </TabPanel>

        <TabPanel value="timeline" activeValue={activeTab}>
          <TimelineTab patientId={id} />
        </TabPanel>

        <TabPanel value="encounters" activeValue={activeTab}>
          <Placeholder label="Encounters" />
        </TabPanel>

        <TabPanel value="prescriptions" activeValue={activeTab}>
          <Placeholder label="Prescriptions" />
        </TabPanel>

        <TabPanel value="lab-orders" activeValue={activeTab}>
          <Placeholder label="Lab Orders" />
        </TabPanel>

        <TabPanel value="radiology" activeValue={activeTab}>
          <Placeholder label="Radiology Orders" />
        </TabPanel>

        <TabPanel value="files" activeValue={activeTab}>
          <Placeholder label="Medical Files" />
        </TabPanel>
      </div>
    </div>
  );
}
