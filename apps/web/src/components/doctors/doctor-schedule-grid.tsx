'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useDoctorSchedule, useUpsertDoctorSchedule } from '@/hooks/use-doctor-schedules';
import { Skeleton } from '@/components/ui/skeleton';
import type { DoctorScheduleDay } from '@/types/doctor-schedule';

const DEFAULT_START = '09:00';
const DEFAULT_END   = '17:00';

function timeInputClass(disabled?: boolean): string {
  const base = 'w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 border-input focus:ring-ring';
  return base + (disabled ? ' opacity-50 cursor-not-allowed' : '');
}

interface DayRow {
  dayOfWeek: number;
  isActive:  boolean;
  startTime: string;
  endTime:   string;
}

function initRows(days: DoctorScheduleDay[]): DayRow[] {
  return Array.from({ length: 7 }, (_, i) => {
    const day = days.find((d) => d.dayOfWeek === i);
    return {
      dayOfWeek: i,
      isActive:  day?.isActive  ?? false,
      startTime: day?.startTime ?? DEFAULT_START,
      endTime:   day?.endTime   ?? DEFAULT_END,
    };
  });
}

export function DoctorScheduleGrid({ doctorId }: { doctorId: string }) {
  const t       = useTranslations('doctors.schedule.weekly');
  const tCommon = useTranslations('common');

  const { data: scheduleDays = [], isLoading, isError, refetch } = useDoctorSchedule(doctorId);
  const upsert = useUpsertDoctorSchedule(doctorId);

  const [rows, setRows]           = useState<DayRow[]>(() => initRows(scheduleDays));
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setRows(initRows(scheduleDays));
    setRowErrors({});
  }, [scheduleDays]);

  function setRow(dayOfWeek: number, patch: Partial<DayRow>) {
    setRows((prev) => prev.map((r) => r.dayOfWeek === dayOfWeek ? { ...r, ...patch } : r));
    setRowErrors((prev) => { const next = { ...prev }; delete next[dayOfWeek]; return next; });
    setSaveError(null);
  }

  function validate(): boolean {
    const errs: Record<number, string> = {};
    for (const row of rows) {
      if (!row.isActive) continue;
      if (row.startTime >= row.endTime) {
        errs[row.dayOfWeek] = t('validation.timeOrder');
      }
    }
    setRowErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaveError(null);
    try {
      await upsert.mutateAsync({
        days: rows.map((r) => ({
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime:   r.endTime,
          isActive:  r.isActive,
        })),
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('error.saveFailed'));
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[minmax(100px,1fr)_44px_1fr_1fr] gap-3">
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">{t('error.loadFailed')}</p>
        <button onClick={() => refetch()} className="mt-2 text-sm text-primary hover:underline">
          {tCommon('actions.tryAgain')}
        </button>
      </div>
    );
  }

  const isPending = upsert.isPending;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">{t('heading')}</h2>

        <div className="grid grid-cols-[minmax(100px,1fr)_44px_1fr_1fr] gap-3 border-b pb-2">
          <span className="text-xs font-medium text-muted-foreground">{t('columns.day')}</span>
          <span className="text-xs font-medium text-muted-foreground text-center">{t('columns.active')}</span>
          <span className="text-xs font-medium text-muted-foreground">{t('columns.start')}</span>
          <span className="text-xs font-medium text-muted-foreground">{t('columns.end')}</span>
        </div>

        <div className="space-y-2">
          {rows.map((row) => {
            const rowErr = rowErrors[row.dayOfWeek];
            return (
              <div
                key={row.dayOfWeek}
                className="grid grid-cols-[minmax(100px,1fr)_44px_1fr_1fr] gap-3 items-start"
              >
                <span className="pt-2 text-sm font-medium">
                  {t(`days.${row.dayOfWeek}` as Parameters<typeof t>[0])}
                </span>

                <div className="flex justify-center pt-2.5">
                  <input
                    type="checkbox"
                    checked={row.isActive}
                    onChange={(e) => setRow(row.dayOfWeek, { isActive: e.target.checked })}
                    disabled={isPending}
                    className="h-4 w-4 rounded border-input accent-primary cursor-pointer disabled:cursor-not-allowed"
                  />
                </div>

                <input
                  type="time"
                  value={row.startTime}
                  onChange={(e) => setRow(row.dayOfWeek, { startTime: e.target.value })}
                  className={timeInputClass(!row.isActive || isPending)}
                  disabled={!row.isActive || isPending}
                  dir="ltr"
                />

                <div>
                  <input
                    type="time"
                    value={row.endTime}
                    onChange={(e) => setRow(row.dayOfWeek, { endTime: e.target.value })}
                    className={timeInputClass(!row.isActive || isPending)}
                    disabled={!row.isActive || isPending}
                    dir="ltr"
                  />
                  {rowErr && (
                    <p className="mt-0.5 text-xs text-destructive">{rowErr}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {saveError && <p className="text-sm text-destructive">{saveError}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? t('actions.saving') : t('actions.save')}
          </button>
        </div>
      </div>
    </form>
  );
}
