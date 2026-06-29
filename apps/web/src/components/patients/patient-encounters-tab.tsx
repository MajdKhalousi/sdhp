'use client';

import { Stethoscope } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useEncounters } from '@/hooks/use-encounters';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDateDisplay } from '@/lib/format-date';

interface Props {
  patientId: string;
}

// Clinical summary only — full editing/documentation stays in the
// encounter workspace (/dashboard/doctor/encounter/[id]), reached via the
// "View Encounter" link on each card.
export function PatientEncountersTab({ patientId }: Props) {
  const t = useTranslations('patient.encountersTab');
  const tVisits = useTranslations('encounter.previousVisits');
  const tCards = useTranslations('timeline.cards');
  const tError = useTranslations('patient.detail.error');
  const tCommon = useTranslations('common');

  const { data, isLoading, isError, error, refetch } = useEncounters({ patientId, limit: 50 });
  const encounters = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
        <p className="text-sm font-medium text-destructive">{tError('loadFailed')}</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          {error instanceof Error ? error.message : tError('occurred')}
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

  if (encounters.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <Stethoscope className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {encounters.map((enc) => {
        const isActive = !enc.endedAt;

        return (
          <div key={enc.id} className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground" dir="ltr">
                  {formatDateDisplay(enc.startedAt ?? enc.createdAt)}
                </span>
                {isActive ? (
                  <Badge variant="warning">{tCards('inProgress')}</Badge>
                ) : (
                  <Badge variant="success">{tCards('completed')}</Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {tVisits('doctorPrefix')} {enc.doctor.user.firstName} {enc.doctor.user.lastName}
                {enc.doctor.specialization && ` · ${enc.doctor.specialization}`}
              </span>
            </div>

            {enc.chiefComplaint && (
              <p className="text-sm" dir="auto">
                <span className="text-xs text-muted-foreground">{tVisits('chiefComplaint')}: </span>
                {enc.chiefComplaint}
              </p>
            )}

            {enc.diagnosis ? (
              <p className="text-sm" dir="auto">
                <span className="text-xs font-medium text-muted-foreground">{tVisits('diagnosis')}: </span>
                <span className="font-medium">{enc.diagnosis}</span>
                {enc.diagnosisCode && (
                  <span className="ms-1 font-mono text-xs text-muted-foreground" dir="ltr">
                    ({enc.diagnosisCode})
                  </span>
                )}
              </p>
            ) : enc.diagnosisCode && (
              <p className="text-sm" dir="ltr">
                <span className="text-xs font-medium text-muted-foreground">{tVisits('diagnosis')}: </span>
                <span className="font-mono">{enc.diagnosisCode}</span>
              </p>
            )}

            {enc.treatmentPlan && (
              <p className="text-sm" dir="auto">
                <span className="text-xs text-muted-foreground">{tVisits('plan')}: </span>
                {enc.treatmentPlan}
              </p>
            )}

            {enc.notes && (
              <p className="text-sm" dir="auto">
                <span className="text-xs text-muted-foreground">{tCards('notes')}: </span>
                {enc.notes}
              </p>
            )}

            <div className="pt-1">
              <Link
                href={`/dashboard/doctor/encounter/${enc.id}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                {tVisits('viewEncounter')}
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
