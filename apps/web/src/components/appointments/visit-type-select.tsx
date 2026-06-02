'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useVisitTypesList } from '@/hooks/use-appointments';
import type { VisitType } from '@/types/clinic-settings';

interface Props {
  value: string;
  onChange: (visitTypeId: string, vt: VisitType | null) => void;
  disabled?: boolean;
}

export function VisitTypeSelect({ value, onChange, disabled }: Props) {
  const t      = useTranslations('appointment.form');
  const locale = useLocale();

  const { data: visitTypes, isLoading } = useVisitTypesList();
  const active = visitTypes?.filter((vt) => vt.isActive) ?? [];

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    const vt = active.find((v) => v.id === id) ?? null;
    onChange(id, vt);
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground" htmlFor="visitTypeId">
        {t('fields.visitTypeLabel')}{' '}
        <span className="text-xs text-muted-foreground">{t('fields.notesOptional')}</span>
      </label>
      <select
        id="visitTypeId"
        value={value}
        onChange={handleChange}
        disabled={disabled || isLoading}
        className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
      >
        <option value="">
          {isLoading
            ? t('select.loadingVisitTypes')
            : active.length === 0
            ? t('select.noVisitTypes')
            : t('select.selectVisitType')}
        </option>
        {active.map((vt) => {
          const name  = locale === 'ar' && vt.nameAr ? vt.nameAr : vt.name;
          const price = vt.basePrice
            ? `${parseFloat(vt.basePrice).toLocaleString(locale === 'ar' ? 'ar-u-nu-latn' : 'en-US')} SYP`
            : null;
          const label = [name, price, `${vt.durationMinutes} min`]
            .filter(Boolean)
            .join(' — ');
          return (
            <option key={vt.id} value={vt.id}>
              {label}
            </option>
          );
        })}
      </select>
    </div>
  );
}
