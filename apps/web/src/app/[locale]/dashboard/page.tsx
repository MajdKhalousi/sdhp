'use client';

import { useQuery } from '@tanstack/react-query';
import { Link } from '@/i18n/navigation';
import {
  Calendar, ListOrdered, CheckCircle2, Clock,
  Banknote, Wallet, Activity, CalendarClock,
  FlaskConical, ScanLine, UserPlus, AlertCircle, Stethoscope,
  UserX, Receipt,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useDashboardOverview } from '@/hooks/use-dashboard';
import { AppointmentStatusBadge } from '@/components/appointments/appointment-status-badge';
import { QueueStatusBadge } from '@/components/queue/queue-status-badge';
import type { Appointment, AppointmentsResponse } from '@/types/appointment';
import type { QueueEntry, QueueResponse } from '@/types/queue';
import { formatTimeDisplay } from '@/lib/format-date';

interface StatCard {
  key: string;
  label: string;
  value: string | number;
  sub: string;
  icon: LucideIcon;
  href?: string;
  urgent?: boolean;
  live?: boolean;
  annotation?: string;
  annotationUrgent?: boolean;
}

const BILLING_ROLES  = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'ACCOUNTANT']);
const OPS_ROLES      = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY', 'DOCTOR', 'NURSE']);
const LAB_ROLES      = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR', 'NURSE', 'TECHNICIAN']);
const WORKLOAD_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'TECHNICIAN']);
const COMPLETED_ROLES   = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY']);
const FOLLOWUP_ROLES    = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY', 'DOCTOR', 'NURSE']);
const NEW_PATIENT_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY']);

const ALERT_LABS_THRESHOLD      = 10;
const ALERT_RADIOLOGY_THRESHOLD = 10;
const ALERT_INVOICES_THRESHOLD  = 20;

function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Damascus' });
}

function relativeWait(iso: string, justNow: string, minShort: string, hrShort: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return justNow;
  if (mins < 60) return `${mins}${minShort}`;
  const h = Math.floor(mins / 60);
  return `${h}${hrShort} ${mins % 60}${minShort}`;
}

function formatRole(role: string) {
  return role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAmount(value: number, locale: string): string {
  return (
    new Intl.NumberFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value) + ' SYP'
  );
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tQueue = useTranslations('doctorQueue.card');
  const tDuration = useTranslations('timeline.cards.duration');
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? '';
  const today = todayStr();

  const canSeeBilling    = BILLING_ROLES.has(role);
  const canSeeOps        = OPS_ROLES.has(role);
  const canSeeLabs       = LAB_ROLES.has(role);
  const canSeeWorkload   = WORKLOAD_ROLES.has(role);
  const canSeeCompleted  = COMPLETED_ROLES.has(role);
  const canSeeFollowUps  = FOLLOWUP_ROLES.has(role);
  const canSeeNewPatients = NEW_PATIENT_ROLES.has(role);
  const followUpsHref = role === 'DOCTOR' ? '/dashboard/my-follow-ups' : '/dashboard/follow-ups';
  const waitingHref          = role === 'DOCTOR' ? '/dashboard/doctor/queue' : '/dashboard/queue';
  const activeEncountersHref = role === 'DOCTOR' ? '/dashboard/doctor' : '/dashboard/queue';

  const { data: overview, isError: overviewError } = useDashboardOverview();

  const { data: todayAppts } = useQuery({
    queryKey: ['dashboard', 'today-list'],
    queryFn: () => api.get<AppointmentsResponse>('/v1/appointments', { date: today, limit: 8 }),
    staleTime: 30_000,
    enabled: canSeeOps,
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
    enabled: canSeeOps,
  });

  const o = overview?.today;
  const queueWaiting = o?.queue.waiting ?? 0;

  const stats: StatCard[] = [];

  if (canSeeOps) {
    stats.push({
      key: 'todayAppts',
      label: t('stats.todayAppointments.label'),
      value: o?.appointments.total ?? '—',
      sub: t('stats.todayAppointments.sub'),
      icon: Calendar,
      href: '/dashboard/appointments',
      annotation:
        (o?.appointments.cancelled ?? 0) > 0 || (o?.appointments.noShow ?? 0) > 0
          ? t('stats.todayAppointments.annotation', {
              cancelled: o?.appointments.cancelled ?? 0,
              noShow: o?.appointments.noShow ?? 0,
            })
          : undefined,
    });
    stats.push({
      key: 'waiting',
      label: t('stats.waitingNow.label'),
      value: o?.queue.waiting ?? '—',
      sub: t('stats.waitingNow.sub'),
      icon: ListOrdered,
      href: waitingHref,
      urgent: queueWaiting > 0,
      live: true,
      annotation:
        (o?.queue.done ?? 0) > 0
          ? t('stats.waitingNow.annotation', { done: o?.queue.done ?? 0 })
          : undefined,
    });
    stats.push({
      key: 'inProgress',
      label: t('stats.visitsInProgress.label'),
      value: o?.queue.inProgress ?? '—',
      sub: t('stats.visitsInProgress.sub'),
      icon: Activity,
      href: '/dashboard/queue',
    });
    stats.push({
      key: 'activeEncounters',
      label: t('stats.activeEncounters.label'),
      value: o?.activeEncounters ?? '—',
      sub: t('stats.activeEncounters.sub'),
      icon: Stethoscope,
      href: activeEncountersHref,
    });
    stats.push({
      key: 'noShowsToday',
      label: t('stats.noShowsToday.label'),
      value: o?.appointments.noShow ?? '—',
      sub: t('stats.noShowsToday.sub'),
      icon: UserX,
      href: `/dashboard/appointments?status=NO_SHOW&date=${today}`,
    });
    if (canSeeCompleted) {
      stats.push({
        key: 'completed',
        label: t('stats.completedToday.label'),
        value: o?.appointments.completed ?? '—',
        sub: t('stats.completedToday.sub'),
        icon: CheckCircle2,
        href: `/dashboard/appointments?status=COMPLETED&date=${today}`,
      });
    }
    if (canSeeFollowUps) {
      stats.push({
        key: 'followUps',
        label: t('stats.followUpsDue.label'),
        value: o?.followUpsDue ?? '—',
        sub: t('stats.followUpsDue.sub'),
        icon: CalendarClock,
        href: followUpsHref,
        annotation:
          (o?.followUpsOverdue ?? 0) > 0
            ? t('stats.followUpsDue.overdue', { count: o?.followUpsOverdue ?? 0 })
            : undefined,
        annotationUrgent: (o?.followUpsOverdue ?? 0) > 0,
      });
    }
  }

  if (canSeeLabs) {
    stats.push({
      key: 'pendingLabs',
      label: t('stats.pendingLabs.label'),
      value: o?.labOrders.pending ?? '—',
      sub: t('stats.pendingLabs.sub'),
      icon: FlaskConical,
      href: role === 'NURSE' ? undefined : '/dashboard/technician/labs',
    });
    stats.push({
      key: 'pendingRadiology',
      label: t('stats.pendingRadiology.label'),
      value: o?.radiologyOrders.pending ?? '—',
      sub: t('stats.pendingRadiology.sub'),
      icon: ScanLine,
      href: role === 'NURSE' ? undefined : '/dashboard/technician/radiology',
    });
  }

  if (canSeeWorkload) {
    stats.push({
      key: 'labsCompletedToday',
      label: t('stats.labsCompletedToday.label'),
      value: o?.labOrders.completedToday ?? '—',
      sub: t('stats.labsCompletedToday.sub'),
      icon: FlaskConical,
    });
    stats.push({
      key: 'radiologyCompletedToday',
      label: t('stats.radiologyCompletedToday.label'),
      value: o?.radiologyOrders.completedToday ?? '—',
      sub: t('stats.radiologyCompletedToday.sub'),
      icon: ScanLine,
    });
  }

  if (canSeeNewPatients) {
    stats.push({
      key: 'newPatients',
      label: t('stats.newPatients.label'),
      value: o?.newPatients ?? '—',
      sub: t('stats.newPatients.sub'),
      icon: UserPlus,
      href: '/dashboard/patients',
    });
  }

  const appointments = canSeeOps ? (todayAppts?.data ?? []) : [];
  const activeQueue  = canSeeOps ? (liveQueue?.data ?? []) : [];

  const alerts: Array<{ key: string; text: string; href: string }> = [];
  if (!overviewError && overview) {
    if (canSeeFollowUps && (o?.followUpsOverdue ?? 0) > 0) {
      alerts.push({
        key: 'overdueFollowUps',
        text: t('alerts.overdueFollowUps', { count: o?.followUpsOverdue ?? 0 }),
        href: followUpsHref,
      });
    }
    if (canSeeLabs && role !== 'NURSE' && (o?.labOrders.pending ?? 0) > ALERT_LABS_THRESHOLD) {
      alerts.push({
        key: 'pendingLabs',
        text: t('alerts.pendingLabs', { count: o?.labOrders.pending ?? 0 }),
        href: '/dashboard/technician/labs',
      });
    }
    if (canSeeLabs && role !== 'NURSE' && (o?.radiologyOrders.pending ?? 0) > ALERT_RADIOLOGY_THRESHOLD) {
      alerts.push({
        key: 'pendingRadiology',
        text: t('alerts.pendingRadiology', { count: o?.radiologyOrders.pending ?? 0 }),
        href: '/dashboard/technician/radiology',
      });
    }
    if (canSeeBilling && overview.billing && overview.billing.unpaidInvoiceCount > ALERT_INVOICES_THRESHOLD) {
      alerts.push({
        key: 'unpaidInvoices',
        text: t('alerts.unpaidInvoices', { count: overview.billing.unpaidInvoiceCount }),
        href: '/dashboard/invoices',
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">
          {user
            ? `${user.firstName} ${user.lastName} · ${formatRole(role)}`
            : '…'}
        </p>
      </div>

      {overviewError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {t('errors.overviewFailed')}
        </div>
      )}

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      {stats.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const cardClass = `rounded-xl border bg-card p-6 shadow-sm transition-colors ${
              stat.urgent ? 'border-primary/30' : ''
            }`;
            const cardBody = (
              <>
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <Icon className={`h-4 w-4 shrink-0 ${stat.urgent ? 'text-primary' : 'text-muted-foreground/50'}`} />
                </div>
                <p className={`mt-2 text-3xl font-bold tabular-nums ${stat.urgent ? 'text-primary' : ''}`}>
                  {stat.value}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{stat.sub}</p>
                  {stat.live && (
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                      {t('live')}
                    </span>
                  )}
                </div>
                {stat.annotation && (
                  <p className={`mt-0.5 text-xs ${stat.annotationUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                    {stat.annotation}
                  </p>
                )}
              </>
            );
            if (stat.href) {
              return (
                <Link
                  key={stat.key}
                  href={stat.href}
                  className={`${cardClass} hover:border-primary/40`}
                >
                  {cardBody}
                </Link>
              );
            }
            return (
              <div key={stat.key} className={cardClass}>
                {cardBody}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Alerts strip ─────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alerts.map((alert) => (
            <Link
              key={alert.key}
              href={alert.href}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 transition-colors hover:border-amber-300 hover:bg-amber-100 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {alert.text}
            </Link>
          ))}
        </div>
      )}

      {/* ── Billing cards (SA / ORG_ADMIN / ACCOUNTANT only) ─────────────── */}
      {canSeeBilling && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/dashboard/reports/billing"
            className="rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-primary/40"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-muted-foreground">{t('stats.collectedToday.label')}</p>
              <Banknote className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {overview?.billing ? formatAmount(overview.billing.collectedToday, locale) : '—'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t('stats.collectedToday.sub')}</p>
            {overview?.billing && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('stats.collectedToday.annotation', { rate: overview.billing.collectionRateToday })}
              </p>
            )}
          </Link>
          <Link
            href="/dashboard/reports/billing"
            className="rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-primary/40"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-muted-foreground">{t('stats.invoicedToday.label')}</p>
              <Receipt className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
              {overview?.billing ? formatAmount(overview.billing.invoicedToday ?? 0, locale) : '—'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t('stats.invoicedToday.sub')}</p>
          </Link>
          <Link
            href="/dashboard/reports/billing"
            className="rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-primary/40"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-muted-foreground">{t('stats.outstandingBalance.label')}</p>
              <Wallet className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {overview?.billing ? formatAmount(overview.billing.outstandingAllTime, locale) : '—'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t('stats.outstandingBalance.sub')}</p>
            {overview?.billing && overview.billing.unpaidInvoiceCount > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('stats.outstandingBalance.annotation', { count: overview.billing.unpaidInvoiceCount })}
              </p>
            )}
          </Link>
        </div>
      )}

      {/* ── Two-column content (ops roles only) ──────────────────────────── */}
      {canSeeOps && (
        <div className="grid gap-6 lg:grid-cols-5">

          {/* Today's appointments — wider column */}
          <div className="rounded-xl border bg-card shadow-sm lg:col-span-3">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base font-semibold">{t('sections.todayAppointments')}</h2>
              <Link
                href="/dashboard/appointments"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {t('actions.viewAll')}
              </Link>
            </div>

            {appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">
                  {t('empty.noAppointmentsToday')}
                </p>
                <Link
                  href="/dashboard/appointments/new"
                  className="mt-3 text-xs text-primary hover:underline"
                >
                  {t('actions.scheduleAppointment')}
                </Link>
              </div>
            ) : (
              <ul className="divide-y">
                {appointments.map((appt: Appointment) => (
                  <li key={appt.id} className="flex items-center justify-between px-6 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {appt.patient.firstName} {appt.patient.lastName}
                        <span className="ms-2 text-xs font-normal text-muted-foreground" dir="ltr">
                          {appt.patient.mrn}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimeDisplay(appt.scheduledAt)} · {t('doctorPrefix')} {appt.doctor.user.lastName}
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
                <h2 className="text-base font-semibold">{t('sections.liveQueue')}</h2>
                {activeQueue.length > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                    {activeQueue.length}
                  </span>
                )}
              </div>
              <Link
                href={waitingHref}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {t('actions.manage')}
              </Link>
            </div>

            {activeQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Clock className="h-7 w-7 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">{t('empty.queueClear')}</p>
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
                        <span>{relativeWait(entry.createdAt, tQueue('justNow'), tDuration('minuteShort'), tDuration('hourShort'))}</span>
                        <span>·</span>
                        <span>{t('doctorPrefix')} {entry.appointment.doctor.user.lastName}</span>
                      </p>
                    </div>
                    <QueueStatusBadge status={entry.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
