'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { UseMutationResult } from '@tanstack/react-query';
import type { ClinicSettings, UpsertClinicSettingsDto } from '@/types/clinic-settings';

const TIMEZONES = [
  { value: 'Asia/Damascus',   label: 'Asia/Damascus (UTC+3)' },
  { value: 'Asia/Beirut',     label: 'Asia/Beirut (UTC+2/+3)' },
  { value: 'Asia/Baghdad',    label: 'Asia/Baghdad (UTC+3)' },
  { value: 'Asia/Amman',      label: 'Asia/Amman (UTC+3)' },
  { value: 'Asia/Kuwait',     label: 'Asia/Kuwait (UTC+3)' },
  { value: 'Asia/Riyadh',     label: 'Asia/Riyadh (UTC+3)' },
  { value: 'Africa/Cairo',    label: 'Africa/Cairo (UTC+2/+3)' },
  { value: 'Europe/Istanbul', label: 'Europe/Istanbul (UTC+3)' },
  { value: 'UTC',             label: 'UTC' },
];

function inputClass(hasError?: boolean): string {
  const base =
    'w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2';
  return hasError
    ? `${base} border-destructive focus:ring-destructive/50`
    : `${base} border-input focus:ring-ring`;
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1 block text-sm font-medium text-foreground">
      {children}
      {required && <span className="ms-1 text-destructive">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

interface FormState {
  defaultSlotMin: string;
  lunchStartTime: string;
  lunchEndTime: string;
  timezone: string;
}

interface FormErrors {
  defaultSlotMin?: string;
  lunchStartTime?: string;
}

interface Props {
  settings: ClinicSettings | null;
  upsert: UseMutationResult<ClinicSettings, Error, UpsertClinicSettingsDto>;
}

export function ClinicSettingsForm({ settings, upsert }: Props) {
  const t = useTranslations('settings.clinic');

  const [values, setValues] = useState<FormState>({
    defaultSlotMin: String(settings?.defaultSlotMin ?? 20),
    lunchStartTime: settings?.lunchStartTime ?? '',
    lunchEndTime:   settings?.lunchEndTime   ?? '',
    timezone:       settings?.timezone       ?? 'Asia/Damascus',
  });
  const [errors, setErrors]       = useState<FormErrors>({});
  const [success, setSuccess]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setValues({
        defaultSlotMin: String(settings.defaultSlotMin ?? 20),
        lunchStartTime: settings.lunchStartTime ?? '',
        lunchEndTime:   settings.lunchEndTime   ?? '',
        timezone:       settings.timezone       ?? 'Asia/Damascus',
      });
    }
  }, [settings]);

  function set(field: keyof FormState, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSuccess(false);
    setSaveError(null);
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};
    const slot = parseInt(values.defaultSlotMin, 10);
    if (isNaN(slot) || slot <= 0) {
      errs.defaultSlotMin = t('validation.slotMin');
    }
    if (
      values.lunchStartTime &&
      values.lunchEndTime &&
      values.lunchStartTime >= values.lunchEndTime
    ) {
      errs.lunchStartTime = t('validation.lunchOrder');
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSuccess(false);
    setSaveError(null);
    try {
      await upsert.mutateAsync({
        defaultSlotMin: parseInt(values.defaultSlotMin, 10),
        lunchStartTime: values.lunchStartTime || undefined,
        lunchEndTime:   values.lunchEndTime   || undefined,
        timezone:       values.timezone       || undefined,
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
        <h2 className="text-sm font-semibold text-muted-foreground">{t('title')}</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          <div>
            <FieldLabel required>{t('fields.defaultSlotMin')}</FieldLabel>
            <div className="relative">
              <input
                type="number"
                min={1}
                value={values.defaultSlotMin}
                onChange={(e) => set('defaultSlotMin', e.target.value)}
                className={inputClass(!!errors.defaultSlotMin)}
                disabled={isPending}
                dir="ltr"
              />
              <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                {t('fields.defaultSlotMinHint')}
              </span>
            </div>
            <FieldError message={errors.defaultSlotMin} />
          </div>

          <div>
            <FieldLabel>{t('fields.timezone')}</FieldLabel>
            <select
              value={values.timezone}
              onChange={(e) => set('timezone', e.target.value)}
              className={inputClass()}
              disabled={isPending}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>{t('fields.lunchStart')}</FieldLabel>
            <input
              type="time"
              value={values.lunchStartTime}
              onChange={(e) => set('lunchStartTime', e.target.value)}
              className={inputClass(!!errors.lunchStartTime)}
              disabled={isPending}
              dir="ltr"
            />
            <FieldError message={errors.lunchStartTime} />
          </div>

          <div>
            <FieldLabel>{t('fields.lunchEnd')}</FieldLabel>
            <input
              type="time"
              value={values.lunchEndTime}
              onChange={(e) => set('lunchEndTime', e.target.value)}
              className={inputClass()}
              disabled={isPending}
              dir="ltr"
            />
          </div>

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
