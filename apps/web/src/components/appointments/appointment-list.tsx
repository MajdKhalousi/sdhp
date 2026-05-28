'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarX2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useAppointments, useDoctorsList } from '@/hooks/use-appointments';
import { AppointmentStatusBadge } from './appointment-status-badge';
import { CheckInButton } from '@/components/queue/check-in-button';
import { NoShowButton } from './no-show-button';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppointmentStatus } from '@/types/appointment';

const NO_SHOW_ELIGIBLE: AppointmentStatus[] = ['SCHEDULED', 'CONFIRMED'];

const ALL_STATUSES: AppointmentStatus[] = [
  'SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_QUEUE',
  'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW',
];

function formatDateTime(iso: string, locale = 'en-US') {
  return new Date(iso).toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const LIMIT = 20;

export function AppointmentList() {
  const t = useTranslations('appointment');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const displayLocale = locale === 'ar' ? 'ar-SY' : 'en-US';

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
        aria-label={t('list.filter.byStatus')}
      >
        <option value="">{tCommon('filter.allStatuses')}</option>
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>{t(`status.${s}` as Parameters<typeof t>[0])}</option>
        ))}
      </select>

      <input
        type="date"
        value={date}
        onChange={(e) => { setDate(e.target.value); handleFilterChange(); }}
        className="h-8 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        aria-label={t('list.filter.byDate')}
      />

      <select
        value={doctorId}
        onChange={(e) => { setDoctorId(e.target.value); handleFilterChange(); }}
        className="h-8 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        aria-label={t('list.filter.byDoctor')}
      >
        <option value="">{tCommon('filter.allDoctors')}</option>
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
          {tCommon('filter.clearFilters')}
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
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                {[
                  t('list.columns.patient'),
                  t('list.columns.doctor'),
                  t('list.columns.scheduled'),
                  t('list.columns.duration'),
                  t('list.columns.status'),
                  '',
                ].map((h) => (
                  <th key={h} className="px-4 py-3 text-start font-medium">{h}</th>
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
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-4">
        {filters}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-16 text-center">
          <p className="text-sm font-medium text-destructive">{t('list.error.loadFailed')}</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            {error instanceof Error ? error.message : tCommon('states.error')}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-1 h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
          >
            {tCommon('actions.tryAgain')}
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
          <p className="text-sm font-medium">{t('list.empty.heading')}</p>
          <p className="text-xs text-muted-foreground">
            {status || date || doctorId
              ? t('list.empty.withFilters')
              : t('list.empty.noData')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filters}

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{t('list.columns.patient')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('list.columns.doctor')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('list.columns.scheduled')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('list.columns.duration')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('list.columns.status')}</th>
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
                  <Link href={`/dashboard/patients/${appt.patient.id}`}>
                    <p className="text-sm font-medium hover:underline">
                      {appt.patient.firstName} {appt.patient.lastName}
                    </p>
                  </Link>
                  <p className="text-xs text-muted-foreground" dir="ltr">{appt.patient.mrn}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm">
                    Dr. {appt.doctor.user.firstName} {appt.doctor.user.lastName}
                  </p>
                  {appt.doctor.specialization && (
                    <p className="text-xs text-muted-foreground">{appt.doctor.specialization}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap" dir="ltr">{formatDateTime(appt.scheduledAt, displayLocale)}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {t('list.durationMinutes', { count: appt.durationMin })}
                </td>
                <td className="px-4 py-3">
                  <AppointmentStatusBadge status={appt.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {NO_SHOW_ELIGIBLE.includes(appt.status) && (
                      <CheckInButton appointmentId={appt.id} />
                    )}
                    {NO_SHOW_ELIGIBLE.includes(appt.status) && (
                      <NoShowButton appointmentId={appt.id} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {tCommon('pagination.summary', { page, total: totalPages, count: data.total })}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors hover:bg-accent disabled:opacity-40"
              aria-label={tCommon('pagination.previous')}
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors hover:bg-accent disabled:opacity-40"
              aria-label={tCommon('pagination.next')}
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
