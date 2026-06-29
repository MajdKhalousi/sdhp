'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from '@/i18n/navigation';
import { CalendarRange, CalendarClock, CalendarPlus, CheckCircle2, XCircle, UserX } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useAuthStore } from '@/store/auth';
import { useAppointmentsReport } from '@/hooks/use-reports';
import { Skeleton } from '@/components/ui/skeleton';
import { REPORTS_APPOINTMENTS_ACCESS_ROLES } from '@/lib/permissions';

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

function StatusBreakdown({
  title,
  byStatus,
  locale,
  emptyLabel,
}: {
  title: string;
  byStatus: Record<string, number>;
  locale: string;
  emptyLabel: string;
}) {
  const t = useTranslations('appointment.status');
  const entries = Object.entries(byStatus);

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold">{title}</h2>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {entries.map(([status, count]) => (
            <div key={status} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t(status as Parameters<typeof t>[0])}
              </span>
              <span className="font-medium tabular-nums" dir="ltr">
                {formatCount(count, locale)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReportsAppointmentsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const t = useTranslations('reportsAppointments');
  const locale = useLocale();

  const canAccess = !!user && REPORTS_APPOINTMENTS_ACCESS_ROLES.has(user.role);

  const [preset, setPreset] = useState<Preset>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const { from, to } = useMemo(
    () => getDateRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const customDatesIncomplete = preset === 'custom' && (!customFrom || !customTo);

  const { data: report, isLoading, isError } = useAppointmentsReport(
    { from, to },
    canAccess && !customDatesIncomplete,
  );

  useEffect(() => {
    if (user && !REPORTS_APPOINTMENTS_ACCESS_ROLES.has(user.role)) {
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
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label={t('cards.total')} value={report.total} locale={locale} icon={CalendarRange} />
            <MetricCard label={t('cards.today')} value={report.today} locale={locale} icon={CalendarClock} />
            <MetricCard label={t('cards.upcoming')} value={report.upcoming} locale={locale} icon={CalendarPlus} />
            <MetricCard label={t('cards.completed')} value={report.completed} locale={locale} icon={CheckCircle2} />
            <MetricCard label={t('cards.cancelled')} value={report.cancelled} locale={locale} icon={XCircle} />
            <MetricCard label={t('cards.noShow')} value={report.noShow} locale={locale} icon={UserX} />
          </div>

          <StatusBreakdown
            title={t('breakdowns.byStatus')}
            byStatus={report.byStatus}
            locale={locale}
            emptyLabel={t('breakdowns.empty')}
          />
        </>
      ) : null}
    </div>
  );
}
