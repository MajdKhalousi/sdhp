'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useServicesList } from '@/hooks/use-invoices';
import type { Service } from '@/types/clinic-settings';

interface Props {
  value: string;
  onChange: (serviceId: string, service: Service | null) => void;
  disabled?: boolean;
}

export function ServicePicker({ value, onChange, disabled }: Props) {
  const t      = useTranslations('invoice.items.addForm');
  const locale = useLocale();

  const { data: services, isLoading } = useServicesList();
  const active = services?.filter((s) => s.isActive) ?? [];

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id  = e.target.value;
    const svc = active.find((s) => s.id === id) ?? null;
    onChange(id, svc);
  }

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-foreground">
        {t('service')} <span className="text-destructive">*</span>
      </label>
      <select
        value={value}
        onChange={handleChange}
        disabled={disabled || isLoading}
        className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
      >
        <option value="">
          {isLoading
            ? t('loadingServices')
            : active.length === 0
            ? t('noServices')
            : t('servicePlaceholder')}
        </option>
        {active.map((svc) => {
          const name = locale === 'ar' && svc.nameAr ? svc.nameAr : svc.name;
          return (
            <option key={svc.id} value={svc.id}>
              {name} — {svc.defaultPrice}
            </option>
          );
        })}
      </select>
    </div>
  );
}
