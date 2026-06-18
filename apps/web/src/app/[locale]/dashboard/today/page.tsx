'use client';

import { Fragment, useState, useEffect } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useAuthStore } from '@/store/auth';
import { useTodayHub, type TodayHubEntry } from '@/hooks/use-today-hub';
import { useDoctorsList } from '@/hooks/use-appointments';
import { CheckInButton } from '@/components/queue/check-in-button';
import { AdvanceQueueButton } from '@/components/queue/advance-queue-button';
import { StartEncounterButton } from '@/components/doctor/start-encounter-button';
import { RecordPaymentForm } from '@/components/billing/record-payment-form';
import type { QueueStatus } from '@/types/queue';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { InvoiceStatusBadge } from '@/components/billing/invoice-status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimeDisplay } from '@/lib/format-date';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  NAV_TODAY_ROLES,
  TODAY_BILLING_ROLES,
  TODAY_ENCOUNTER_ROLES,
  TODAY_DOCTOR_FILTER_ROLES,
  TODAY_CHECK_IN_ROLES,
  TODAY_ADVANCE_ROLES,
} from '@/lib/permissions';

function todayDamascus(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Damascus' });
}

type BadgeVariant = BadgeProps['variant'];
type VisitStatusKey = 'scheduled' | 'waiting' | 'inProgress' | 'done' | 'cancelled' | 'noShow';

function canCheckInEntry(entry: TodayHubEntry): boolean {
  if (entry.queue !== null) return false;
  const s = entry.appointment.status;
  return s === 'SCHEDULED' || s === 'CONFIRMED';
}

function canAdvanceEntry(entry: TodayHubEntry): boolean {
  if (!entry.queue) return false;
  const s = entry.queue.status;
  return s === 'WAITING' || s === 'CALLED';
}

function isBillingActionable(entry: TodayHubEntry): boolean {
  return (
    entry.appointment.status === 'COMPLETED' ||
    entry.queue?.status === 'IN_PROGRESS' ||
    entry.queue?.status === 'DONE'
  );
}

function computeVisitStatus(entry: TodayHubEntry): { key: VisitStatusKey; variant: BadgeVariant } {
  const { appointment, queue, encounter } = entry;

  // Terminal states (always shown regardless of queue/encounter)
  if (appointment.status === 'CANCELLED') return { key: 'cancelled', variant: 'danger' };
  if (appointment.status === 'NO_SHOW') return { key: 'noShow', variant: 'danger' };

  // Done: visit has concluded
  if (
    appointment.status === 'COMPLETED' ||
    queue?.status === 'DONE' ||
    queue?.status === 'SKIPPED' ||
    encounter?.endedAt
  ) return { key: 'done', variant: 'success' };

  // In Progress: with the doctor now
  if (queue?.status === 'IN_PROGRESS' || (encounter?.startedAt && !encounter.endedAt)) {
    return { key: 'inProgress', variant: 'default' };
  }

  // Waiting: in queue or arrived at clinic
  if (
    queue?.status === 'WAITING' ||
    queue?.status === 'CALLED' ||
    appointment.status === 'CHECKED_IN' ||
    appointment.status === 'IN_QUEUE'
  ) return { key: 'waiting', variant: 'warning' };

  // Default: appointment booked, patient not yet arrived
  return { key: 'scheduled', variant: 'outline' };
}

export default function TodayPage() {
  const t = useTranslations('dashboard.today');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuthStore();
  const role = user?.role ?? '';
  const canSeeBilling = TODAY_BILLING_ROLES.has(role);
  const canOpenEncounter = TODAY_ENCOUNTER_ROLES.has(role);
  const canFilterByDoctor = TODAY_DOCTOR_FILTER_ROLES.has(role);
  const canCheckIn = TODAY_CHECK_IN_ROLES.has(role);
  const canAdvance = TODAY_ADVANCE_ROLES.has(role);

  useEffect(() => {
    if (user && !NAV_TODAY_ROLES.includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const [date, setDate] = useState(todayDamascus());
  const [doctorId, setDoctorId] = useState<string | undefined>(undefined);
  const [paymentOpenInvoiceId, setPaymentOpenInvoiceId] = useState<string | null>(null);

  const { data: doctors } = useDoctorsList();
  const { data, isLoading, isError, refetch } = useTodayHub({ date, doctorId });

  const summary = data?.summary;
  const entries = data?.entries ?? [];

  function patientDisplayName(entry: TodayHubEntry): string {
    if (locale === 'ar') {
      const arName = [entry.patient.firstNameAr, entry.patient.lastNameAr].filter(Boolean).join(' ');
      if (arName) return arName;
    }
    return [entry.patient.firstName, entry.patient.lastName].filter(Boolean).join(' ');
  }

  function doctorDisplayName(entry: TodayHubEntry): string {
    if (locale === 'ar') {
      const arName = [entry.doctor.firstNameAr, entry.doctor.lastNameAr].filter(Boolean).join(' ');
      if (arName) return arName;
    }
    return [entry.doctor.firstName, entry.doctor.lastName].filter(Boolean).join(' ');
  }

  const summaryCards = [
    { key: 'total',       value: summary?.total       ?? 0, color: 'text-foreground' },
    { key: 'scheduled',   value: summary?.scheduled   ?? 0, color: 'text-blue-600 dark:text-blue-400' },
    { key: 'waiting',     value: summary?.waiting     ?? 0, color: 'text-amber-600 dark:text-amber-400' },
    { key: 'inProgress',  value: summary?.inProgress  ?? 0, color: 'text-primary' },
    { key: 'done',        value: summary?.done        ?? 0, color: 'text-green-600 dark:text-green-400' },
    ...(canSeeBilling ? [
      { key: 'unpaid',      value: summary?.unpaid      ?? 0, color: 'text-destructive' },
      { key: 'partialPaid', value: summary?.partialPaid ?? 0, color: 'text-amber-600 dark:text-amber-400' },
    ] : []),
  ];

  if (!user || !NAV_TODAY_ROLES.includes(user.role)) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('liveRefresh')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canFilterByDoctor && (
            <select
              value={doctorId ?? ''}
              onChange={(e) => setDoctorId(e.target.value || undefined)}
              className="h-8 rounded-md border border-input bg-background px-3 text-sm"
              aria-label={t('filter.doctor')}
            >
              <option value="">{t('filter.allDoctors')}</option>
              {(doctors?.data ?? []).map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.user.firstName} {doc.user.lastName}
                </option>
              ))}
            </select>
          )}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || todayDamascus())}
            className="h-8 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
      </div>

      {/* Summary cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : summary && (
        <div className={cn(
          'grid gap-3',
          canSeeBilling
            ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7'
            : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
        )}>
          {summaryCards.map((card) => (
            <div key={card.key} className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">
                {t(`summary.${card.key}` as Parameters<typeof t>[0])}
              </p>
              <p className={cn('mt-1 text-2xl font-bold tabular-nums', card.color)}>
                {card.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{t('errors.loadFailed')}</p>
          <button
            onClick={() => void refetch()}
            className="mt-2 text-sm text-primary underline"
          >
            {tCommon('actions.tryAgain')}
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border py-16 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">{t('empty.heading')}</p>
          <Link href="/dashboard/appointments" className="mt-3 text-sm text-primary hover:underline">
            {t('empty.viewAppointments')}
          </Link>
        </div>
      )}

      {/* Entries table */}
      {!isLoading && entries.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">{t('columns.time')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('columns.patient')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('columns.doctor')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('columns.queue')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('columns.status')}</th>
                  {canSeeBilling && (
                    <th className="px-4 py-3 text-start font-medium">{t('columns.invoice')}</th>
                  )}
                  <th className="px-4 py-3 text-start font-medium">{t('columns.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const vs = computeVisitStatus(entry);
                  const totalAmount = Number.parseFloat(entry.invoice?.totalAmount ?? '');
                  const paidAmount = Number.parseFloat(entry.invoice?.paidAmount ?? '');
                  const invoiceRemaining =
                    Number.isFinite(totalAmount) && Number.isFinite(paidAmount)
                      ? Math.max(0, totalAmount - paidAmount)
                      : 0;
                  const canInlineCollect =
                    canSeeBilling &&
                    !!entry.invoice &&
                    (entry.invoice.status === 'ISSUED' || entry.invoice.status === 'PARTIALLY_PAID') &&
                    invoiceRemaining > 0;
                  return (
                    <Fragment key={entry.appointment.id}>
                    <tr
                      className="border-t border-border transition-colors hover:bg-muted/20"
                    >
                      {/* Time + duration */}
                      <td className="px-4 py-3" dir="ltr">
                        <p className="text-sm tabular-nums text-muted-foreground">
                          {formatTimeDisplay(entry.appointment.scheduledAt)}
                        </p>
                        <p className="text-xs text-muted-foreground/60">
                          {entry.appointment.durationMin} min
                        </p>
                      </td>

                      {/* Patient: display name + MRN. clinicPatientId used internally for link only. */}
                      <td className="px-4 py-3">
                        {entry.patient.clinicPatientId ? (
                          <Link
                            href={`/dashboard/patients/${entry.patient.clinicPatientId}`}
                            className="group"
                          >
                            <p className="text-sm font-medium group-hover:underline">
                              {patientDisplayName(entry)}
                            </p>
                          </Link>
                        ) : (
                          <p className="text-sm font-medium">{patientDisplayName(entry)}</p>
                        )}
                        <p className="text-xs text-muted-foreground" dir="ltr">
                          {entry.patient.mrn}
                        </p>
                      </td>

                      {/* Doctor + visit type */}
                      <td className="px-4 py-3">
                        <p className="text-sm">{doctorDisplayName(entry)}</p>
                        {entry.appointment.visitType && (
                          <p className="text-xs text-muted-foreground">
                            {locale === 'ar' && entry.appointment.visitType.nameAr
                              ? entry.appointment.visitType.nameAr
                              : entry.appointment.visitType.name}
                          </p>
                        )}
                      </td>

                      {/* Queue ticket */}
                      <td className="px-4 py-3" dir="ltr">
                        {entry.queue ? (
                          <span className="text-sm font-medium tabular-nums">
                            #{entry.queue.ticketNumber}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Visit status badge */}
                      <td className="px-4 py-3">
                        <Badge variant={vs.variant}>
                          {t(`visitStatus.${vs.key}` as Parameters<typeof t>[0])}
                        </Badge>
                      </td>

                      {/* Invoice badge — billing roles only; backend sends null for non-billing */}
                      {canSeeBilling && (
                        <td className="px-4 py-3">
                          {entry.invoice ? (
                            <InvoiceStatusBadge status={entry.invoice.status} />
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>
                      )}

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-3">
                          {canCheckIn && canCheckInEntry(entry) && (
                            <CheckInButton
                              appointmentId={entry.appointment.id}
                              onSuccess={() => void refetch()}
                            />
                          )}
                          {/* Prefer Start Visit over queue-only Begin when both are possible, to avoid moving CALLED -> IN_PROGRESS without creating an encounter from Today Hub. */}
                          {canAdvance && canAdvanceEntry(entry) && !entry.startEncounter && (
                            <AdvanceQueueButton
                              entryId={entry.queue!.id}
                              status={entry.queue!.status as QueueStatus}
                              onSuccess={() => void refetch()}
                            />
                          )}
                          {canOpenEncounter && entry.startEncounter && (
                            <StartEncounterButton
                              patientId={entry.startEncounter.patientId}
                              doctorId={entry.startEncounter.doctorId}
                              appointmentId={entry.appointment.id}
                              appointmentStatus={entry.appointment.status}
                            />
                          )}
                          {entry.patient.clinicPatientId && (
                            <Link
                              href={`/dashboard/patients/${entry.patient.clinicPatientId}`}
                              className="text-xs text-primary hover:underline"
                            >
                              {t('actions.openPatient')}
                            </Link>
                          )}
                          {canOpenEncounter && entry.encounter && (
                            <Link
                              href={`/dashboard/doctor/encounter/${entry.encounter.id}`}
                              className="text-xs text-primary hover:underline"
                            >
                              {t('actions.openEncounter')}
                            </Link>
                          )}
                          {canSeeBilling && entry.invoice && (
                            canInlineCollect ? (
                              <button
                                onClick={() => setPaymentOpenInvoiceId(
                                  paymentOpenInvoiceId === entry.invoice!.id ? null : entry.invoice!.id
                                )}
                                className="text-xs text-primary hover:underline"
                              >
                                {entry.invoice.status === 'ISSUED'
                                  ? t('actions.collectPayment')
                                  : t('actions.collectRemaining')}
                              </button>
                            ) : (
                              <Link
                                href={`/dashboard/invoices/${entry.invoice.id}`}
                                className={cn(
                                  'text-xs hover:underline',
                                  entry.invoice.status === 'PAID'
                                    ? 'text-muted-foreground'
                                    : 'text-primary',
                                )}
                              >
                                {entry.invoice.status === 'DRAFT'
                                  ? t('actions.issueInvoice')
                                  : t('actions.openInvoice')}
                              </Link>
                            )
                          )}
                          {canSeeBilling && !entry.invoice && isBillingActionable(entry) && (
                            <Link
                              href={`/dashboard/invoices/new?appointmentId=${entry.appointment.id}`}
                              className="text-xs text-primary hover:underline"
                            >
                              {t('actions.createInvoice')}
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                    {paymentOpenInvoiceId === entry.invoice?.id && entry.invoice && (
                      <tr>
                        <td colSpan={canSeeBilling ? 7 : 6} className="p-0">
                          <RecordPaymentForm
                            invoiceId={entry.invoice.id}
                            remaining={invoiceRemaining}
                            onCancel={() => setPaymentOpenInvoiceId(null)}
                            onSuccess={() => {
                              setPaymentOpenInvoiceId(null);
                              void refetch();
                            }}
                          />
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
