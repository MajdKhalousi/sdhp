'use client';

import { useState, useMemo } from 'react';
import { RefreshCw, Inbox } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useQueue, useUpdateQueueEntry } from '@/hooks/use-queue';
import { useDoctorsList, useVisitTypesList } from '@/hooks/use-appointments';
import { useAuthStore } from '@/store/auth';
import { useInvoices } from '@/hooks/use-invoices';
import { QueueTicket } from './queue-ticket';
import { AdvanceQueueButton } from './advance-queue-button';
import { SkipQueueButton } from './skip-queue-button';
import { Skeleton } from '@/components/ui/skeleton';
import type { QueueStatus } from '@/types/queue';
import type { Invoice, InvoiceStatus } from '@/types/invoice';
import { formatTimeDisplay } from '@/lib/format-date';

const SKIPPABLE: QueueStatus[] = ['WAITING', 'CALLED'];

const QUEUE_OPERATE_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR', 'NURSE', 'SECRETARY']);
const QUEUE_MARK_DONE_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY', 'NURSE']);

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

const ALL_STATUSES: QueueStatus[] = ['WAITING', 'CALLED', 'IN_PROGRESS', 'DONE', 'SKIPPED'];

function todayDate() {
  // Damascus local date — must match the backend's Asia/Damascus day boundary.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Damascus' });
}

const ACTIVE_STATUSES: QueueStatus[] = ['WAITING', 'CALLED', 'IN_PROGRESS'];

export function QueueBoard() {
  const t = useTranslations('queue');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const displayLocale = locale === 'ar' ? 'ar-u-nu-latn' : 'en-US';

  const [status, setStatus] = useState<QueueStatus | '' | 'ALL'>('');
  const [todayOnly, setTodayOnly] = useState(true);
  const [doctorId, setDoctorId] = useState('');

  const date = todayOnly ? todayDate() : '';

  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useQueue({
    ...(status === 'ALL' ? {} : { status: status ? [status as QueueStatus] : ACTIVE_STATUSES }),
    ...(date ? { date } : {}),
    ...(doctorId ? { doctorId } : {}),
    limit: 100,
  });

  const { data: doctorsData } = useDoctorsList();
  const { data: visitTypesData } = useVisitTypesList();
  const { mutate: markDone, isPending: markingDone } = useUpdateQueueEntry();
  const role = useAuthStore((state) => state.user?.role);
  const canOperateQueue = role ? QUEUE_OPERATE_ROLES.has(role) : false;
  const canMarkDone = role ? QUEUE_MARK_DONE_ROLES.has(role) : false;
  const activeDoctors = (doctorsData?.data ?? []).filter((d) => d.isActive !== false);
  const getVisitTypeName = (visitTypeId?: string | null) => {
    if (!visitTypeId) return undefined;
    const vt = (visitTypesData ?? []).find((v) => v.id === visitTypeId);
    if (!vt) return undefined;
    return locale === 'ar' && vt.nameAr ? vt.nameAr : vt.name;
  };

  const { from, to } = useMemo(() => getTodayRange(), []);
  const { data: invoicesData } = useInvoices({ from, to, limit: 100 });
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

  const filters = (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as QueueStatus | '' | 'ALL')}
        className="h-8 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        aria-label={t('board.filter.byStatus')}
      >
        <option value="">{t('board.filter.active')}</option>
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>{t(`status.${s}` as Parameters<ReturnType<typeof useTranslations<'queue'>>>[0])}</option>
        ))}
        <option value="ALL">{t('board.filter.all')}</option>
      </select>

      <select
        value={doctorId}
        onChange={(e) => setDoctorId(e.target.value)}
        className="h-8 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        aria-label={t('board.filter.byDoctor')}
      >
        <option value="">{tCommon('filter.allDoctors')}</option>
        {activeDoctors.map((d) => (
          <option key={d.id} value={d.id}>
            Dr. {d.user.firstName} {d.user.lastName}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-1.5 text-sm select-none">
        <input
          type="checkbox"
          checked={todayOnly}
          onChange={(e) => setTodayOnly(e.target.checked)}
          className="rounded border"
        />
        {t('board.filter.todayOnly')}
      </label>

      {(status || doctorId || !todayOnly) && (
        <button
          onClick={() => { setStatus(''); setDoctorId(''); setTodayOnly(true); }}
          className="h-8 rounded-md border px-3 text-xs text-muted-foreground transition-colors hover:bg-accent"
        >
          {tCommon('filter.clearFilters')}
        </button>
      )}

      <div className="ms-auto flex items-center gap-2">
        {dataUpdatedAt > 0 && !isFetching && (
          <span className="text-xs text-muted-foreground">
            {t('board.updatedAt', {
              time: formatTimeDisplay(new Date(dataUpdatedAt)),
            })}
          </span>
        )}
        {isFetching && !isLoading && (
          <span className="text-xs text-muted-foreground">{t('board.refreshing')}</span>
        )}
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent disabled:opacity-40"
          aria-label={t('board.refreshLabel')}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {filters}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div className="space-y-4">
        {filters}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-16 text-center">
          <p className="text-sm font-medium text-destructive">{t('board.error.loadFailed')}</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            {error instanceof Error ? error.message : tCommon('states.error')}
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

  const staleErrorBanner = isError && data ? (
    <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-400">
      <span>{t('board.stale')}</span>
      <button onClick={() => refetch()} className="ms-2 underline hover:no-underline">
        {t('board.retry')}
      </button>
    </div>
  ) : null;

  if (!data || data.data.length === 0) {
    return (
      <div className="space-y-4">
        {filters}
        {staleErrorBanner}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">{t('board.empty.heading')}</p>
          <p className="text-xs text-muted-foreground">
            {status || doctorId || !todayOnly
              ? t('board.empty.withFilters')
              : t('board.empty.noCheckins')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filters}
      {staleErrorBanner}
      <div className="space-y-3">
        {data.data.map((entry) => (
          <div key={entry.id} className="space-y-1">
            <QueueTicket
              entry={entry}
              invoice={invoiceMap.get(entry.appointment.patient.id)}
              visitTypeName={getVisitTypeName(entry.appointment.visitTypeId)}
            />
            {SKIPPABLE.includes(entry.status) && canOperateQueue && (
              <div className="flex items-center justify-end gap-2 px-1">
                <AdvanceQueueButton entryId={entry.id} status={entry.status} />
                <SkipQueueButton entryId={entry.id} />
              </div>
            )}
            {entry.status === 'IN_PROGRESS' && canMarkDone && (
              <div className="flex items-center justify-end gap-2 px-1">
                <button
                  onClick={() => markDone({ id: entry.id, dto: { status: 'DONE' } })}
                  disabled={markingDone}
                  className="h-6 rounded bg-green-600 px-2 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
                >
                  {markingDone ? '…' : t('advance.done')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {t('board.filteredCount', { count: data.total })}
      </p>
    </div>
  );
}
