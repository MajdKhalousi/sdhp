'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import type { Patient } from '@/hooks/use-patient';

interface Props {
  id?: string;
  patients: Patient[];
  value: string;
  onChange: (patientId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  noResultsText?: string;
}

function normalizeSearch(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function displayFor(p: Patient): string {
  return `${p.firstName} ${p.lastName} — ${p.mrn}`;
}

export function PatientCombobox({
  id,
  patients,
  value,
  onChange,
  disabled,
  placeholder,
  noResultsText = 'No patients found',
}: Props) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDisplay = useMemo(() => {
    if (!value) return '';
    const p = patients.find((pt) => pt.id === value);
    return p ? displayFor(p) : '';
  }, [value, patients]);

  // Keep input in sync with selection when dropdown is closed
  useEffect(() => {
    if (!isOpen) setInputValue(selectedDisplay);
  }, [selectedDisplay, isOpen]);

  const searchNorm = normalizeSearch(inputValue);
  const filtered = useMemo(() => {
    if (!searchNorm) return patients;
    return patients.filter((p) => {
      const full = `${p.firstName} ${p.lastName}`.toLowerCase();
      const rev = `${p.lastName} ${p.firstName}`.toLowerCase();
      return (
        full.includes(searchNorm) ||
        rev.includes(searchNorm) ||
        (p.mrn ?? '').toLowerCase().includes(searchNorm) ||
        (p.phone ?? '').includes(inputValue.trim())
      );
    });
  }, [patients, searchNorm, inputValue]);

  function handleFocus() {
    setInputValue('');
    setIsOpen(true);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
    if (value) onChange('');
    setIsOpen(true);
  }

  function handleSelect(p: Patient) {
    onChange(p.id);
    setInputValue(displayFor(p));
    setIsOpen(false);
  }

  // Close and restore on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setInputValue(selectedDisplay);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [selectedDisplay]);

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        value={inputValue}
        onChange={handleChange}
        onFocus={handleFocus}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
      />
      {isOpen && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-md"
        >
          {filtered.length > 0 ? (
            filtered.map((p) => (
              <li
                key={p.id}
                role="option"
                aria-selected={p.id === value}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(p); }}
                className={`cursor-pointer px-3 py-2 text-sm hover:bg-accent ${
                  p.id === value ? 'bg-accent/50 font-medium' : ''
                }`}
              >
                {p.firstName} {p.lastName}
                <span className="ms-2 text-xs text-muted-foreground">{p.mrn}</span>
                {p.phone && (
                  <span className="ms-1 text-xs text-muted-foreground">· {p.phone}</span>
                )}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-muted-foreground">{noResultsText}</li>
          )}
        </ul>
      )}
    </div>
  );
}
