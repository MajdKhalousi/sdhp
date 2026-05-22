import { DoctorQueuePanel } from '@/components/doctor/doctor-queue-panel';

export default function DoctorQueuePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Today's Queue</h1>
        <p className="text-sm text-muted-foreground">Patients waiting for your consultation</p>
      </div>

      <DoctorQueuePanel />
    </div>
  );
}
