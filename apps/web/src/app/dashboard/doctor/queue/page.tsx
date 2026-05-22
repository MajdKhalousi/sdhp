import { DoctorQueuePanel } from '@/components/doctor/doctor-queue-panel';

export default function DoctorQueuePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">My Patients</h1>
        <p className="text-sm text-muted-foreground">Select a patient to begin an encounter</p>
      </div>

      <DoctorQueuePanel />
    </div>
  );
}
