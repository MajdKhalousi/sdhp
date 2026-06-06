'use client';

import { Fragment, useState, useMemo, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CalendarX2, AlertTriangle, Clock, UserX, MoreHorizontal } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useFollowUps, useFollowUpSummary } from '@/hooks/use-follow-ups';
import { useDoctorsList } from '@/hooks/use-appointments';
import {
  useCreateReminder,
  useUpdateFollowUpReminder,
  useFollowUpReminders,
  useRecordFollowUpResponse,
} from '@/hooks/use-follow-up-reminders';
import type { ReminderItem, PatientResponseStatus } from '@/hooks/use-follow-up-reminders';
import { useToast } from '@/hooks/use-toast';
import { Tabs } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { FollowUpStatusBadge } from './follow-up-status-badge';
import { FollowUpBookingPanel } from '@/components/encounters/follow-up-booking-panel';
import type { FollowUpItem, FollowUpStatus } from '@/types/follow-up';
import { formatDateDisplay, formatDateTimeDisplay, formatTimeDisplay } from '@/lib/format-date';
import { normalizePhoneForWhatsApp, buildWhatsAppMessage } from '@/lib/format-phone';

const LIMIT = 20;

const TAB_ORDER: FollowUpStatus[] = ['DUE_TODAY', 'OVERDUE', 'PENDING', 'UPCOMING', 'MISSED'];

const EMPTY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  DUE_TODAY: Clock,
  OVERDUE:   AlertTriangle,
  PENDING:   Clock,
  UPCOMING:  CalendarX2,
  MISSED:    UserX,
};

// ── Per-row component — owns its own reminder state, independent per row ──────

interface FollowUpRowProps {
  item: FollowUpItem;
  showReminderButton: boolean;
  expandedEncounterId: string | null;
  setExpandedEncounterId: (id: string | null) => void;
}

function FollowUpRow({
  item,
  showReminderButton,
  expandedEncounterId,
  setExpandedEncounterId,
}: FollowUpRowProps) {
  const t = useTranslations('followups');
  const locale = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createReminder = useCreateReminder();
  const updateReminder = useUpdateFollowUpReminder();
  const recordResponse = useRecordFollowUpResponse();

  // Fetch existing reminders for this encounter on mount — drives initial button state
  const { data: remindersData, refetch: refetchReminders } = useFollowUpReminders(item.encounterId);

  // Optimistic override: set immediately on mutation success to avoid UI flash during refetch
  const [localState, setLocalState] = useState<{ reminderId: string; status: 'PENDING' | 'SENT' } | null>(null);
  const [isPendingCreate, setIsPendingCreate] = useState(false);
  const [isPendingContact, setIsPendingContact] = useState(false);
  const [isPendingResponse, setIsPendingResponse] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuFloatRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        menuFloatRef.current && !menuFloatRef.current.contains(target)
      ) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMenuOpen]);

  // Derive authoritative state from server data: PENDING takes priority over SENT
  const backendState = useMemo(() => {
    if (!remindersData?.length) return null;
    const pending = remindersData.find((r) => r.status === 'PENDING');
    if (pending) return { reminderId: pending.id, status: 'PENDING' as const, patientResponse: pending.patientResponse };
    const sent = remindersData.find((r) => r.status === 'SENT');
    if (sent) return { reminderId: sent.id, status: 'SENT' as const, patientResponse: sent.patientResponse };
    return null;
  }, [remindersData]);

  // Local state wins in-session; backend state drives fresh page loads
  const reminderState = localState ?? backendState;

  function handleSendReminder() {
    setIsPendingCreate(true);
    createReminder.mutate(
      { encounterId: item.encounterId, body: { channel: 'IN_APP' } },
      {
        onSuccess: (result: ReminderItem) => {
          setIsPendingCreate(false);
          setLocalState({ reminderId: result.id, status: 'PENDING' });
          toast({ title: t('reminder.queued'), variant: 'success' });
        },
        onError: (err: unknown) => {
          setIsPendingCreate(false);
          const isDuplicate = err instanceof Error && err.name === 'ConflictError';
          if (isDuplicate) {
            // An existing PENDING reminder is in the DB but not in local state — fetch it
            void refetchReminders();
          }
          toast({
            title: isDuplicate ? t('reminder.alreadyQueued') : t('reminder.failed'),
            variant: isDuplicate ? 'default' : 'error',
          });
        },
      },
    );
  }

  function handleMarkContacted() {
    if (!reminderState || reminderState.status !== 'PENDING') return;
    const { reminderId } = reminderState;
    setIsPendingContact(true);
    updateReminder.mutate(
      { encounterId: item.encounterId, reminderId, body: { status: 'SENT' } },
      {
        onSuccess: () => {
          setIsPendingContact(false);
          setLocalState({ reminderId, status: 'SENT' });
          toast({ title: t('reminders.sent'), variant: 'success' });
        },
        onError: () => {
          setIsPendingContact(false);
          toast({ title: t('reminder.failed'), variant: 'error' });
        },
      },
    );
  }

  function handleRecordResponse(value: PatientResponseStatus) {
    if (!reminderState) return;
    const { reminderId } = reminderState;
    setIsPendingResponse(true);
    recordResponse.mutate(
      { encounterId: item.encounterId, reminderId, patientResponse: value },
      {
        onSuccess: () => {
          setIsPendingResponse(false);
          void refetchReminders();
          toast({ title: t('patientResponse.recorded'), variant: 'success' });
        },
        onError: () => {
          setIsPendingResponse(false);
          toast({ title: t('patientResponse.failed'), variant: 'error' });
        },
      },
    );
  }

  const normalizedPhone = normalizePhoneForWhatsApp(item.patient.phone);
  const whatsAppHref = (() => {
    if (!normalizedPhone) return null;
    const apptDoctor = item.linkedAppointment?.doctor ?? item.doctor;
    const rawTime = item.linkedAppointment ? formatTimeDisplay(item.linkedAppointment.scheduledAt) : undefined;
    const message = buildWhatsAppMessage({
      locale,
      patientName: `${item.patient.firstName} ${item.patient.lastName}`,
      doctorName: `${apptDoctor.firstName} ${apptDoctor.lastName}`,
      followUpDate: formatDateDisplay(item.followUpDate),
      appointmentTime: rawTime && rawTime !== '—' ? rawTime : undefined,
    });
    return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
  })();

  const isExpanded = expandedEncounterId === item.encounterId;

  return (
    <Fragment>
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
            {t('doctorPrefix')} {item.doctor.firstName} {item.doctor.lastName}
          </p>
          {item.doctor.specialization && (
            <p className="text-xs text-muted-foreground">{item.doctor.specialization}</p>
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
          {item.daysDelta === null
            ? '—'
            : item.daysDelta === 0
              ? t('daysDelta.onTime')
              : item.daysDelta > 0
                ? t('daysDelta.late', { days: item.daysDelta })
                : t('daysDelta.early', { days: Math.abs(item.daysDelta) })}
        </td>

        {/* Linked Appointment */}
        <td className="px-4 py-3">
          {item.linkedAppointment ? (
            <div>
              <p className="text-sm whitespace-nowrap" dir="ltr">
                {formatDateTimeDisplay(item.linkedAppointment.scheduledAt)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('doctorPrefix')} {item.linkedAppointment.doctor.firstName}{' '}
                {item.linkedAppointment.doctor.lastName}
              </p>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2">
            {/* Status labels — always visible when present, never hidden in menu */}
            {showReminderButton && reminderState?.status === 'SENT' && (
              <span className="whitespace-nowrap text-xs font-medium text-green-700 dark:text-green-400">
                {t('reminders.sent')}
              </span>
            )}
            {showReminderButton && reminderState !== null && backendState?.patientResponse != null && (
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {t('patientResponse.label')}: {t(`patientResponse.${backendState.patientResponse}` as Parameters<typeof t>[0])}
              </span>
            )}

            {/* Actions dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                ref={triggerRef}
                onClick={() => {
                  if (!isMenuOpen && triggerRef.current) {
                    const rect = triggerRef.current.getBoundingClientRect();
                    setMenuStyle({
                      position: 'fixed',
                      top: rect.bottom + 4,
                      ...(locale === 'ar' ? { left: rect.left } : { right: window.innerWidth - rect.right }),
                      minWidth: 180,
                      zIndex: 9999,
                    });
                  }
                  setIsMenuOpen((v) => !v);
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent"
                aria-label={t('columns.actions')}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {isMenuOpen && (
                <div ref={menuFloatRef} style={menuStyle} className="rounded-md border bg-background shadow-md">
                  {/* Appointment */}
                  {item.linkedAppointment ? (
                    <Link
                      href={`/dashboard/appointments/${item.linkedAppointment.id}`}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex w-full items-center px-3 py-2 text-xs transition-colors hover:bg-accent"
                    >
                      {t('actions.viewAppointment')}
                    </Link>
                  ) : (
                    <button
                      onClick={() => {
                        setExpandedEncounterId(isExpanded ? null : item.encounterId);
                        setIsMenuOpen(false);
                      }}
                      className="flex w-full items-center px-3 py-2 text-xs text-primary transition-colors hover:bg-accent"
                    >
                      {t('actions.bookNow')}
                    </button>
                  )}

                  {/* Mark as Contacted */}
                  {showReminderButton && reminderState?.status === 'PENDING' && (
                    <>
                      <hr className="border-border" />
                      <button
                        onClick={() => { handleMarkContacted(); setIsMenuOpen(false); }}
                        disabled={isPendingContact}
                        className="flex w-full items-center px-3 py-2 text-xs text-green-700 transition-colors hover:bg-accent disabled:opacity-40 dark:text-green-400"
                      >
                        {isPendingContact ? t('actions.contacting') : t('actions.markContacted')}
                      </button>
                    </>
                  )}

                  {/* Remind */}
                  {showReminderButton && reminderState === null && (
                    <>
                      <hr className="border-border" />
                      <button
                        onClick={() => { handleSendReminder(); setIsMenuOpen(false); }}
                        disabled={isPendingCreate}
                        className="flex w-full items-center px-3 py-2 text-xs transition-colors hover:bg-accent disabled:opacity-40"
                      >
                        {t('actions.sendReminder')}
                      </button>
                    </>
                  )}

                  {/* Record patient response */}
                  {showReminderButton && reminderState !== null && backendState?.patientResponse == null && (
                    <>
                      <hr className="border-border" />
                      <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">
                        {t('patientResponse.prompt')}
                      </p>
                      {(['CONFIRMED', 'NO_RESPONSE', 'DECLINED', 'RESCHEDULE_REQUESTED'] as PatientResponseStatus[]).map((val) => (
                        <button
                          key={val}
                          onClick={() => { handleRecordResponse(val); setIsMenuOpen(false); }}
                          disabled={isPendingResponse}
                          className="flex w-full items-center px-3 py-2 text-xs transition-colors hover:bg-accent disabled:opacity-40"
                        >
                          {t(`patientResponse.${val}` as Parameters<typeof t>[0])}
                        </button>
                      ))}
                    </>
                  )}

                  {/* WhatsApp */}
                  {showReminderButton && (
                    <>
                      <hr className="border-border" />
                      {whatsAppHref ? (
                        <a
                          href={whatsAppHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex w-full items-center px-3 py-2 text-xs text-green-700 transition-colors hover:bg-accent dark:text-green-400"
                        >
                          {t('actions.whatsappReminder')}
                        </a>
                      ) : (
                        <span
                          title={t('whatsapp.noPhone')}
                          className="flex w-full cursor-not-allowed items-center px-3 py-2 text-xs text-muted-foreground/40"
                        >
                          {t('actions.whatsappReminder')}
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </td>
      </tr>

      {/* Inline booking panel */}
      {isExpanded && (
        <tr className="border-t border-border">
          <td colSpan={7} className="p-0">
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
                  void queryClient.invalidateQueries({ queryKey: ['follow-ups-summary'] });
                }}
              />
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

// ── Reception follow-ups list ─────────────────────────────────────────────────

export function FollowUpList() {
  const t = useTranslations('followups');
  const tCommon = useTranslations('common');

  const [activeTab, setActiveTab] = useState<FollowUpStatus>('DUE_TODAY');
  const [doctorId, setDoctorId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedEncounterId, setExpandedEncounterId] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [search]);

  const showReminderButton = activeTab !== 'UPCOMING';

  const { data, isLoading, isError, error, refetch } = useFollowUps({
    status: [activeTab],
    ...(doctorId ? { doctorId } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    page,
    limit: LIMIT,
  });

  const { data: doctorsData } = useDoctorsList();
  const { data: summary } = useFollowUpSummary({
    ...(doctorId ? { doctorId } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo   ? { dateTo }   : {}),
  });
  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  const SUMMARY_BADGE: Record<FollowUpStatus, number> = {
    DUE_TODAY: summary?.dueToday ?? 0,
    OVERDUE:   summary?.overdue  ?? 0,
    PENDING:   summary?.pending  ?? 0,
    UPCOMING:  summary?.upcoming ?? 0,
    MISSED:    summary?.missed   ?? 0,
    COMPLETED: 0,
  };

  const tabs = TAB_ORDER.map((s) => ({
    value: s,
    label: t(
      `tabs.${
        s === 'DUE_TODAY' ? 'dueToday' :
        s === 'OVERDUE'   ? 'overdue'  :
        s === 'PENDING'   ? 'pending'  :
        s === 'MISSED'    ? 'missed'   :
        'upcoming'
      }` as Parameters<typeof t>[0]
    ),
    badge: SUMMARY_BADGE[s] > 0 ? SUMMARY_BADGE[s] : undefined,
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

  const hasFilters = !!(doctorId || dateFrom || dateTo || debouncedSearch);

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
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 min-w-[200px] rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        placeholder={t('search.placeholder')}
        aria-label={t('search.placeholder')}
      />

      <select
        value={doctorId}
        onChange={(e) => { setDoctorId(e.target.value); handleFilterChange(); }}
        className="h-8 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        aria-label={t('filter.byDoctor')}
      >
        <option value="">{tCommon('filter.allDoctors')}</option>
        {doctorsData?.data.map((d) => (
          <option key={d.id} value={d.id}>
            {t('doctorPrefix')} {d.user.firstName} {d.user.lastName}
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
          onClick={() => { setDoctorId(''); setDateFrom(''); setDateTo(''); setSearch(''); setDebouncedSearch(''); handleFilterChange(); }}
          className="h-8 rounded-md border px-3 text-xs text-muted-foreground transition-colors hover:bg-accent"
        >
          {tCommon('filter.clearFilters')}
        </button>
      )}
    </div>
  );

  const EmptyIcon = EMPTY_ICON[activeTab] ?? CalendarX2;

  const emptyKey =
    activeTab === 'DUE_TODAY' ? 'empty.dueToday' :
    activeTab === 'OVERDUE'   ? 'empty.overdue'  :
    activeTab === 'PENDING'   ? 'empty.pending'  :
    activeTab === 'MISSED'    ? 'empty.missed'   :
    'empty.upcoming';

  return (
    <div className="space-y-4">
      <Tabs
        tabs={tabs}
        value={activeTab}
        onChange={handleTabChange}
        aria-label={t('title')}
      />

      {filters}

      {/* Loading */}
      {isLoading && (
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
      )}

      {/* Error */}
      {!isLoading && isError && (
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
      )}

      {/* Empty */}
      {!isLoading && !isError && (!data || data.data.length === 0) && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <EmptyIcon className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">
            {debouncedSearch
              ? t('search.noResults')
              : hasFilters
                ? t('empty.withFilters')
                : t(emptyKey as Parameters<typeof t>[0])}
          </p>
        </div>
      )}

      {/* Data table */}
      {!isLoading && !isError && data && data.data.length > 0 && (
        <Fragment>
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
                    <FollowUpRow
                      key={item.encounterId}
                      item={item}
                      showReminderButton={showReminderButton}
                      expandedEncounterId={expandedEncounterId}
                      setExpandedEncounterId={setExpandedEncounterId}
                    />
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
        </Fragment>
      )}
    </div>
  );
}
