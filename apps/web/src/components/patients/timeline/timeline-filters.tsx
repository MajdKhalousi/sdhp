'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { TimelineEventType } from '@/types/timeline';

const ALL_TYPES: TimelineEventType[] = [
  'ENCOUNTER',
  'PRESCRIPTION',
  'LAB_ORDER',
  'RADIOLOGY_ORDER',
  'MEDICAL_FILE',
];

interface Props {
  selectedTypes: TimelineEventType[];
  onTypesChange(types: TimelineEventType[]): void;
  from: string;
  to: string;
  onFromChange(value: string): void;
  onToChange(value: string): void;
  disabled?: boolean;
}

export function TimelineFilters({
  selectedTypes,
  onTypesChange,
  from,
  to,
  onFromChange,
  onToChange,
  disabled = false,
}: Props) {
  const t = useTranslations('timeline');
  const isAll = selectedTypes.length === 0;

  function toggleType(type: TimelineEventType) {
    if (disabled) return;
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter((x) => x !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-3', disabled && 'opacity-60 pointer-events-none')}>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onTypesChange([])}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            isAll
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          {t('filter.all')}
        </button>
        {ALL_TYPES.map((type) => {
          const isSelected = selectedTypes.includes(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {t(`filter.types.${type}` as Parameters<typeof t>[0])}
            </button>
          );
        })}
      </div>

      <div className="ms-auto flex items-center gap-2">
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          disabled={disabled}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed"
          aria-label={t('filter.fromAriaLabel')}
        />
        <span className="text-xs text-muted-foreground">—</span>
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          disabled={disabled}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed"
          aria-label={t('filter.toAriaLabel')}
        />
      </div>
    </div>
  );
}
