'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ICD_CODES } from '@/lib/icd-codes';
import type { IcdEntry } from '@/lib/icd-codes';

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}

const MAX_RESULTS = 15;

function normalizeQuery(s: string): string {
  return s.toLowerCase().trim();
}

export function IcdCodeCombobox({ id, value, onChange, readOnly, placeholder }: Props) {
  const t = useTranslations('encounter.icdLookup');
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Kept as render-time assignments so the mousedown handler always reads fresh values
  // without triggering effect re-registration on every keystroke.
  const latestOnChange = useRef(onChange);
  const latestInputValue = useRef(inputValue);
  latestOnChange.current = onChange;
  latestInputValue.current = inputValue;

  // Sync display with external value whenever the dropdown closes (e.g. after a save
  // that resets the field, or when a parent refreshes form state).
  useEffect(() => {
    if (!isOpen) setInputValue(value);
  }, [value, isOpen]);

  const filtered = useMemo<IcdEntry[]>(() => {
    const q = normalizeQuery(inputValue);
    if (!q) return ICD_CODES.slice(0, MAX_RESULTS);
    return ICD_CODES.filter(
      (entry) =>
        entry.code.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q),
    ).slice(0, MAX_RESULTS);
  }, [inputValue]);

  const knownEntry = useMemo(
    () => (value.trim() ? ICD_CODES.find((e) => e.code === value.trim()) ?? null : null),
    [value],
  );

  function handleFocus() {
    setIsOpen(true);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
    setIsOpen(true);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setInputValue(value);
    }
  }

  function handleSelect(entry: IcdEntry) {
    onChange(entry.code);
    setInputValue(entry.code);
    setIsOpen(false);
  }

  // Commit free-text and close when the user clicks outside the widget.
  // mousedown fires before click, so form state is updated before any save handler runs.
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        latestOnChange.current(latestInputValue.current.trim());
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  if (readOnly) {
    return (
      <div className="space-y-1">
        <input
          id={id}
          type="text"
          dir="ltr"
          value={value}
          disabled
          className="h-9 w-full rounded-md border bg-background px-3 text-sm font-mono outline-none transition-colors disabled:opacity-60"
        />
        {knownEntry && (
          <p className="text-xs text-muted-foreground" dir="ltr">{knownEntry.description}</p>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        dir="ltr"
        value={inputValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? t('placeholder')}
        autoComplete="off"
        className="h-9 w-full rounded-md border bg-background px-3 text-sm font-mono outline-none transition-colors focus:ring-2 focus:ring-ring"
      />
      {isOpen && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-md"
        >
          {filtered.length > 0 ? (
            filtered.map((entry) => (
              <li
                key={entry.code}
                role="option"
                aria-selected={entry.code === value}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(entry); }}
                className={`cursor-pointer px-3 py-2 text-sm hover:bg-accent ${
                  entry.code === value ? 'bg-accent/50' : ''
                }`}
              >
                <span className="font-mono font-medium" dir="ltr">{entry.code}</span>
                <span className="ms-2 text-xs text-muted-foreground" dir="ltr">{entry.description}</span>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-muted-foreground" dir="ltr">{t('noResults')}</li>
          )}
        </ul>
      )}
      {!isOpen && knownEntry && (
        <p className="mt-1 text-xs text-muted-foreground" dir="ltr">{knownEntry.description}</p>
      )}
    </div>
  );
}
