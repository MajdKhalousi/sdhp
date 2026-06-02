'use client';

import { useState } from 'react';
import { History, ChevronDown } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useEncounters } from '@/hooks/use-encounters';
import { Skeleton } from '@/components/ui/skeleton';

function formatDate(iso: string | null, locale = 'en-US') {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

interface Props {
  patientId: string;
  currentEncounterId: string;
}

export function PreviousEncounterPanel({ patientId, currentEncounterId }: Props) {
  const t = useTranslations('encounter.previousVisits');
  const locale = useLocale();
  const displayLocale = locale === 'ar' ? 'ar-u-nu-latn' : 'en-US';

  const [open, setOpen] = useState(false);

  const { data, isLoading } = useEncounters(
    { patientId, limit: 4 },
    { enabled: !!patientId },
  );

  const previous = (data?.data ?? [])
    .filter((e) => e.id !== currentEncounterId)
    .slice(0, 3);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{t('heading')}</span>
          {!isLoading && previous.length > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
              {previous.length}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ) : previous.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('empty')}</p>
          ) : (
            <div className="space-y-3">
              {previous.map((enc) => (
                <div
                  key={enc.id}
                  className="rounded-lg border border-border bg-background p-3 space-y-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {formatDate(enc.startedAt ?? enc.createdAt, displayLocale)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t('doctorPrefix')} {enc.doctor.user.firstName} {enc.doctor.user.lastName}
                      {enc.doctor.specialization && ` · ${enc.doctor.specialization}`}
                    </span>
                  </div>

                  {enc.chiefComplaint && (
                    <p className="text-sm" dir="auto">
                      <span className="text-xs text-muted-foreground">{t('chiefComplaint')}: </span>
                      {enc.chiefComplaint}
                    </p>
                  )}

                  {enc.diagnosis && (
                    <p className="text-sm" dir="auto">
                      <span className="text-xs font-medium text-muted-foreground">{t('diagnosis')}: </span>
                      <span className="font-medium">{enc.diagnosis}</span>
                      {enc.diagnosisCode && (
                        <span className="ms-1 font-mono text-xs text-muted-foreground" dir="ltr">
                          ({enc.diagnosisCode})
                        </span>
                      )}
                    </p>
                  )}

                  {enc.followUpDate && (
                    <p className="text-xs text-muted-foreground">
                      {t('followUp')}: {formatDate(enc.followUpDate, displayLocale)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
