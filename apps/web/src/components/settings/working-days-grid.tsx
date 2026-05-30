'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { UseMutationResult } from '@tanstack/react-query';
import type { ClinicSettings, ClinicWorkingDay, UpsertWorkingDaysDto } from '@/types/clinic-settings';

const DEFAULT_START = '09:00';
const DEFAULT_END   = '17:00';

function timeInputClass(hasError?: boolean, disabled?: boolean): string {
  const base =
    'w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 border-input focus:ring-ring';
  const errCls  = hasError  ? ' border-destructive focus:ring-destructive/50' : '';
  const disCls  = disabled  ? ' opacity-50 cursor-not-allowed'                : '';
  return base + errCls + disCls;
}

interface DayRow {
  dayOfWeek: number;
  isOpen:    boolean;
  startTime: string;
  endTime:   string;
}

interface RowError {
  startTime?: string;
}

function initRows(workingDays: ClinicWorkingDay[]): DayRow[] {
  return Array.from({ length: 7 }, (_, i) => {
    const day = workingDays.find((d) => d.dayOfWeek === i);
    return {
      dayOfWeek: i,
      isOpen:    day?.isOpen    ?? false,
      startTime: day?.startTime ?? DEFAULT_START,
      endTime:   day?.endTime   ?? DEFAULT_END,
    };
  });
}

interface Props {
  workingDays: ClinicWorkingDay[];
  upsert: UseMutationResult<ClinicSettings, Error, UpsertWorkingDaysDto>;
}

export function WorkingDaysGrid({ workingDays, upsert }: Props) {
  const t = useTranslations('settings.clinic');

  const [rows, setRows]           = useState<DayRow[]>(() => initRows(workingDays));
  const [rowErrors, setRowErrors] = useState<Record<number, RowError>>({});
  const [success, setSuccess]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setRows(initRows(workingDays));
  }, [workingDays]);

  function setRow(dayOfWeek: number, patch: Partial<DayRow>) {
    setRows((prev) =>
      prev.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...patch } : r)),
    );
    setRowErrors((prev) => ({ ...prev, [dayOfWeek]: {} }));
    setSuccess(false);
    setSaveError(null);
  }

  function validate(): boolean {
    const errs: Record<number, RowError> = {};
    for (const row of rows) {
      if (!row.isOpen) continue;
      if (row.startTime >= row.endTime) {
        errs[row.dayOfWeek] = { startTime: t('validation.dayTimeOrder') };
      }
    }
    setRowErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSuccess(false);
    setSaveError(null);
    try {
      await upsert.mutateAsync({
        days: rows.map((r) => ({
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime:   r.endTime,
          isOpen:    r.isOpen,
        })),
      });
      setSuccess(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('error.saveFailed'));
    }
  }

  const isPending = upsert.isPending;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">{t('workingDays.heading')}</h2>

        {/* Column headers */}
        <div className="grid grid-cols-[minmax(100px,1fr)_44px_1fr_1fr] gap-3 border-b pb-2">
          <span className="text-xs font-medium text-muted-foreground">{t('workingDays.columns.day')}</span>
          <span className="text-xs font-medium text-muted-foreground text-center">{t('workingDays.columns.open')}</span>
          <span className="text-xs font-medium text-muted-foreground">{t('workingDays.columns.start')}</span>
          <span className="text-xs font-medium text-muted-foreground">{t('workingDays.columns.end')}</span>
        </div>

        {/* Day rows */}
        <div className="space-y-2">
          {rows.map((row) => {
            const rowErr = rowErrors[row.dayOfWeek];
            return (
              <div
                key={row.dayOfWeek}
                className="grid grid-cols-[minmax(100px,1fr)_44px_1fr_1fr] gap-3 items-start"
              >
                {/* Day name */}
                <span className="pt-2 text-sm font-medium">
                  {t(`workingDays.days.${row.dayOfWeek}` as Parameters<typeof t>[0])}
                </span>

                {/* Open toggle */}
                <div className="flex justify-center pt-2.5">
                  <input
                    type="checkbox"
                    checked={row.isOpen}
                    onChange={(e) => setRow(row.dayOfWeek, { isOpen: e.target.checked })}
                    disabled={isPending}
                    className="h-4 w-4 rounded border-input accent-primary cursor-pointer disabled:cursor-not-allowed"
                  />
                </div>

                {/* Start time */}
                <div>
                  <input
                    type="time"
                    value={row.startTime}
                    onChange={(e) => setRow(row.dayOfWeek, { startTime: e.target.value })}
                    className={timeInputClass(!!rowErr?.startTime, !row.isOpen || isPending)}
                    disabled={!row.isOpen || isPending}
                    dir="ltr"
                  />
                  {rowErr?.startTime && (
                    <p className="mt-0.5 text-xs text-destructive">{rowErr.startTime}</p>
                  )}
                </div>

                {/* End time */}
                <div>
                  <input
                    type="time"
                    value={row.endTime}
                    onChange={(e) => setRow(row.dayOfWeek, { endTime: e.target.value })}
                    className={timeInputClass(false, !row.isOpen || isPending)}
                    disabled={!row.isOpen || isPending}
                    dir="ltr"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {success && (
          <p className="text-sm text-green-600 dark:text-green-400">{t('success')}</p>
        )}
        {saveError && (
          <p className="text-sm text-destructive">{saveError}</p>
        )}

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
