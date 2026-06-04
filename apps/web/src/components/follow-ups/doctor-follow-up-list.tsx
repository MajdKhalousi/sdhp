'use client';

import { Fragment, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Clock, AlertTriangle, XCircle, Hourglass, CalendarClock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useFollowUps, useFollowUpSummary } from '@/hooks/use-follow-ups';
import { Tabs } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { FollowUpStatusBadge } from './follow-up-status-badge';
import { AppointmentStatusBadge } from '@/components/appointments/appointment-status-badge';
import { FollowUpBookingPanel } from '@/components/encounters/follow-up-booking-panel';
import type { FollowUpStatus } from '@/types/follow-up';
import type { AppointmentStatus } from '@/types/appointment';
import { formatDateDisplay, formatDateTimeDisplay } from '@/lib/format-date';

const LIMIT = 20;

const TAB_ORDER: FollowUpStatus[] = ['DUE_TODAY', 'OVERDUE', 'PENDING', 'UPCOMING', 'MISSED'];

const TAB_LABEL_KEY: Record<FollowUpStatus, string> = {
  DUE_TODAY: 'tabs.dueToday',
  MISSED:    'tabs.missed',
  OVERDUE:   'tabs.overdue',
  PENDING:   'tabs.pending',
  UPCOMING:  'tabs.upcoming',
  COMPLETED: 'tabs.upcoming', // not used as tab
};

const EMPTY_ICON: Record<FollowUpStatus, React.ComponentType<{ className?: string }>> = {
  DUE_TODAY: Clock,
  MISSED:    XCircle,
  OVERDUE:   AlertTriangle,
  PENDING:   Hourglass,
  UPCOMING:  CalendarClock,
  COMPLETED: CalendarClock,
};

const EMPTY_KEY: Record<FollowUpStatus, string> = {
  DUE_TODAY: 'empty.dueToday',
  MISSED:    'empty.missed',
  OVERDUE:   'empty.overdue',
  PENDING:   'empty.pending',
  UPCOMING:  'empty.upcoming',
  COMPLETED: 'empty.upcoming',
};

export function DoctorFollowUpList() {
  const t = useTranslations('followups');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<FollowUpStatus>('DUE_TODAY');
  const [expandedEncounterId, setExpandedEncounterId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useFollowUps({
    status: [activeTab],
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    page,
    limit: LIMIT,
  });

  const { data: summary } = useFollowUpSummary();
  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  const SUMMARY_KEY: Partial<Record<FollowUpStatus, keyof NonNullable<typeof summary>>> = {
    DUE_TODAY: 'dueToday',
    OVERDUE:   'overdue',
    PENDING:   'pending',
    UPCOMING:  'upcoming',
    MISSED:    'missed',
  };

  const tabs = TAB_ORDER.map((s) => {
    const key = SUMMARY_KEY[s];
    const count = key && summary ? (summary[key] ?? 0) : 0;
    return {
      value: s,
      label: t(TAB_LABEL_KEY[s] as Parameters<typeof t>[0]),
      badge: count > 0 ? count : undefined,
    };
  });

  function handleTabChange(tab: string) {
    setActiveTab(tab as FollowUpStatus);
    setPage(1);
    setExpandedEncounterId(null);
  }

  function handleFilterChange() {
    setPage(1);
    setExpandedEncounterId(null);
  }

  function formatDaysDelta(delta: number | null): string {
    if (delta === null) return '—';
    if (delta === 0) return t('daysDelta.onTime');
    if (delta > 0) return t('daysDelta.late', { days: delta });
    return t('daysDelta.early', { days: Math.abs(delta) });
  }

  const hasFilters = !!(dateFrom || dateTo);

  const COLUMNS = [
    t('columns.patient'),
    t('columns.recommendedDate'),
    t('columns.status'),
    t('columns.daysDelta'),
    t('columns.linkedAppointment'),
    '',
  ];

  const EmptyIcon = EMPTY_ICON[activeTab];
  const emptyKey = hasFilters ? 'empty.withFilters' : EMPTY_KEY[activeTab];

  const filters = (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        dir="ltr"
        value={dateFrom}
        onChange={(e) => { setDateFrom(e.target.value); handleFilterChange(); }}
        className="h-8 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        aria-label={t('filter.dateFrom')}
      />
      <input
        type="date"
        dir="ltr"
        value={dateTo}
        onChange={(e) => { setDateTo(e.target.value); handleFilterChange(); }}
        className="h-8 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        aria-label={t('filter.dateTo')}
      />
      {hasFilters && (
        <button
          onClick={() => { setDateFrom(''); setDateTo(''); handleFilterChange(); }}
          className="h-8 rounded-md border px-3 text-xs text-muted-foreground transition-colors hover:bg-accent"
        >
          {tCommon('filter.clearFilters')}
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <Tabs
        tabs={tabs}
        value={activeTab}
        onChange={handleTabChange}
        aria-label={t('doctorView.title')}
      />

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {filters}
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    {COLUMNS.map((h, i) => (
                      <th key={i} className="px-4 py-3 text-start font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t border-border">
                      {COLUMNS.map((__, j) => (
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
      )}

      {/* Error */}
      {!isLoading && isError && (
        <div className="space-y-4">
          {filters}
          <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-16 text-center">
            <p className="text-sm font-medium text-destructive">{t('error.loadFailed')}</p>
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
      )}

      {/* Empty */}
      {!isLoading && !isError && (!data || data.data.length === 0) && (
        <div className="space-y-4">
          {filters}
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <EmptyIcon className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">
              {t(emptyKey as Parameters<typeof t>[0])}
            </p>
          </div>
        </div>
      )}

      {/* Data table */}
      {!isLoading && !isError && data && data.data.length > 0 && (
        <div className="space-y-4">
          {filters}

          <div className="overflow-hidden rounded-xl border border-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    {COLUMNS.map((h, i) => (
                      <th key={i} className="px-4 py-3 text-start font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((item) => (
                    <Fragment key={item.encounterId}>
                      <tr className="border-t border-border transition-colors hover:bg-muted/20">
                        {/* Patient */}
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium">
                            {item.patient.firstName} {item.patient.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground" dir="ltr">{item.patient.mrn}</p>
                          {item.patient.phone && (
                            <p className="text-xs text-muted-foreground" dir="ltr">{item.patient.phone}</p>
                          )}
                        </td>

                        {/* Recommended Date */}
                        <td className="px-4 py-3 text-sm whitespace-nowrap" dir="ltr">
                          {formatDateDisplay(item.followUpDate)}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <FollowUpStatusBadge status={item.followUpStatus} />
                        </td>

                        {/* Days Delta */}
                        <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                          {formatDaysDelta(item.daysDelta)}
                        </td>

                        {/* Linked Appointment */}
                        <td className="px-4 py-3">
                          {item.linkedAppointment ? (
                            <div>
                              <p className="text-sm whitespace-nowrap" dir="ltr">
                                {formatDateTimeDisplay(item.linkedAppointment.scheduledAt)}
                              </p>
                              <AppointmentStatusBadge status={item.linkedAppointment.status as AppointmentStatus} />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {!item.linkedAppointment && (
                              <button
                                onClick={() =>
                                  setExpandedEncounterId(
                                    expandedEncounterId === item.encounterId ? null : item.encounterId,
                                  )
                                }
                                className="h-7 rounded-md border border-primary/40 px-2 text-xs font-medium text-primary transition-colors hover:bg-primary/5 inline-flex items-center"
                              >
                                {t('actions.bookNow')}
                              </button>
                            )}
                            <Link
                              href={`/dashboard/doctor/encounter/${item.encounterId}`}
                              className="h-7 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 inline-flex items-center"
                            >
                              {t('actions.openEncounter')}
                            </Link>
                            <Link
                              href={`/dashboard/patients/${item.patient.id}`}
                              className="h-7 rounded-md border px-2 text-xs text-muted-foreground transition-colors hover:bg-accent inline-flex items-center"
                            >
                              {t('actions.viewPatient')}
                            </Link>
                          </div>
                        </td>
                      </tr>

                      {/* Inline booking panel */}
                      {expandedEncounterId === item.encounterId && (
                        <tr className="border-t border-border">
                          <td colSpan={6} className="p-0">
                            <div className="bg-muted/20 px-4 py-4">
                              <FollowUpBookingPanel
                                encounterId={item.encounterId}
                                patientId={item.patient.id}
                                defaultDoctorId={item.doctor.id}
                                followUpDate={item.followUpDate}
                                initialShowForm={true}
                                onSuccess={() => {
                                  setExpandedEncounterId(null);
                                  void queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
      )}
    </div>
  );
}
