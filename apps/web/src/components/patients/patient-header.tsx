'use client';

import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { Patient } from '@/hooks/use-patient';

interface PatientHeaderProps {
  patient?: Patient;
  isLoading: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatBloodType(raw: string | null): string {
  if (!raw) return '—';
  return raw.replace('_POS', '+').replace('_NEG', '−');
}

function formatGender(raw: string | null): string {
  if (!raw) return '—';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ');
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : parts[0][0] ?? '?';
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold uppercase text-primary-foreground">
      {initials}
    </div>
  );
}

export function PatientHeader({ patient, isLoading }: PatientHeaderProps) {
  const t = useTranslations('patient.status');

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </div>
    );
  }

  if (!patient) return null;

  const fullName = `${patient.firstName} ${patient.lastName}`;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <Initials name={fullName} />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{fullName}</h1>
            {patient.firstNameAr && (
              <span className="text-base text-muted-foreground" dir="rtl">
                {patient.firstNameAr} {patient.lastNameAr}
              </span>
            )}
            <Badge variant={patient.isActive ? 'success' : 'outline'}>
              {patient.isActive ? t('active') : t('inactive')}
            </Badge>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="font-mono text-xs" dir="ltr">{patient.mrn}</span>
            {patient.dateOfBirth && (
              <span>DOB: {formatDate(patient.dateOfBirth)}</span>
            )}
            {patient.gender && <span>{formatGender(patient.gender)}</span>}
            {patient.bloodType && (
              <span className="font-medium text-foreground">
                {formatBloodType(patient.bloodType)}
              </span>
            )}
            {patient.phone && <span dir="ltr">{patient.phone}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
