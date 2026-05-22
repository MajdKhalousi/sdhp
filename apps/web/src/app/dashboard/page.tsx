'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Calendar, Users, ListOrdered, CheckCircle2, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { AppointmentStatusBadge } from '@/components/appointments/appointment-status-badge';
import { QueueStatusBadge } from '@/components/queue/queue-status-badge';
import type { Appointment, AppointmentsResponse } from '@/types/appointment';
import type { QueueEntry, QueueResponse } from '@/types/queue';

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

function relativeWait(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m`;
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

  const { data: completedStats } = useQuery({
    queryKey: ['dashboard', 'appts-completed-today'],
    queryFn: () => api.get<PagedMeta>('/v1/appointments', { date: today, status: 'COMPLETED', limit: 1 }),
    staleTime: 30_000,
  });

  const { data: todayAppts } = useQuery({
    queryKey: ['dashboard', 'today-list'],
    queryFn: () => api.get<AppointmentsResponse>('/v1/appointments', { date: today, limit: 8 }),
    staleTime: 30_000,
  });

  const { data: liveQueue } = useQuery({
    queryKey: ['dashboard', 'live-queue'],
    queryFn: () =>
      api.get<QueueResponse>('/v1/queue', {
        date: today,
        status: ['WAITING', 'CALLED', 'IN_PROGRESS'],
        limit: 6,
      }),
    staleTime: 30_000,
    refetchInterval: 30_000,
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
      label: 'Waiting Now',
      value: queueStats?.total ?? '—',
      sub: 'patients in queue',
      icon: ListOrdered,
      href: '/dashboard/queue',
      urgent: (queueStats?.total ?? 0) > 0,
    },
    {
      label: 'Total Patients',
      value: canReadPatients ? (patientStats?.total ?? '—') : '—',
      sub: 'registered',
      icon: Users,
      href: '/dashboard/patients',
    },
    {
      label: 'Completed Today',
      value: completedStats?.total ?? '—',
      sub: 'encounters finished',
      icon: CheckCircle2,
      href: '/dashboard/appointments',
    },
  ];

  const appointments = todayAppts?.data ?? [];
  const activeQueue = liveQueue?.data ?? [];

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

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className={`rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-primary/40 ${
                stat.urgent ? 'border-primary/30' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <Icon className={`h-4 w-4 shrink-0 ${stat.urgent ? 'text-primary' : 'text-muted-foreground/50'}`} />
              </div>
              <p className={`mt-2 text-3xl font-bold tabular-nums ${stat.urgent ? 'text-primary' : ''}`}>
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
            </Link>
          );
        })}
      </div>

      {/* ── Two-column content ────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-5">

        {/* Today's appointments — wider column */}
        <div className="rounded-xl border bg-card shadow-sm lg:col-span-3">
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

        {/* Live queue — narrower column */}
        <div className="rounded-xl border bg-card shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Live Queue</h2>
              {activeQueue.length > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                  {activeQueue.length}
                </span>
              )}
            </div>
            <Link
              href="/dashboard/queue"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Manage →
            </Link>
          </div>

          {activeQueue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Clock className="h-7 w-7 text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">Queue is clear</p>
            </div>
          ) : (
            <ul className="divide-y">
              {activeQueue.map((entry: QueueEntry) => (
                <li key={entry.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                    #{entry.ticketNumber}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {entry.appointment.patient.firstName} {entry.appointment.patient.lastName}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>{relativeWait(entry.createdAt)}</span>
                      <span>·</span>
                      <span>Dr. {entry.appointment.doctor.user.lastName}</span>
                    </p>
                  </div>
                  <QueueStatusBadge status={entry.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}
