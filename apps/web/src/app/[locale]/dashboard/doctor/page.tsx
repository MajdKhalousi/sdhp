'use client';

import { Link } from '@/i18n/navigation';
import { RefreshCw, Stethoscope } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useEncounters } from '@/hooks/use-encounters';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateDisplay, formatTimeDisplay } from '@/lib/format-date';

export default function DoctorWorkspacePage() {
  const locale = useLocale();
  const displayLocale = locale === 'ar' ? 'ar-u-nu-latn' : 'en-US';
  const t = useTranslations('doctorWorkspace');
  const tEncounter = useTranslations('encounter');
  const tCommon = useTranslations('common');
  const tPatient = useTranslations('patient');

  function localizeGender(gender: string | null | undefined): string | null {
    if (!gender) return null;
    if (gender === 'MALE') return tPatient('gender.male');
    if (gender === 'FEMALE') return tPatient('gender.female');
    return tPatient('gender.other');
  }

  const { data, isLoading, isError, error, refetch, isFetching } = useEncounters({ limit: 50 });

  const activeEncounters = (data?.data ?? []).filter((e) => !e.endedAt);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{tCommon('states.loading')}</p>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">{t('title')}</h1>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
          <p className="text-sm font-medium text-destructive">{t('error.loadFailed')}</p>
          <p className="text-xs text-muted-foreground">
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">
            {activeEncounters.length === 0
              ? t('noActive')
              : t('activeCount', { count: activeEncounters.length })}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </button>
      </div>

      {activeEncounters.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Stethoscope className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">{t('empty.heading')}</p>
          <p className="text-xs text-muted-foreground">{t('empty.description')}</p>
          <Link
            href="/dashboard/doctor/queue"
            className="mt-1 inline-flex h-8 items-center rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t('empty.goToQueue')}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {activeEncounters.map((encounter) => {
            const patient = encounter.patient;
            const startedAt = encounter.startedAt ?? encounter.createdAt;
            return (
              <div
                key={encounter.id}
                className="rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                        {t('card.mrn')} {patient.mrn}
                      </span>
                      <Badge variant="warning">
                        {tEncounter('status.inProgress')}
                      </Badge>
                    </div>

                    <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      <p>
                        {t('card.started')} {formatDateDisplay(startedAt)} · {formatTimeDisplay(startedAt)}
                      </p>
                      {localizeGender(patient.gender) && <p>{localizeGender(patient.gender)}</p>}
                      {encounter.chiefComplaint && (
                        <p className="mt-1 text-sm text-foreground/80 italic">
                          &ldquo;{encounter.chiefComplaint}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/doctor/encounter/${encounter.id}`}
                    className="shrink-0 inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    {t('card.open')}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
