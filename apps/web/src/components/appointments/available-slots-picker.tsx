'use client';

import { useTranslations } from 'next-intl';
import { useAvailableSlots } from '@/hooks/use-doctor-schedules';
import { cn } from '@/lib/utils';

interface Props {
  doctorId: string;
  date: string;
  slotDurationMin: number;
  selectedSlot: string;
  onSelect: (time: string) => void;
}

export function AvailableSlotsPicker({
  doctorId,
  date,
  slotDurationMin,
  selectedSlot,
  onSelect,
}: Props) {
  const t = useTranslations('appointment.form');

  const { data, isLoading, isError } = useAvailableSlots(doctorId, {
    date,
    slotDurationMin,
  });

  function renderContent() {
    if (!doctorId) {
      return <Hint>{t('select.selectDoctorFirst')}</Hint>;
    }
    if (!date) {
      return <Hint>{t('select.selectDate')}</Hint>;
    }
    if (isLoading) {
      return <Hint>{t('slots.loading')}</Hint>;
    }
    if (isError || !data) {
      return <Hint>{t('slots.noSlots')}</Hint>;
    }
    const { slots } = data;
    if (slots.length === 0) {
      return <Hint>{t('slots.noSlots')}</Hint>;
    }
    return (
      <div className="flex flex-wrap gap-2" dir="ltr">
        {slots.map((slot) => {
          const isSelected = slot.time === selectedSlot;
          return (
            <button
              key={slot.time}
              type="button"
              disabled={!slot.available}
              onClick={() => onSelect(slot.time)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : slot.available
                  ? 'border-input hover:bg-muted'
                  : 'cursor-not-allowed border-input opacity-40 line-through',
              )}
            >
              {slot.time}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {t('fields.slotLabel')} <span className="text-destructive">*</span>
      </label>
      <div className="min-h-9 rounded-md border bg-background p-3">
        {renderContent()}
      </div>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
