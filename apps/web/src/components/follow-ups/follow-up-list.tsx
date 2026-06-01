'use client';

import { Fragment, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarX2, AlertTriangle, Clock } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useFollowUps } from '@/hooks/use-follow-ups';
import { useDoctorsList } from '@/hooks/use-appointments';
import { useCreateReminder } from '@/hooks/use-follow-up-reminders';
import { useToast } from '@/hooks/use-toast';
import { Tabs } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { FollowUpStatusBadge } from './follow-up-status-badge';
import { FollowUpBookingPanel } from '@/components/encounters/follow-up-booking-panel';
import type { FollowUpStatus } from '@/types/follow-up';

const LIMIT = 20;

const TAB_ORDER: FollowUpStatus[] = ['DUE_TODAY', 'OVERDUE', 'UPCOMING'];

const EMPTY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  DUE_TODAY: Clock,
  OVERDUE:   AlertTriangle,
  UPCOMING:  CalendarX2,
};

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function FollowUpList() {
  const t = useTranslations('followups');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const displayLocale = locale === 'ar' ? 'ar-SY' : 'en-US';

  const { toast } = useToast();
  const createReminder = useCreateReminder();

  const [activeTab, setActiveTab] = useState<FollowUpStatus>('DUE_TODAY');
  const [doctorId, setDoctorId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [expandedEncounterId, setExpandedEncounterId] = useState<string | null>(null);

  function handleSendReminder(encounterId: string) {
    createReminder.mutate(
      { encounterId, body: { channel: 'IN_APP' } },
      {
        onSuccess: () => toast({ title: t('reminder.queued'), variant: 'success' }),
        onError: (err: unknown) => {
          const isDuplicate =
            err instanceof Error && err.name === 'ConflictError';
          toast({
            title: isDuplicate ? t('reminder.alreadyQueued') : t('reminder.failed'),
            variant: isDuplicate ? 'default' : 'error',
          });
        },
      },
    );
  }

  const showReminderButton = activeTab !== 'UPCOMING';

  const { data, isLoading, isError, error, refetch } = useFollowUps({
    status: [activeTab],
    ...(doctorId ? { doctorId } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    page,
    limit: LIMIT,
  });

  const { data: doctorsData } = useDoctorsList();
  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  const tabs = TAB_ORDER.map((s) => ({
    value: s,
    label: t(`tabs.${s === 'DUE_TODAY' ? 'dueToday' : s === 'OVERDUE' ? 'overdue' : 'upcoming'}` as Parameters<typeof t>[0]),
  }));

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

  const hasFilters = !!(doctorId || dateFrom || dateTo);

  const COLUMNS = [
    t('columns.patient'),
    t('columns.doctor'),
    t('columns.recommendedDate'),
    t('columns.status'),
    t('columns.daysDelta'),
    t('columns.linkedAppointment'),
    '',
  ];

  const filters = (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={doctorId}
        onChange={(e) => { setDoctorId(e.target.value); handleFilterChange(); }}
        className="h-8 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        aria-label={t('filter.byDoctor')}
      >
        <option value="">{tCommon('filter.allDoctors')}</option>
        {doctorsData?.data.map((d) => (
          <option key={d.id} value={d.id}>
            Dr. {d.user.firstName} {d.user.lastName}
          </option>
        ))}
      </select>

      <input
        type="date"
        dir="ltr"
        value={dateFrom}
        onChange={(e) => { setDateFrom(e.target.value); handleFilterChange(); }}
        className="h-8 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        aria-label={t('filter.dateFrom')}
        placeholder={t('filter.dateFrom')}
      />

      <input
        type="date"
        dir="ltr"
        value={dateTo}
        onChange={(e) => { setDateTo(e.target.value); handleFilterChange(); }}
        className="h-8 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        aria-label={t('filter.dateTo')}
        placeholder={t('filter.dateTo')}
      />

      {hasFilters && (
        <button
          onClick={() => { setDoctorId(''); setDateFrom(''); setDateTo(''); handleFilterChange(); }}
          className="h-8 rounded-md border px-3 text-xs text-muted-foreground transition-colors hover:bg-accent"
        >
          {tCommon('filter.clearFilters')}
        </button>
      )}
    </div>
  );

  const EmptyIcon = EMPTY_ICON[activeTab] ?? CalendarX2;

  const emptyKey = activeTab === 'DUE_TODAY' ? 'empty.dueToday' : activeTab === 'OVERDUE' ? 'empty.overdue' : 'empty.upcoming';

  return (
    <div className="space-y-4">
      <Tabs
        tabs={tabs}
        value={activeTab}
        onChange={handleTabChange}
        aria-label={t('title')}
      />

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {filters}
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
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
              {hasFilters ? t('empty.withFilters') : t(emptyKey as Parameters<typeof t>[0])}
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
              <table className="w-full min-w-[900px]">
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
                          <Link href={`/dashboard/patients/${item.patient.id}`}>
                            <p className="text-sm font-medium hover:underline">
                              {item.patient.firstName} {item.patient.lastName}
                            </p>
                          </Link>
                          <p className="text-xs text-muted-foreground" dir="ltr">{item.patient.mrn}</p>
                          {item.patient.phone && (
                            <p className="text-xs text-muted-foreground" dir="ltr">{item.patient.phone}</p>
                          )}
                        </td>

                        {/* Doctor */}
                        <td className="px-4 py-3">
                          <p className="text-sm">
                            Dr. {item.doctor.firstName} {item.doctor.lastName}
                          </p>
                          {item.doctor.specialization && (
                            <p className="text-xs text-muted-foreground">{item.doctor.specialization}</p>
                          )}
                        </td>

                        {/* Recommended Date */}
                        <td className="px-4 py-3 text-sm whitespace-nowrap" dir="ltr">
                          {formatDate(item.followUpDate, displayLocale)}
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
                                {formatDateTime(item.linkedAppointment.scheduledAt, displayLocale)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Dr. {item.linkedAppointment.doctor.firstName} {item.linkedAppointment.doctor.lastName}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.linkedAppointment ? (
                              <Link
                                href={`/dashboard/appointments/${item.linkedAppointment.id}`}
                                className="h-7 rounded-md border px-2 text-xs text-muted-foreground transition-colors hover:bg-accent"
                              >
                                {t('actions.viewAppointment')}
                              </Link>
                            ) : (
                              <button
                                onClick={() =>
                                  setExpandedEncounterId(
                                    expandedEncounterId === item.encounterId ? null : item.encounterId,
                                  )
                                }
                                className="h-7 rounded-md border border-primary/40 px-2 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
                              >
                                {t('actions.bookNow')}
                              </button>
                            )}
                            {showReminderButton && (
                              <button
                                onClick={() => handleSendReminder(item.encounterId)}
                                disabled={createReminder.isPending}
                                className="h-7 rounded-md border px-2 text-xs text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
                              >
                                {t('actions.sendReminder')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Inline booking panel */}
                      {expandedEncounterId === item.encounterId && (
                        <tr className="border-t border-border">
                          <td colSpan={7} className="p-0">
                            <div className="bg-muted/20 px-4 py-4">
                              <FollowUpBookingPanel
                                encounterId={item.encounterId}
                                patientId={item.patient.id}
                                defaultDoctorId={item.doctor.id}
                                followUpDate={item.followUpDate}
                                initialShowForm={true}
                                onSuccess={() => setExpandedEncounterId(null)}
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
