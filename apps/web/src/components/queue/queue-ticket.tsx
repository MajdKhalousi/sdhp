import { Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { QueueStatusBadge } from './queue-status-badge';
import { InvoiceStatusBadge } from '@/components/billing/invoice-status-badge';
import type { QueueEntry, QueueStatus } from '@/types/queue';
import type { Invoice } from '@/types/invoice';
import { formatTimeDisplay } from '@/lib/format-date';

function relativeTime(iso: string, justNow: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return justNow;
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

const STATUS_LEFT: Record<QueueStatus, string> = {
  WAITING:     'border-s-4 border-s-border',
  CALLED:      'border-s-4 border-s-amber-400',
  IN_PROGRESS: 'border-s-4 border-s-primary',
  DONE:        'border-s-4 border-s-green-400',
  SKIPPED:     'border-s-4 border-s-muted-foreground/30',
};

export function QueueTicket({ entry, invoice, visitTypeName }: { entry: QueueEntry; invoice?: Invoice; visitTypeName?: string }) {
  const t = useTranslations('queue.ticket');
  const locale = useLocale();
  const displayLocale = locale === 'ar' ? 'ar-u-nu-latn' : 'en-US';
  const { ticketNumber, status, createdAt, calledAt, appointment } = entry;
  const { patient, doctor } = appointment;

  const isDim = status === 'DONE' || status === 'SKIPPED';

  return (
    <div
      className={`flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-opacity ${STATUS_LEFT[status]} ${isDim ? 'opacity-55' : ''}`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
        #{ticketNumber}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          <Link
            href={`/dashboard/patients/${patient.id}`}
            className="hover:underline"
          >
            {patient.firstName} {patient.lastName}
          </Link>
          <span className="ms-1.5 font-mono text-xs font-normal text-muted-foreground" dir="ltr">
            {patient.mrn}
          </span>
        </p>
        <p className="truncate text-xs text-muted-foreground" dir="ltr">
          Dr. {doctor.user.firstName} {doctor.user.lastName}
          {doctor.specialization ? ` · ${doctor.specialization}` : ''}
          {patient.phone ? ` · ${patient.phone}` : ''}
        </p>
        {appointment.scheduledAt && (
          <p className="text-xs text-muted-foreground">
            {t('scheduled', { time: formatTimeDisplay(appointment.scheduledAt) })}
          </p>
        )}
        {visitTypeName && (
          <p className="text-xs text-muted-foreground">
            {t('visitType', { name: visitTypeName })}
          </p>
        )}
        {invoice && invoice.status !== 'CANCELLED' && (
          <div className="mt-1">
            <InvoiceStatusBadge status={invoice.status} />
          </div>
        )}
      </div>

      <div className="hidden shrink-0 text-end sm:block">
        {status === 'CALLED' && calledAt ? (
          <>
            <p className="text-xs text-muted-foreground">{t('called')}</p>
            <p className="text-sm tabular-nums">{relativeTime(calledAt, t('justNow'))}</p>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{t('inQueue')}</p>
            <p className="text-sm tabular-nums">{relativeTime(createdAt, t('justNow'))}</p>
          </>
        )}
      </div>

      <QueueStatusBadge status={status} />
    </div>
  );
}
