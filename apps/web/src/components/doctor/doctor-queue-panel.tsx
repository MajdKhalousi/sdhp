'use client';

import { useMemo } from 'react';
import { RefreshCw, Stethoscope } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useQueue } from '@/hooks/use-queue';
import { useInvoices } from '@/hooks/use-invoices';
import { QueueStatusBadge } from '@/components/queue/queue-status-badge';
import { InvoiceStatusBadge } from '@/components/billing/invoice-status-badge';
import { StartEncounterButton } from './start-encounter-button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Invoice, InvoiceStatus } from '@/types/invoice';

function todayDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Damascus' });
}

function getTodayRange() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  return {
    from: new Date(y, m, d, 0, 0, 0, 0).toISOString(),
    to:   new Date(y, m, d, 23, 59, 59, 999).toISOString(),
  };
}

const INVOICE_PRIORITY: Record<InvoiceStatus, number> = {
  DRAFT:          0,
  ISSUED:         1,
  PARTIALLY_PAID: 2,
  PAID:           3,
  CANCELLED:      99,
};

function formatScheduled(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
}

function relativeWait(iso: string, justNow: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return justNow;
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function waitMins(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
}

export function DoctorQueuePanel() {
  const t = useTranslations('doctorQueue');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const displayLocale = locale === 'ar' ? 'ar-u-nu-latn' : 'en-US';

  // No doctorId passed — the backend automatically scopes DOCTOR role queries
  // to the calling doctor's own profile (queue.service.ts buildWhere, DOCTOR branch).
  // Passing doctorId here would be ignored by the API for security reasons.
  const { data, isLoading, isError, error, refetch, isFetching } = useQueue({
    status: ['WAITING', 'CALLED', 'IN_PROGRESS'],
    date: todayDate(),
    limit: 50,
  });

  const { from, to } = useMemo(() => getTodayRange(), []);
  const { data: invoicesData } = useInvoices({ from, to, limit: 50 });
  const invoiceMap = useMemo(() => {
    const map = new Map<string, Invoice>();
    for (const inv of invoicesData?.data ?? []) {
      const existing = map.get(inv.patientId);
      if (!existing || INVOICE_PRIORITY[inv.status] < INVOICE_PRIORITY[existing.status]) {
        map.set(inv.patientId, inv);
      }
    }
    return map;
  }, [invoicesData]);

  const header = (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-sm font-semibold">{t('panelTitle')}</h2>
        <p className="text-xs text-muted-foreground">{t('autoRefresh')}</p>
      </div>
      <button
        onClick={() => refetch()}
        disabled={isFetching}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent disabled:opacity-40"
        aria-label={t('refreshLabel')}
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {header}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        {header}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
          <p className="text-sm font-medium text-destructive">{t('error.loadFailed')}</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            {error instanceof Error ? error.message : t('error.occurred')}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-1 h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
          >
            {tCommon('actions.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="space-y-4">
        {header}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Stethoscope className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">{t('empty.title')}</p>
          <p className="text-xs text-muted-foreground">{t('empty.subtitle')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}
      <div className="space-y-3">
        {data.data.map((entry) => {
          const { appointment } = entry;
          const { patient, doctor } = appointment;
          const waited = waitMins(entry.createdAt);
          const isLong = waited >= 20;
          const patientInvoice = invoiceMap.get(patient.id);
          return (
            <div key={entry.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base font-bold text-primary">
                  #{entry.ticketNumber}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {patient.firstName} {patient.lastName}
                    <span className="ms-1.5 font-mono text-xs font-normal text-muted-foreground" dir="ltr">
                      {patient.mrn}
                    </span>
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{t('card.scheduled', { time: formatScheduled(appointment.scheduledAt, displayLocale) })}</span>
                    <span className={isLong ? 'font-medium text-amber-600 dark:text-amber-400' : ''}>
                      {t('card.waited', { duration: relativeWait(entry.createdAt, t('card.justNow')) })}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <QueueStatusBadge status={entry.status} />
                    {patientInvoice && patientInvoice.status !== 'CANCELLED' && (
                      <InvoiceStatusBadge status={patientInvoice.status} />
                    )}
                  </div>
                </div>

                <StartEncounterButton
                  patientId={patient.id}
                  doctorId={doctor.id}
                  appointmentId={appointment.id}
                  appointmentStatus={appointment.status}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {t('counter', { count: data.total })}
      </p>
    </div>
  );
}
