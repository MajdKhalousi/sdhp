'use client';

import { useState } from 'react';
import { History, ChevronDown } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useEncounters } from '@/hooks/use-encounters';
import { Link } from '@/i18n/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateDisplay } from '@/lib/format-date';

const VITAL_KEYS: Array<{ keys: string[]; abbr: string }> = [
  { keys: ['bloodPressure', 'bp'],      abbr: 'BP' },
  { keys: ['heartRate', 'pulse'],        abbr: 'HR' },
  { keys: ['temperature', 'temp'],       abbr: 'T' },
  { keys: ['oxygenSaturation', 'spo2'],  abbr: 'SpO₂' },
  { keys: ['respiratoryRate'],           abbr: 'RR' },
  { keys: ['weight'],                    abbr: 'W' },
];

function formatVitals(v: Record<string, unknown> | null | undefined): string | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const parts: string[] = [];
  for (const { keys, abbr } of VITAL_KEYS) {
    for (const key of keys) {
      const val = v[key];
      if (val !== null && val !== undefined && val !== '') {
        parts.push(`${abbr} ${val}`);
        break;
      }
    }
  }
  return parts.length > 0 ? parts.join(' · ') : null;
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
    { patientId, limit: 7 },
    { enabled: !!patientId && open },
  );

  const previous = (data?.data ?? [])
    .filter((e) => e.id !== currentEncounterId)
    .slice(0, 6);

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
              {previous.map((enc) => {
                const vitalsLine = formatVitals(enc.vitals);
                const hpi = enc.historyOfPresentIllness?.trim();
                const plan = enc.treatmentPlan?.trim();
                const instructions = enc.patientInstructions?.trim();
                return (
                  <div
                    key={enc.id}
                    className="rounded-lg border border-border bg-background p-3 space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {formatDateDisplay(enc.startedAt ?? enc.createdAt)}
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

                    {hpi && (
                      <p className="text-sm line-clamp-2" dir="auto">
                        <span className="text-xs text-muted-foreground">{t('hpi')}: </span>
                        {hpi}
                      </p>
                    )}

                    {vitalsLine && (
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <span className="text-xs text-muted-foreground">{t('vitals')}:</span>
                        <span className="text-xs font-mono text-foreground" dir="ltr">{vitalsLine}</span>
                      </div>
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

                    {plan && (
                      <p className="text-sm line-clamp-2" dir="auto">
                        <span className="text-xs text-muted-foreground">{t('plan')}: </span>
                        {plan}
                      </p>
                    )}

                    {instructions && (
                      <p className="text-sm line-clamp-2" dir="auto">
                        <span className="text-xs text-muted-foreground">{t('patientInstructions')}: </span>
                        {instructions}
                      </p>
                    )}

                    {enc.followUpDate && (
                      <p className="text-xs text-muted-foreground">
                        {t('followUp')}: {formatDateDisplay(enc.followUpDate)}
                      </p>
                    )}

                    <div className="pt-0.5">
                      <Link
                        href={`/dashboard/doctor/encounter/${enc.id}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {t('viewEncounter')}
                      </Link>
                    </div>
                  </div>
                );
              })}

              <div className="pt-1 text-end">
                <Link
                  href={`/dashboard/patients/${patientId}?tab=timeline`}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {t('viewFullHistory')}
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
