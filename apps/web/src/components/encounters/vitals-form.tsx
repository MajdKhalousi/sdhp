'use client';

import { useTranslations } from 'next-intl';
import type { VitalsPayload } from '@/types/encounter';

interface VitalsFormProps {
  vitals: VitalsPayload;
  onChange: (vitals: VitalsPayload) => void;
  disabled?: boolean;
}

const VITALS_KEYS: (keyof VitalsPayload)[] = [
  'temperature', 'bloodPressure', 'heartRate',
  'oxygenSaturation', 'respiratoryRate', 'weight', 'height',
];

type VitalsKey = keyof VitalsPayload;

export function VitalsForm({ vitals, onChange, disabled }: VitalsFormProps) {
  const t = useTranslations('encounter.vitals');

  function handleChange(key: VitalsKey, value: string) {
    onChange({ ...vitals, [key]: value });
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {VITALS_KEYS.map((key) => (
        <div key={key} className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`vital-${key}`}>
            {t(`fields.${key}` as Parameters<typeof t>[0])}
          </label>
          <div className="relative">
            <input
              id={`vital-${key}`}
              type="text"
              dir="ltr"
              value={vitals[key] ?? ''}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={t(`placeholders.${key}` as Parameters<typeof t>[0])}
              disabled={disabled}
              className="h-8 w-full rounded-md border bg-background px-2.5 pe-10 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
            <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {t(`units.${key}` as Parameters<typeof t>[0])}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
