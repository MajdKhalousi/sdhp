'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, CalendarX2 } from 'lucide-react';
import { useAppointments, useDoctorsList } from '@/hooks/use-appointments';
import { AppointmentStatusBadge } from './appointment-status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppointmentStatus } from '@/types/appointment';

const ALL_STATUSES: { value: AppointmentStatus; label: string }[] = [
  { value: 'SCHEDULED',   label: 'Scheduled'   },
  { value: 'CONFIRMED',   label: 'Confirmed'   },
  { value: 'CHECKED_IN',  label: 'Checked In'  },
  { value: 'IN_QUEUE',    label: 'In Queue'    },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED',   label: 'Completed'   },
  { value: 'CANCELLED',   label: 'Cancelled'   },
  { value: 'NO_SHOW',     label: 'No Show'     },
];

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const LIMIT = 20;

export function AppointmentList() {
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [date, setDate] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useAppointments({
    ...(status ? { status: [status] } : {}),
    ...(date ? { date } : {}),
    ...(doctorId ? { doctorId } : {}),
    page,
    limit: LIMIT,
  });

  const { data: doctorsData } = useDoctorsList();

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  function handleFilterChange() {
    setPage(1);
  }

  // Shared filter bar
  const filters = (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={status}
        onChange={(e) => { setStatus(e.target.value as AppointmentStatus | ''); handleFilterChange(); }}
        className="h-8 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        {ALL_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      <input
        type="date"
        value={date}
        onChange={(e) => { setDate(e.target.value); handleFilterChange(); }}
        className="h-8 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        aria-label="Filter by date"
      />

      <select
        value={doctorId}
        onChange={(e) => { setDoctorId(e.target.value); handleFilterChange(); }}
        className="h-8 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        aria-label="Filter by doctor"
      >
        <option value="">All doctors</option>
        {doctorsData?.data.map((d) => (
          <option key={d.id} value={d.id}>
            Dr. {d.user.firstName} {d.user.lastName}
          </option>
        ))}
      </select>

      {(status || date || doctorId) && (
        <button
          onClick={() => { setStatus(''); setDate(''); setDoctorId(''); setPage(1); }}
          className="h-8 rounded-md border px-3 text-xs text-muted-foreground transition-colors hover:bg-accent"
        >
          Clear filters
        </button>
      )}
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {filters}
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                {['Patient', 'Doctor', 'Scheduled', 'Duration', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-border">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-4">
        {filters}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-16 text-center">
          <p className="text-sm font-medium text-destructive">Failed to load appointments</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            {error instanceof Error ? error.message : 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-1 h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || data.data.length === 0) {
    return (
      <div className="space-y-4">
        {filters}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <CalendarX2 className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">No appointments found</p>
          <p className="text-xs text-muted-foreground">
            {status || date || doctorId
              ? 'Try adjusting your filters.'
              : 'Create the first appointment to get started.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filters}

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Patient</th>
              <th className="px-4 py-3 text-left font-medium">Doctor</th>
              <th className="px-4 py-3 text-left font-medium">Scheduled</th>
              <th className="px-4 py-3 text-left font-medium">Duration</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {data.data.map((appt) => (
              <tr
                key={appt.id}
                className="border-t border-border transition-colors hover:bg-muted/20"
              >
                <td className="px-4 py-3">
                  <p className="text-sm font-medium">
                    {appt.patient.firstName} {appt.patient.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{appt.patient.mrn}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm">
                    Dr. {appt.doctor.user.firstName} {appt.doctor.user.lastName}
                  </p>
                  {appt.doctor.specialization && (
                    <p className="text-xs text-muted-foreground">{appt.doctor.specialization}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">{formatDateTime(appt.scheduledAt)}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {appt.durationMin} min
                </td>
                <td className="px-4 py-3">
                  <AppointmentStatusBadge status={appt.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/appointments/${appt.id}`}
                    className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages} &mdash; {data.total} total
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors hover:bg-accent disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors hover:bg-accent disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
