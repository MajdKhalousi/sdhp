'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppointments } from '@/hooks/use-appointments';
import { formatDateDisplay, formatTimeDisplay } from '@/lib/format-date';
import type { TimelineEvent } from '@/types/timeline';

interface Props {
  patientId: string;
  lastEncounterEvent: Extract<TimelineEvent, { type: 'ENCOUNTER' }> | null;
}

export function PatientVisitStatus({ patientId, lastEncounterEvent }: Props) {
  const t = useTranslations('patient.visitStatus');

  const { data: appointmentsData, isLoading: apptLoading } = useAppointments({
    patientId,
    status: ['SCHEDULED', 'CONFIRMED'],
    limit: 10,
  });

  const nextAppointment = useMemo(() => {
    const now = new Date();
    const upcoming = (appointmentsData?.data ?? [])
      .filter((a) => new Date(a.scheduledAt) >= now)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    return upcoming[0] ?? null;
  }, [appointmentsData]);

  const isActiveEncounter = lastEncounterEvent !== null && lastEncounterEvent.data.endedAt === null;

  if (apptLoading && !lastEncounterEvent) {
    return <Skeleton className="h-16 w-full rounded-xl" />;
  }

  return (
    <div className="rounded-xl border bg-card px-5 py-3 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('heading')}
      </p>

      {isActiveEncounter ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              {t('activeVisit')}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                {lastEncounterEvent.data.doctor.firstName} {lastEncounterEvent.data.doctor.lastName}
                {lastEncounterEvent.data.doctor.specialization && (
                  <span className="ms-1 text-xs font-normal text-muted-foreground">
                    · {lastEncounterEvent.data.doctor.specialization}
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground" dir="ltr">
                {t('startedAt')} {formatDateDisplay(lastEncounterEvent.data.startedAt)} · {formatTimeDisplay(lastEncounterEvent.data.startedAt)}
              </span>
            </div>
          </div>
          <Link
            href={`/dashboard/doctor/encounter/${lastEncounterEvent.id}`}
            className="shrink-0 text-xs font-medium text-primary hover:underline"
          >
            {t('viewEncounter')}
          </Link>
        </div>
      ) : nextAppointment ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{t('nextAppointment')}</span>
            <span className="text-sm font-medium text-foreground" dir="ltr">
              {formatDateDisplay(nextAppointment.scheduledAt)} · {formatTimeDisplay(nextAppointment.scheduledAt)}
            </span>
            <span className="text-xs text-muted-foreground">
              {t('doctor')} {nextAppointment.doctor.user.firstName} {nextAppointment.doctor.user.lastName}
              {nextAppointment.doctor.specialization && ` · ${nextAppointment.doctor.specialization}`}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">{t('noUpcomingAppointment')}</span>
          <Link
            href={`/dashboard/appointments/new?patientId=${patientId}`}
            className="shrink-0 text-xs font-medium text-primary hover:underline"
          >
            {t('bookAppointment')}
          </Link>
        </div>
      )}
    </div>
  );
}
