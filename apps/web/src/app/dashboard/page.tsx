'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Calendar, Users, ListOrdered, Stethoscope } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { AppointmentStatusBadge } from '@/components/appointments/appointment-status-badge';
import type { Appointment, AppointmentsResponse } from '@/types/appointment';

interface PagedMeta {
  total: number;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatRole(role: string) {
  return role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? '';

  const canReadPatients = role !== 'SECRETARY';
  const canReadDoctors = role === 'SUPER_ADMIN' || role === 'ORG_ADMIN';
  const today = todayStr();

  const { data: apptStats } = useQuery({
    queryKey: ['dashboard', 'appts-today'],
    queryFn: () => api.get<PagedMeta>('/v1/appointments', { date: today, limit: 1 }),
    staleTime: 60_000,
  });

  const { data: queueStats } = useQuery({
    queryKey: ['dashboard', 'queue-waiting'],
    queryFn: () => api.get<PagedMeta>('/v1/queue', { status: 'WAITING', limit: 1 }),
    staleTime: 30_000,
  });

  const { data: patientStats } = useQuery({
    queryKey: ['dashboard', 'patients-total'],
    queryFn: () => api.get<PagedMeta>('/v1/patients', { limit: 1 }),
    enabled: canReadPatients,
    staleTime: 60_000,
  });

  const { data: doctorStats } = useQuery({
    queryKey: ['dashboard', 'doctors-total'],
    queryFn: () => api.get<PagedMeta>('/v1/doctors', { limit: 1 }),
    enabled: canReadDoctors,
    staleTime: 60_000,
  });

  const { data: todayAppts } = useQuery({
    queryKey: ['dashboard', 'today-list'],
    queryFn: () => api.get<AppointmentsResponse>('/v1/appointments', { date: today, limit: 8 }),
    staleTime: 30_000,
  });

  const stats = [
    {
      label: "Today's Appointments",
      value: apptStats?.total ?? '—',
      sub: 'scheduled today',
      icon: Calendar,
      href: '/dashboard/appointments',
    },
    {
      label: 'In Queue',
      value: queueStats?.total ?? '—',
      sub: 'currently waiting',
      icon: ListOrdered,
      href: '/dashboard/queue',
    },
    {
      label: 'Total Patients',
      value: canReadPatients ? (patientStats?.total ?? '—') : '—',
      sub: 'registered',
      icon: Users,
      href: '/dashboard/patients',
    },
    {
      label: 'Doctors on Staff',
      value: canReadDoctors ? (doctorStats?.total ?? '—') : '—',
      sub: 'active profiles',
      icon: Stethoscope,
      href: '/dashboard/appointments',
    },
  ];

  const appointments = todayAppts?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {user
            ? `${user.firstName} ${user.lastName} · ${formatRole(role)}`
            : 'Loading...'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              </div>
              <p className="mt-2 text-3xl font-bold tabular-nums">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
            </Link>
          );
        })}
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold">Today's Appointments</h2>
          <Link
            href="/dashboard/appointments"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            View all →
          </Link>
        </div>

        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">
              No appointments scheduled for today
            </p>
            <Link
              href="/dashboard/appointments/new"
              className="mt-3 text-xs text-primary hover:underline"
            >
              Schedule an appointment
            </Link>
          </div>
        ) : (
          <ul className="divide-y">
            {appointments.map((appt: Appointment) => (
              <li key={appt.id} className="flex items-center justify-between px-6 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {appt.patient.firstName} {appt.patient.lastName}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {appt.patient.mrn}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(appt.scheduledAt)} · Dr. {appt.doctor.user.lastName}
                  </p>
                </div>
                <AppointmentStatusBadge status={appt.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
