'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Stethoscope, ClipboardCheck, ClipboardList, ClipboardX, Pill, RefreshCw } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useAuthStore } from '@/store/auth';
import { useClinicalReport } from '@/hooks/use-reports';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportsTabs } from '@/components/reports/reports-tabs';
import { REPORTS_CLINICAL_ACCESS_ROLES } from '@/lib/permissions';

type Preset = 'today' | 'last7Days' | 'last30Days' | 'custom';

const PRESET_ORDER: Preset[] = ['today', 'last7Days', 'last30Days', 'custom'];

function getDateRange(preset: Preset, customFrom: string, customTo: string) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const endOfToday = new Date(y, m, d, 23, 59, 59, 999);

  if (preset === 'today') {
    return { from: new Date(y, m, d, 0, 0, 0, 0).toISOString(), to: endOfToday.toISOString() };
  }
  if (preset === 'last7Days') {
    return { from: new Date(y, m, d - 6, 0, 0, 0, 0).toISOString(), to: endOfToday.toISOString() };
  }
  if (preset === 'last30Days') {
    return { from: new Date(y, m, d - 29, 0, 0, 0, 0).toISOString(), to: endOfToday.toISOString() };
  }
  return {
    from: customFrom ? new Date(customFrom + 'T00:00:00').toISOString() : undefined,
    to: customTo ? new Date(customTo + 'T23:59:59').toISOString() : undefined,
  };
}

function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en-US').format(value);
}

interface MetricCardProps {
  label: string;
  value: number;
  locale: string;
  icon: React.ComponentType<{ className?: string }>;
}

function MetricCard({ label, value, locale, icon: Icon }: MetricCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground/50" />
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums" dir="ltr">
        {formatCount(value, locale)}
      </p>
    </div>
  );
}

export default function ReportsClinicalPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const t = useTranslations('reportsClinical');
  const locale = useLocale();

  const canAccess = !!user && REPORTS_CLINICAL_ACCESS_ROLES.has(user.role);

  const [preset, setPreset] = useState<Preset>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const { from, to } = useMemo(
    () => getDateRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const customDatesIncomplete = preset === 'custom' && (!customFrom || !customTo);

  const { data: report, isLoading, isError } = useClinicalReport(
    { from, to },
    canAccess && !customDatesIncomplete,
  );

  useEffect(() => {
    if (user && !REPORTS_CLINICAL_ACCESS_ROLES.has(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (!canAccess) return null;

  const presetLabels: Record<Preset, string> = {
    today: t('today'),
    last7Days: t('last7Days'),
    last30Days: t('last30Days'),
    custom: t('custom'),
  };

  return (
    <div className="space-y-6">
      <ReportsTabs />

      <div>
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('period')}</p>
          <div className="flex items-center rounded-lg border bg-background p-0.5">
            {PRESET_ORDER.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPreset(p)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  preset === p
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {presetLabels[p]}
              </button>
            ))}
          </div>
        </div>

        {preset === 'custom' && (
          <>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('from')}</p>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('to')}</p>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {(customFrom || customTo) && (
              <button
                type="button"
                onClick={() => { setCustomFrom(''); setCustomTo(''); }}
                className="h-9 self-end rounded-md border px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {t('clearDates')}
              </button>
            )}
          </>
        )}
      </div>

      {customDatesIncomplete ? (
        <div className="rounded-xl border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">{t('customRangePrompt')}</p>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{t('errors.loadFailed')}</p>
        </div>
      ) : report ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard label={t('cards.total')} value={report.encounters.total} locale={locale} icon={Stethoscope} />
          <MetricCard label={t('cards.withDiagnosis')} value={report.encounters.withDiagnosis} locale={locale} icon={ClipboardCheck} />
          <MetricCard label={t('cards.withTreatmentPlan')} value={report.encounters.withTreatmentPlan} locale={locale} icon={ClipboardList} />
          <MetricCard label={t('cards.withoutDiagnosis')} value={report.encounters.withoutDiagnosis} locale={locale} icon={ClipboardX} />
          <MetricCard label={t('cards.prescriptionsTotal')} value={report.prescriptions.total} locale={locale} icon={Pill} />
          <MetricCard label={t('cards.prescriptionsWithRefills')} value={report.prescriptions.withRefills} locale={locale} icon={RefreshCw} />
        </div>
      ) : null}
    </div>
  );
}
