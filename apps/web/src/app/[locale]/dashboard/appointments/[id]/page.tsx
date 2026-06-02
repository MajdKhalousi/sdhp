'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, CalendarX2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useAppointment, useVisitTypesList } from '@/hooks/use-appointments';
import { useEncounters } from '@/hooks/use-encounters';
import { usePatientInvoices } from '@/hooks/use-invoices';
import { AppointmentStatusBadge } from '@/components/appointments/appointment-status-badge';
import { CheckInButton } from '@/components/queue/check-in-button';
import { ConfirmButton } from '@/components/appointments/confirm-button';
import { NoShowButton } from '@/components/appointments/no-show-button';
import { CancelAppointmentDialog } from '@/components/appointments/cancel-appointment-dialog';
import { RescheduleDialog } from '@/components/appointments/reschedule-dialog';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppointmentStatus } from '@/types/appointment';
import { formatDateTimeDisplay } from '@/lib/format-date';

const CONFIRM_ELIGIBLE: AppointmentStatus[]    = ['SCHEDULED'];
const CHECKIN_ELIGIBLE: AppointmentStatus[]    = ['SCHEDULED', 'CONFIRMED'];
const NOSHOW_ELIGIBLE: AppointmentStatus[]     = ['SCHEDULED', 'CONFIRMED'];
const RESCHEDULE_ELIGIBLE: AppointmentStatus[] = ['SCHEDULED', 'CONFIRMED'];
const CANCEL_ELIGIBLE: AppointmentStatus[]     = ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_QUEUE', 'IN_PROGRESS'];
const INVOICE_ELIGIBLE: AppointmentStatus[]    = ['COMPLETED', 'IN_PROGRESS'];

const APPOINTMENT_MUTATE_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY']);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('appointment.detail');
  const tAppt = useTranslations('appointment');
  const tInvoice = useTranslations('invoice');
  const locale = useLocale();
  const { user } = useAuthStore();
  const canMutate = user ? APPOINTMENT_MUTATE_ROLES.has(user.role) : false;
  const displayLocale = locale === 'ar' ? 'ar-u-nu-latn' : 'en-US';

  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  const { data: appointment, isLoading, isError, error } = useAppointment(id);
  const { data: visitTypes } = useVisitTypesList();

  const { data: encountersData } = useEncounters(
    { patientId: appointment?.patientId },
    { enabled: !!appointment?.patientId },
  );
  const { data: patientInvoices } = usePatientInvoices(appointment?.patientId ?? '');

  const linkedEncounter = encountersData?.data.find((e) => e.appointmentId === id);
  const linkedInvoice = patientInvoices?.find((inv) => inv.appointmentId === id);

  const visitType = appointment?.visitTypeId
    ? visitTypes?.find((vt) => vt.id === appointment.visitTypeId)
    : null;

  const visitTypeName = visitType
    ? (locale === 'ar' && visitType.nameAr ? visitType.nameAr : visitType.name)
    : t('fields.none');

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !appointment) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/appointments"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent"
            aria-label={t('back')}
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </Link>
          <h1 className="text-xl font-semibold">{t('title')}</h1>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-16 text-center">
          <CalendarX2 className="h-8 w-8 text-destructive/40" />
          <p className="text-sm font-medium text-destructive">
            {isError
              ? (error instanceof Error ? error.message : t('error.loadFailed'))
              : t('notFound')}
          </p>
        </div>
      </div>
    );
  }

  const { status } = appointment;

  return (
    <>
      {rescheduleOpen && (
        <RescheduleDialog
          appointment={appointment}
          onClose={() => setRescheduleOpen(false)}
        />
      )}

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/appointments"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent"
              aria-label={t('back')}
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold">{t('title')}</h1>
              <p className="text-sm text-muted-foreground">
                {appointment.patient.firstName} {appointment.patient.lastName} — {appointment.patient.mrn}
              </p>
            </div>
          </div>
          <AppointmentStatusBadge status={status} />
        </div>

        {/* Appointment Info */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label={t('fields.patient')}>
              <Link
                href={`/dashboard/patients/${appointment.patientId}`}
                className="hover:underline text-primary"
              >
                {appointment.patient.firstName} {appointment.patient.lastName}
              </Link>
            </Field>

            <Field label={t('fields.doctor')}>
              Dr. {appointment.doctor.user.firstName} {appointment.doctor.user.lastName}
              {appointment.doctor.specialization && (
                <span className="block text-xs text-muted-foreground">
                  {appointment.doctor.specialization}
                </span>
              )}
            </Field>

            <Field label={t('fields.status')}>
              <AppointmentStatusBadge status={status} />
            </Field>

            <Field label={t('fields.scheduled')}>
              <span dir="ltr" className="inline-block">
                {formatDateTimeDisplay(appointment.scheduledAt)}
              </span>
            </Field>

            <Field label={t('fields.duration')}>
              {tAppt('list.durationMinutes', { count: appointment.durationMin })}
            </Field>

            <Field label={t('fields.visitType')}>
              {visitTypeName}
            </Field>

            {visitType?.basePrice && (
              <Field label={t('fields.visitTypePrice' as Parameters<typeof t>[0])}>
                {parseFloat(visitType.basePrice).toLocaleString()} SYP
              </Field>
            )}
          </div>

          {appointment.notes && (
            <Field label={t('fields.notes')}>
              <p className="whitespace-pre-line text-sm">{appointment.notes}</p>
            </Field>
          )}

          {appointment.cancelledAt && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-2">
              <Field label={t('fields.cancelledAt')}>
                <span dir="ltr" className="inline-block">
                  {formatDateTimeDisplay(appointment.cancelledAt)}
                </span>
              </Field>
              {appointment.cancelReason && (
                <Field label={t('fields.cancelReason')}>
                  {appointment.cancelReason}
                </Field>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {(CHECKIN_ELIGIBLE.includes(status) ||
          CONFIRM_ELIGIBLE.includes(status) ||
          RESCHEDULE_ELIGIBLE.includes(status) ||
          CANCEL_ELIGIBLE.includes(status) ||
          INVOICE_ELIGIBLE.includes(status)) && (
          <div className="flex flex-wrap items-center gap-2">
            {canMutate && CHECKIN_ELIGIBLE.includes(status) && (
              <CheckInButton appointmentId={appointment.id} />
            )}
            {canMutate && CONFIRM_ELIGIBLE.includes(status) && (
              <ConfirmButton appointmentId={appointment.id} />
            )}
            {canMutate && RESCHEDULE_ELIGIBLE.includes(status) && (
              <button
                onClick={() => setRescheduleOpen(true)}
                className="h-9 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent"
              >
                {tAppt('reschedule.trigger')}
              </button>
            )}
            {canMutate && NOSHOW_ELIGIBLE.includes(status) && (
              <NoShowButton appointmentId={appointment.id} />
            )}
            {canMutate && CANCEL_ELIGIBLE.includes(status) && (
              <CancelAppointmentDialog appointmentId={appointment.id} />
            )}
            {INVOICE_ELIGIBLE.includes(status) && !linkedInvoice && (
              <Link
                href={`/dashboard/invoices/new?appointmentId=${appointment.id}&patientId=${appointment.patientId}`}
                className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t('actions.createInvoice')}
              </Link>
            )}
          </div>
        )}

        {/* Related Records */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">{t('related.title')}</h2>
          <div className="space-y-3">
            {/* Patient */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('related.patient')}</span>
              <Link
                href={`/dashboard/patients/${appointment.patientId}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {appointment.patient.firstName} {appointment.patient.lastName}
                <span className="ms-1 text-xs text-muted-foreground" dir="ltr">
                  {appointment.patient.mrn}
                </span>
              </Link>
            </div>

            {/* Encounter */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('related.encounter')}</span>
              {linkedEncounter ? (
                <Link
                  href={`/dashboard/doctor/encounter/${linkedEncounter.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {t('related.viewEncounter')}
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">{t('related.noEncounter')}</span>
              )}
            </div>

            {/* Invoice */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('related.invoice')}</span>
              {linkedInvoice ? (
                <Link
                  href={`/dashboard/invoices/${linkedInvoice.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {linkedInvoice.invoiceNumber} — {tInvoice(`status.${linkedInvoice.status}` as Parameters<typeof tInvoice>[0])}
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">{t('related.noInvoice')}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
