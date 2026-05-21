'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  value: string;
  label: string;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange(value: string): void;
  /** Accessible label for the tablist — required for screen readers */
  'aria-label'?: string;
  className?: string;
}

export function Tabs({
  tabs,
  value,
  onChange,
  'aria-label': ariaLabel = 'Navigation tabs',
  className,
}: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const enabledTabs = tabs.filter((t) => !t.disabled);

  function moveTo(nextValue: string) {
    onChange(nextValue);
    // Defer focus until React re-renders tabIndex attributes
    requestAnimationFrame(() => {
      listRef.current
        ?.querySelector<HTMLButtonElement>(`[data-tabvalue="${nextValue}"]`)
        ?.focus();
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const idx = enabledTabs.findIndex((t) => t.value === value);
    const last = enabledTabs.length - 1;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        moveTo(enabledTabs[(idx + 1) % enabledTabs.length].value);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        moveTo(enabledTabs[(idx - 1 + enabledTabs.length) % enabledTabs.length].value);
        break;
      case 'Home':
        e.preventDefault();
        moveTo(enabledTabs[0].value);
        break;
      case 'End':
        e.preventDefault();
        moveTo(enabledTabs[last].value);
        break;
    }
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cn('flex border-b border-border', className)}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            id={`tab-${tab.value}`}
            data-tabvalue={tab.value}
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.value}`}
            disabled={tab.disabled}
            tabIndex={isActive ? 0 : -1}
            onClick={() => !tab.disabled && onChange(tab.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              'relative select-none px-4 py-2.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              isActive
                ? 'text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-primary'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              tab.disabled && 'cursor-not-allowed opacity-40',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Tab Panel ─────────────────────────────────────────────────────────────────

interface TabPanelProps {
  value: string;
  activeValue: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ value, activeValue, children, className }: TabPanelProps) {
  if (value !== activeValue) return null;
  return (
    <div
      role="tabpanel"
      id={`tabpanel-${value}`}
      aria-labelledby={`tab-${value}`}
      tabIndex={0}
      className={cn('outline-none', className)}
    >
      {children}
    </div>
  );
}
