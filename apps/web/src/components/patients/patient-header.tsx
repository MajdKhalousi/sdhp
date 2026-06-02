'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { Patient } from '@/hooks/use-patient';
import { usePatientOutstandingBalance } from '@/hooks/use-invoices';
import { formatDateDisplay } from '@/lib/format-date';

interface PatientHeaderProps {
  patient?: Patient;
  isLoading: boolean;
}

function formatBloodType(raw: string | null): string {
  if (!raw) return '—';
  return raw.replace('_POS', '+').replace('_NEG', '−');
}

function formatAmount(value: number, locale: string): string {
  return (
    new Intl.NumberFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value) + ' SYP'
  );
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
  const t = useTranslations('patient');
  const locale = useLocale();
  const displayLocale = locale === 'ar' ? 'ar-u-nu-latn' : 'en-US';
  const { data: outstandingBalance } = usePatientOutstandingBalance(patient?.id);

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

  const displayName = locale === 'ar' && patient.firstNameAr
    ? `${patient.firstNameAr}${patient.lastNameAr ? ` ${patient.lastNameAr}` : ''}`
    : `${patient.firstName} ${patient.lastName}`;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <Initials name={displayName} />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{displayName}</h1>
            <Badge variant={patient.isActive ? 'success' : 'outline'}>
              {patient.isActive ? t('status.active') : t('status.inactive')}
            </Badge>
            {outstandingBalance && outstandingBalance.outstandingAmount > 0 && (
              <Badge
                variant="warning"
                title={t('header.outstandingInvoices', { count: outstandingBalance.invoiceCount })}
              >
                {t('header.outstandingBalance', {
                  amount: formatAmount(outstandingBalance.outstandingAmount, locale),
                })}
              </Badge>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="font-mono text-xs" dir="ltr">{patient.mrn}</span>
            {patient.dateOfBirth && (
              <span>{t('header.dob')} {formatDateDisplay(patient.dateOfBirth)}</span>
            )}
            {patient.gender && (
              <span>{t(`gender.${patient.gender.toLowerCase()}` as Parameters<typeof t>[0])}</span>
            )}
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
