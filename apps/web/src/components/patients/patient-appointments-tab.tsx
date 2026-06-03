'use client';

import { useState } from 'react';
import { Plus, CalendarX2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useAppointments, useVisitTypesList } from '@/hooks/use-appointments';
import { useAuthStore } from '@/store/auth';
import { AppointmentStatusBadge } from '@/components/appointments/appointment-status-badge';
import { CheckInButton } from '@/components/queue/check-in-button';
import { ConfirmButton } from '@/components/appointments/confirm-button';
import { NoShowButton } from '@/components/appointments/no-show-button';
import { CancelAppointmentDialog } from '@/components/appointments/cancel-appointment-dialog';
import { RescheduleDialog } from '@/components/appointments/reschedule-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTimeDisplay } from '@/lib/format-date';
import type { Appointment, AppointmentStatus } from '@/types/appointment';

const CONFIRM_ELIGIBLE: AppointmentStatus[]    = ['SCHEDULED'];
const CHECKIN_ELIGIBLE: AppointmentStatus[]    = ['SCHEDULED', 'CONFIRMED'];
const NOSHOW_ELIGIBLE: AppointmentStatus[]     = ['SCHEDULED', 'CONFIRMED'];
const RESCHEDULE_ELIGIBLE: AppointmentStatus[] = ['SCHEDULED', 'CONFIRMED'];
const CANCEL_ELIGIBLE: AppointmentStatus[]     = ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_QUEUE', 'IN_PROGRESS'];

const APPOINTMENT_MUTATE_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY']);

export function PatientAppointmentsTab({ patientId }: { patientId: string }) {
  const t       = useTranslations('patient.detail');
  const tAppt   = useTranslations('appointment');
  const tCommon = useTranslations('common');
  const locale  = useLocale();
  const { user } = useAuthStore();
  const canMutate = user ? APPOINTMENT_MUTATE_ROLES.has(user.role) : false;

  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);

  const { data, isLoading, isError, error, refetch } = useAppointments({ patientId, limit: 50 });
  const { data: visitTypes } = useVisitTypesList();

  function getVisitTypeName(visitTypeId?: string | null): string {
    if (!visitTypeId) return tAppt('list.noVisitType' as Parameters<typeof tAppt>[0]);
    const vt = visitTypes?.find((v) => v.id === visitTypeId);
    return locale === 'ar' && vt?.nameAr
      ? vt.nameAr
      : (vt?.name ?? tAppt('list.noVisitType' as Parameters<typeof tAppt>[0]));
  }

  const bookBtn = canMutate && (
    <div className="flex justify-end">
      <Link
        href={`/dashboard/appointments/new?patientId=${patientId}`}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Plus className="h-3.5 w-3.5" />
        {t('actions.bookAppointment')}
      </Link>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
        <p className="text-sm font-medium text-destructive">
          {error instanceof Error ? error.message : tCommon('states.error')}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-1 h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
        >
          {tCommon('actions.tryAgain')}
        </button>
      </div>
    );
  }

  const appointments = data?.data ?? [];

  if (appointments.length === 0) {
    return (
      <div className="space-y-4">
        {bookBtn}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <CalendarX2 className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{t('appointments.empty')}</p>
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

      {bookBtn}

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{tAppt('list.columns.scheduled')}</th>
                <th className="px-4 py-3 text-start font-medium">{tAppt('list.columns.doctor')}</th>
                <th className="px-4 py-3 text-start font-medium">{tAppt('list.columns.visitType' as Parameters<typeof tAppt>[0])}</th>
                <th className="px-4 py-3 text-start font-medium">{tAppt('list.columns.duration')}</th>
                <th className="px-4 py-3 text-start font-medium">{tAppt('list.columns.status')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => (
                <tr
                  key={appt.id}
                  className="border-t border-border transition-colors hover:bg-muted/20"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm" dir="ltr">
                    {formatDateTimeDisplay(appt.scheduledAt)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm">
                      Dr. {appt.doctor.user.firstName} {appt.doctor.user.lastName}
                    </p>
                    {appt.doctor.specialization && (
                      <p className="text-xs text-muted-foreground">{appt.doctor.specialization}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {getVisitTypeName(appt.visitTypeId)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {tAppt('list.durationMinutes', { count: appt.durationMin })}
                  </td>
                  <td className="px-4 py-3">
                    <AppointmentStatusBadge status={appt.status} />
                  </td>
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
                            {tAppt('reschedule.trigger')}
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
    </div>
  );
}
