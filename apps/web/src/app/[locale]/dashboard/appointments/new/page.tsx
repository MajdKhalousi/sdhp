import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AppointmentForm } from '@/components/appointments/appointment-form';

export default function NewAppointmentPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/appointments"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent"
          aria-label="Back to appointments"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">New Appointment</h1>
          <p className="text-sm text-muted-foreground">Schedule a patient appointment</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <AppointmentForm />
      </div>
    </div>
  );
}
