'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useUpdateAppointment } from '@/hooks/use-appointments';
import { VisitTypeSelect } from './visit-type-select';
import { AvailableSlotsPicker } from './available-slots-picker';
import type { Appointment } from '@/types/appointment';
import type { VisitType } from '@/types/clinic-settings';

interface Props {
  appointment: Appointment;
  onClose: () => void;
}

interface FormState {
  date: string;
  visitTypeId: string;
  selectedSlot: string;
}

const INITIAL: FormState = { date: '', visitTypeId: '', selectedSlot: '' };

export function RescheduleDialog({ appointment, onClose }: Props) {
  const t = useTranslations('appointment.reschedule');

  const [form, setForm] = useState<FormState>(INITIAL);
  const [selectedVisitType, setSelectedVisitType] = useState<VisitType | null>(null);
  const [validationError, setValidationError] = useState('');

  const { mutate, isPending, error: mutationError } = useUpdateAppointment();

  const durationMin =
    selectedVisitType?.durationMinutes ??
    appointment.doctor.consultationMinutes ??
    15;

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, date: e.target.value, selectedSlot: '' }));
    setValidationError('');
  }

  function handleVisitTypeChange(visitTypeId: string, vt: VisitType | null) {
    setForm((prev) => ({ ...prev, visitTypeId, selectedSlot: '' }));
    setSelectedVisitType(vt);
    setValidationError('');
  }

  function handleSlotSelect(time: string) {
    setForm((prev) => ({ ...prev, selectedSlot: time }));
    setValidationError('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.date) { setValidationError(t('validation.dateRequired')); return; }
    if (!form.selectedSlot) { setValidationError(t('validation.slotRequired')); return; }

    const scheduledAt = new Date(`${form.date}T${form.selectedSlot}:00+03:00`).toISOString();

    mutate(
      {
        id: appointment.id,
        dto: {
          scheduledAt,
          durationMin,
          ...(form.visitTypeId ? { visitTypeId: form.visitTypeId } : {}),
        },
      },
      { onSuccess: onClose },
    );
  }

  const apiError = mutationError instanceof Error ? mutationError.message : null;
  const displayError = validationError || apiError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-card shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reschedule-title"
      >
        <div className="border-b border-border px-5 py-4">
          <h2 id="reschedule-title" className="text-base font-semibold">
            {t('title')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {displayError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {displayError}
            </div>
          )}

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {t('dateLabel')} <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              value={form.date}
              onChange={handleDateChange}
              disabled={isPending}
              dir="ltr"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>

          {/* Visit Type */}
          <VisitTypeSelect
            value={form.visitTypeId}
            onChange={handleVisitTypeChange}
            disabled={isPending}
          />

          {/* Available Slots */}
          <AvailableSlotsPicker
            doctorId={appointment.doctorId}
            date={form.date}
            slotDurationMin={durationMin}
            selectedSlot={form.selectedSlot}
            onSelect={handleSlotSelect}
          />

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? t('confirming') : t('confirm')}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="h-9 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
