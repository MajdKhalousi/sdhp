'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import type { TimelineEvent } from '@/types/timeline';
import { formatTime } from './format-time';
import { formatDateDisplay } from '@/lib/format-date';

type Props = { event: Extract<TimelineEvent, { type: 'ENCOUNTER' }> };

type FollowUpPillInfo =
  | { status: 'DUE_TODAY' }
  | { status: 'PENDING' }
  | { status: 'OVERDUE'; days: number };

function computeFollowUpPill(followUpDate: string): FollowUpPillInfo {
  // UTC+3, no DST — matches backend Damascus boundary
  const DAMASCUS_OFFSET_MS = 3 * 60 * 60 * 1000;
  const nowDamascus = new Date(Date.now() + DAMASCUS_OFFSET_MS);
  const todayStr = [
    nowDamascus.getUTCFullYear(),
    String(nowDamascus.getUTCMonth() + 1).padStart(2, '0'),
    String(nowDamascus.getUTCDate()).padStart(2, '0'),
  ].join('-');
  const dateStr = followUpDate.slice(0, 10);
  if (dateStr === todayStr) return { status: 'DUE_TODAY' };
  if (dateStr > todayStr) return { status: 'PENDING' };
  const days = Math.round(
    (new Date(todayStr).getTime() - new Date(dateStr).getTime()) / 86_400_000,
  );
  return { status: 'OVERDUE', days };
}

function encounterDuration(
  start: string,
  end: string | null,
  units: { min: string; h: string; m: string },
): string {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins} ${units.min}`;
  const h = Math.floor(mins / 60);
  return `${h}${units.h} ${mins % 60}${units.m}`;
}

export function EncounterCard({ event }: Props) {
  const t = useTranslations('timeline.cards');
  const locale = useLocale();
  const displayLocale = locale === 'ar' ? 'ar-u-nu-latn' : 'en-US';
  const { data } = event;
  const doctor = `${t('doctorPrefix')} ${data.doctor.firstName} ${data.doctor.lastName}`;
  const durationUnits = { min: t('duration.minute'), h: t('duration.hourShort'), m: t('duration.minuteShort') };
  const isActive = !data.endedAt;
  const followUpPill = data.followUpDate ? computeFollowUpPill(data.followUpDate) : null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm border-s-4 border-s-blue-400">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            {t('encounter')}
          </span>
          {isActive ? (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              {t('inProgress')}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
              {t('completed')}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{formatTime(event.timestamp, displayLocale)}</span>
      </div>

      {/* Chief complaint */}
      <p className="font-medium text-sm text-foreground">
        {data.chiefComplaint || t('visit')}
      </p>

      {/* Doctor + duration */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span>{doctor}</span>
        {data.doctor.specialization && (
          <span className="opacity-70">· {data.doctor.specialization}</span>
        )}
        <span className="opacity-70">
          · {isActive
            ? `${t('ongoing')} · ${encounterDuration(data.startedAt, null, durationUnits)}`
            : `${encounterDuration(data.startedAt, data.endedAt, durationUnits)} · ${t('ended')} ${formatTime(data.endedAt!, displayLocale)}`}
        </span>
      </div>

      {/* Diagnosis */}
      {(data.diagnosisCode || data.hasDiagnosis) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {data.diagnosisCode && (
            <span className="font-mono text-xs text-foreground" dir="ltr">{data.diagnosisCode}</span>
          )}
          {data.hasDiagnosis && !data.diagnosisCode && (
            <Badge variant="outline" className="text-xs">{t('diagnosisOnRecord')}</Badge>
          )}
        </div>
      )}

      {/* Notes / treatment plan / follow-up */}
      {(data.notes || data.treatmentPlan || data.followUpDate) && (
        <div className="mt-3 space-y-1.5 border-t border-border pt-2.5">
          {data.notes && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">{t('notes')} </span>
              <span className="text-xs text-foreground line-clamp-2">{data.notes}</span>
            </div>
          )}
          {data.treatmentPlan && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">{t('plan')} </span>
              <span className="text-xs text-foreground line-clamp-2">{data.treatmentPlan}</span>
            </div>
          )}
          {data.followUpDate && (
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-xs text-muted-foreground">
                {t('followUp')}{' '}
                <span className="text-foreground" dir="ltr">
                  {formatDateDisplay(data.followUpDate)}
                </span>
              </p>
              {followUpPill && (
                <Badge
                  variant={
                    followUpPill.status === 'DUE_TODAY' ? 'warning' :
                    followUpPill.status === 'OVERDUE'   ? 'danger'  : 'outline'
                  }
                  className="text-xs"
                >
                  {followUpPill.status === 'DUE_TODAY'
                    ? t('followUpStatus.dueToday')
                    : followUpPill.status === 'OVERDUE'
                    ? t('followUpStatus.overdue', { days: followUpPill.days })
                    : t('followUpStatus.pending')}
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* View Encounter action */}
      {event.id && (
        <div className="mt-3 border-t border-border pt-2.5">
          <Link
            href={`/dashboard/doctor/encounter/${event.id}`}
            className="text-xs font-medium text-primary hover:underline"
          >
            {t('viewEncounter')}
          </Link>
        </div>
      )}
    </div>
  );
}
