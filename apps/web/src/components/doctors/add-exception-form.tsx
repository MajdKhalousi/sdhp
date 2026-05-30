'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { UseMutationResult } from '@tanstack/react-query';
import type {
  ScheduleException,
  ScheduleExceptionType,
  CreateScheduleExceptionDto,
  UpdateScheduleExceptionDto,
} from '@/types/doctor-schedule';

const EXCEPTION_TYPES: ScheduleExceptionType[] = ['HOLIDAY', 'LEAVE', 'CUSTOM_HOURS'];

function inputClass(hasError?: boolean): string {
  const base = 'w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2';
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
  date:      string;
  type:      ScheduleExceptionType | '';
  startTime: string;
  endTime:   string;
  reason:    string;
}

interface FormErrors {
  date?:      string;
  type?:      string;
  startTime?: string;
}

export interface ExceptionFormProps {
  mode:     'create' | 'edit';
  initial?: ScheduleException;
  create:   UseMutationResult<ScheduleException, Error, CreateScheduleExceptionDto, unknown>;
  update:   UseMutationResult<ScheduleException, Error, { exceptionId: string; dto: UpdateScheduleExceptionDto }, unknown>;
  onDone:   () => void;
}

export function ExceptionForm({ mode, initial, create, update, onDone }: ExceptionFormProps) {
  const t       = useTranslations('doctors.schedule.exceptions');
  const tCommon = useTranslations('common');

  const [values, setValues] = useState<FormState>({
    date:      initial?.date       ?? '',
    type:      initial?.type       ?? '',
    startTime: initial?.startTime  ?? '',
    endTime:   initial?.endTime    ?? '',
    reason:    initial?.reason     ?? '',
  });
  const [errors, setErrors]       = useState<FormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSaveError(null);
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!values.date.trim())  errs.date = t('form.validation.dateRequired');
    if (!values.type)         errs.type = t('form.validation.typeRequired');
    if (values.type === 'CUSTOM_HOURS' && (!values.startTime || !values.endTime)) {
      errs.startTime = t('form.validation.customHoursTime');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaveError(null);

    const type     = values.type as ScheduleExceptionType;
    const isCustom = type === 'CUSTOM_HOURS';

    try {
      if (mode === 'create') {
        await create.mutateAsync({
          date: values.date,
          type,
          ...(isCustom ? { startTime: values.startTime, endTime: values.endTime } : {}),
          ...(values.reason.trim() ? { reason: values.reason.trim() } : {}),
        });
      } else if (initial) {
        await update.mutateAsync({
          exceptionId: initial.id,
          dto: {
            type,
            ...(isCustom ? { startTime: values.startTime, endTime: values.endTime } : {}),
            ...(values.reason.trim() ? { reason: values.reason.trim() } : {}),
          },
        });
      }
      onDone();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('error.saveFailed'));
    }
  }

  const isPending = create.isPending || update.isPending;
  const isCustom  = values.type === 'CUSTOM_HOURS';

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Date */}
        <div>
          <FieldLabel required>{t('form.fields.date')}</FieldLabel>
          <input
            type="date"
            value={values.date}
            onChange={(e) => set('date', e.target.value)}
            disabled={mode === 'edit' || isPending}
            className={inputClass(!!errors.date)}
            dir="ltr"
          />
          <FieldError message={errors.date} />
        </div>

        {/* Type */}
        <div>
          <FieldLabel required>{t('form.fields.type')}</FieldLabel>
          <select
            value={values.type}
            onChange={(e) => set('type', e.target.value as ScheduleExceptionType | '')}
            disabled={isPending}
            className={inputClass(!!errors.type)}
          >
            <option value="">{t('form.typePrompt')}</option>
            {EXCEPTION_TYPES.map((et) => (
              <option key={et} value={et}>
                {t(`type.${et}` as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
          <FieldError message={errors.type} />
        </div>

        {/* Custom hours — start/end time */}
        {isCustom && (
          <>
            <div>
              <FieldLabel required>{t('form.fields.startTime')}</FieldLabel>
              <input
                type="time"
                value={values.startTime}
                onChange={(e) => set('startTime', e.target.value)}
                disabled={isPending}
                className={inputClass(!!errors.startTime)}
                dir="ltr"
              />
              <FieldError message={errors.startTime} />
            </div>
            <div>
              <FieldLabel required>{t('form.fields.endTime')}</FieldLabel>
              <input
                type="time"
                value={values.endTime}
                onChange={(e) => set('endTime', e.target.value)}
                disabled={isPending}
                className={inputClass()}
                dir="ltr"
              />
            </div>
          </>
        )}

        {/* Reason */}
        <div className={isCustom ? 'sm:col-span-2 lg:col-span-1' : 'sm:col-span-2 lg:col-span-1'}>
          <FieldLabel>{t('form.fields.reason')}</FieldLabel>
          <input
            type="text"
            value={values.reason}
            onChange={(e) => set('reason', e.target.value)}
            disabled={isPending}
            placeholder={t('form.placeholders.reason')}
            className={inputClass()}
          />
        </div>

        {/* Actions row */}
        <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-2">
          {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onDone}
              disabled={isPending}
              className="rounded-lg border border-input px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
            >
              {tCommon('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending
                ? (mode === 'create' ? t('form.actions.creating') : t('form.actions.saving'))
                : (mode === 'create' ? t('form.actions.create')   : t('form.actions.save'))}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
