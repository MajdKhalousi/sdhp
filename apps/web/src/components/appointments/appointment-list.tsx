'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, CalendarX2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useAppointments, useDoctorsList, useVisitTypesList } from '@/hooks/use-appointments';
import { useAuthStore } from '@/store/auth';
import { AppointmentStatusBadge } from './appointment-status-badge';
import { CheckInButton } from '@/components/queue/check-in-button';
import { NoShowButton } from './no-show-button';
import { ConfirmButton } from './confirm-button';
import { CancelAppointmentDialog } from './cancel-appointment-dialog';
import { RescheduleDialog } from './reschedule-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvoices } from '@/hooks/use-invoices';
import { InvoiceStatusBadge } from '@/components/billing/invoice-status-badge';
import type { Appointment, AppointmentStatus } from '@/types/appointment';
import type { InvoiceStatus } from '@/types/invoice';
import { formatDateTimeDisplay } from '@/lib/format-date';

const CONFIRM_ELIGIBLE: AppointmentStatus[]    = ['SCHEDULED'];
const CHECKIN_ELIGIBLE: AppointmentStatus[]    = ['SCHEDULED', 'CONFIRMED'];
const NOSHOW_ELIGIBLE: AppointmentStatus[]     = ['SCHEDULED', 'CONFIRMED'];
const RESCHEDULE_ELIGIBLE: AppointmentStatus[] = ['SCHEDULED', 'CONFIRMED'];
const CANCEL_ELIGIBLE: AppointmentStatus[]     = ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_QUEUE', 'IN_PROGRESS'];

const APPOINTMENT_MUTATE_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY']);
const BILLING_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY', 'ACCOUNTANT']);

const ALL_STATUSES: AppointmentStatus[] = [
  'SCHEDULED', 'CONFIRMED', 'IN_QUEUE',
  'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW',
];

function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Damascus' });
}

const LIMIT = 20;

export function AppointmentList() {
  const t = useTranslations('appointment');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { user } = useAuthStore();
  const canMutate = user ? APPOINTMENT_MUTATE_ROLES.has(user.role) : false;
  const canSeeBilling = user ? BILLING_ROLES.has(user.role) : false;
  const displayLocale = locale === 'ar' ? 'ar-u-nu-latn' : 'en-US';

  const searchParams = useSearchParams();
  const [status, setStatus] = useState<AppointmentStatus | ''>(
    (searchParams.get('status') ?? '') as AppointmentStatus | '',
  );
  const [date, setDate] = useState(searchParams.get('date') ?? todayStr());
  const [doctorId, setDoctorId] = useState('');
  const [page, setPage] = useState(1);
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);

  const { data, isLoading, isError, error, refetch } = useAppointments({
    ...(status ? { status: [status] } : {}),
    ...(date ? { date } : {}),
    ...(doctorId ? { doctorId } : {}),
    page,
    limit: LIMIT,
  });

  const { data: doctorsData } = useDoctorsList();
  const { data: visitTypesData } = useVisitTypesList();

  const invoiceFilterDate = date || todayStr();
  const { data: invoicesData } = useInvoices(
    { from: invoiceFilterDate, to: invoiceFilterDate, limit: 100 },
    { enabled: canSeeBilling },
  );
  const invoiceByApptId = useMemo(() => {
    const map = new Map<string, InvoiceStatus>();
    if (!invoicesData?.data) return map;
    for (const inv of invoicesData.data) {
      if (inv.appointmentId) map.set(inv.appointmentId, inv.status);
    }
    return map;
  }, [invoicesData]);

  const getVisitTypeName = (visitTypeId?: string | null) => {
    if (!visitTypeId) return t('list.noVisitType' as Parameters<typeof t>[0]);
    const vt = visitTypesData?.find((v) => v.id === visitTypeId);
    return locale === 'ar' && vt?.nameAr
      ? vt.nameAr
      : (vt?.name ?? t('list.noVisitType' as Parameters<typeof t>[0]));
  };

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

      {date !== '' ? (
        <button
          onClick={() => { setDate(''); setPage(1); }}
          className="h-8 rounded-md border px-3 text-xs text-muted-foreground transition-colors hover:bg-accent"
        >
          {t('list.showAll')}
        </button>
      ) : (
        <button
          onClick={() => { setDate(todayStr()); setPage(1); }}
          className="h-8 rounded-md border px-3 text-xs text-muted-foreground transition-colors hover:bg-accent"
        >
          {t('list.showToday')}
        </button>
      )}

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

      {(status || date !== todayStr() || doctorId) && (
        <button
          onClick={() => { setStatus(''); setDate(todayStr()); setDoctorId(''); setPage(1); }}
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
                  t('list.columns.visitType' as Parameters<typeof t>[0]),
                  t('list.columns.duration'),
                  t('list.columns.status'),
                  ...(canSeeBilling ? [t('list.columns.invoice' as Parameters<typeof t>[0])] : []),
                  '',
                ].map((h) => (
                  <th key={h} className="px-4 py-3 text-start font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-border">
                  {Array.from({ length: canSeeBilling ? 8 : 7 }).map((__, j) => (
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
            {!status && date === todayStr() && !doctorId
              ? t('list.empty.noDataToday')
              : status || date !== todayStr() || doctorId
                ? t('list.empty.withFilters')
                : t('list.empty.noData')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rescheduleAppt && (
        <RescheduleDialog
          appointment={rescheduleAppt}
          onClose={() => setRescheduleAppt(null)}
        />
      )}

      {filters}

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{t('list.columns.patient')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('list.columns.doctor')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('list.columns.scheduled')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('list.columns.visitType' as Parameters<typeof t>[0])}</th>
              <th className="px-4 py-3 text-start font-medium">{t('list.columns.duration')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('list.columns.status')}</th>
              {canSeeBilling && (
                <th className="px-4 py-3 text-start font-medium">{t('list.columns.invoice' as Parameters<typeof t>[0])}</th>
              )}
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
                <td className="px-4 py-3 text-sm whitespace-nowrap" dir="ltr">{formatDateTimeDisplay(appt.scheduledAt)}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {getVisitTypeName(appt.visitTypeId)}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {t('list.durationMinutes', { count: appt.durationMin })}
                </td>
                <td className="px-4 py-3">
                  <AppointmentStatusBadge status={appt.status} />
                </td>
                {canSeeBilling && (
                  <td className="px-4 py-3">
                    {invoicesData === undefined ? (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    ) : invoiceByApptId.has(appt.id) ? (
                      <InvoiceStatusBadge status={invoiceByApptId.get(appt.id)!} />
                    ) : (
                      <span className="text-xs text-muted-foreground/60">
                        {t('list.invoiceStatus.noInvoice' as Parameters<typeof t>[0])}
                      </span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Link
                        href={`/dashboard/appointments/${appt.id}`}
                        className="h-7 rounded-md border px-2 text-xs text-muted-foreground transition-colors hover:bg-accent"
                      >
                        {tCommon('actions.view')}
                      </Link>
                      {canMutate && CHECKIN_ELIGIBLE.includes(appt.status) && (
                        <CheckInButton appointmentId={appt.id} />
                      )}
                      {canMutate && CONFIRM_ELIGIBLE.includes(appt.status) && (
                        <ConfirmButton appointmentId={appt.id} />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {canMutate && RESCHEDULE_ELIGIBLE.includes(appt.status) && (
                        <button
                          onClick={() => setRescheduleAppt(appt)}
                          className="h-6 rounded border px-2 text-xs text-muted-foreground transition-colors hover:bg-accent"
                        >
                          {t('reschedule.trigger' as Parameters<typeof t>[0])}
                        </button>
                      )}
                      {canMutate && NOSHOW_ELIGIBLE.includes(appt.status) && (
                        <NoShowButton appointmentId={appt.id} />
                      )}
                      {canMutate && CANCEL_ELIGIBLE.includes(appt.status) && (
                        <CancelAppointmentDialog appointmentId={appt.id} />
                      )}
                    </div>
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
