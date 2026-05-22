import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AppointmentList } from '@/components/appointments/appointment-list';

export default function AppointmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Appointments</h1>
          <p className="text-sm text-muted-foreground">Manage and track patient appointments</p>
        </div>
        <Link
          href="/dashboard/appointments/new"
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Appointment
        </Link>
      </div>

      <AppointmentList />
    </div>
  );
}
