'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, Printer, Receipt } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useInvoices, useBillingReport } from '@/hooks/use-invoices';
import { useAppointments } from '@/hooks/use-appointments';
import { useAuthStore } from '@/store/auth';
import { InvoiceStatusBadge } from '@/components/billing/invoice-status-badge';
import { IssueAndPayDialog } from '@/components/billing/issue-and-pay-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDateDisplay, formatDateTimeDisplay } from '@/lib/format-date';
import { isOverdue } from '@/lib/billing-utils';
import type { Invoice } from '@/types/invoice';
import type { Appointment } from '@/types/appointment';

const BILLING_REPORT_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'ACCOUNTANT']);

function formatAmount(value: string, locale: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '— SYP';
  return (
    new Intl.NumberFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num) + ' SYP'
  );
}

function getTodayRange() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  return {
    from: new Date(y, m, d, 0, 0, 0, 0).toISOString(),
    to: new Date(y, m, d, 23, 59, 59, 999).toISOString(),
    dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
  };
}

interface RowProps {
  invoice: Invoice;
  isActive: boolean;
  onAction: () => void;
  onSuccess: () => void;
  onCancel: () => void;
}

function InvoiceRow({ invoice, isActive, onAction, onSuccess, onCancel }: RowProps) {
  const t = useTranslations('cashier');
  const tInvoicePrint = useTranslations('invoice.print');
  const locale = useLocale();

  const total = parseFloat(invoice.totalAmount);
  const paid = parseFloat(invoice.paidAmount);
  const remaining = Math.max(0, total - paid);
  const isPaid = invoice.status === 'PAID';

  function getActionLabel(): string {
    switch (invoice.status) {
      case 'DRAFT': return t('actions.issueAndPay');
      case 'ISSUED': return t('actions.collectPayment');
      case 'PARTIALLY_PAID': return t('actions.collectRemaining');
      default: return '';
    }
  }

  return (
    <div className={`border-b border-border last:border-b-0 ${isPaid ? 'opacity-75' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
        {/* Patient + invoice info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              {invoice.patient.firstName} {invoice.patient.lastName}
            </span>
            <span className="text-xs text-muted-foreground" dir="ltr">{invoice.patient.mrn}</span>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Link
              href={`/dashboard/invoices/${invoice.id}`}
              className="tabular-nums hover:underline"
              dir="ltr"
            >
              {invoice.invoiceNumber}
            </Link>
            <span aria-hidden>·</span>
            <span dir="ltr">{formatAmount(invoice.totalAmount, locale)}</span>
            {remaining > 0 && paid > 0 && (
              <>
                <span aria-hidden>·</span>
                <span dir="ltr" className="font-medium text-amber-600 dark:text-amber-400">
                  {formatAmount(String(remaining), locale)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action */}
        <div className="shrink-0">
          {isPaid ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t('actions.paid')}
              </div>
              <a
                href={`/${locale}/invoice/${invoice.id}/print`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors hover:bg-accent"
              >
                <Printer className="h-3 w-3" />
                {tInvoicePrint('printReceipt')}
              </a>
            </div>
          ) : (
            <button
              onClick={onAction}
              disabled={isActive}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <CreditCard className="h-3 w-3" />
              {getActionLabel()}
            </button>
          )}
        </div>
      </div>

      {/* Expandable payment form */}
      {isActive && (
        <div className="border-t border-border">
          <IssueAndPayDialog
            invoice={invoice}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </div>
      )}
    </div>
  );
}

function OutstandingRow({ invoice, isActive, onAction, onSuccess, onCancel }: RowProps) {
  const t = useTranslations('cashier');
  const tInvoice = useTranslations('invoice');
  const locale = useLocale();

  const total = parseFloat(invoice.totalAmount);
  const paid = parseFloat(invoice.paidAmount);
  const remaining = Math.max(0, total - paid);

  function getActionLabel(): string {
    if (invoice.status === 'ISSUED') return t('actions.collectPayment');
    if (invoice.status === 'PARTIALLY_PAID') return t('actions.collectRemaining');
    return '';
  }

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              {invoice.patient.firstName} {invoice.patient.lastName}
            </span>
            <span className="text-xs text-muted-foreground" dir="ltr">{invoice.patient.mrn}</span>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Link
              href={`/dashboard/invoices/${invoice.id}`}
              className="tabular-nums hover:underline"
              dir="ltr"
            >
              {invoice.invoiceNumber}
            </Link>
            <span aria-hidden>·</span>
            <span dir="ltr">{formatDateDisplay(invoice.issuedAt ?? invoice.createdAt)}</span>
            <span aria-hidden>·</span>
            <span dir="ltr">{formatAmount(String(total), locale)}</span>
            {paid > 0 && (
              <>
                <span aria-hidden>·</span>
                <span dir="ltr">
                  {t('outstanding.paid')}: {formatAmount(String(paid), locale)}
                </span>
              </>
            )}
            {remaining > 0 && (
              <>
                <span aria-hidden>·</span>
                <span dir="ltr" className="font-medium text-amber-600 dark:text-amber-400">
                  {t('outstanding.remaining')}: {formatAmount(String(remaining), locale)}
                </span>
              </>
            )}
            {isOverdue(invoice) && (
              <>
                <span aria-hidden>·</span>
                <span className="font-medium text-destructive">
                  {tInvoice('overdue')}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="shrink-0">
          <button
            onClick={onAction}
            disabled={isActive}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <CreditCard className="h-3 w-3" />
            {getActionLabel()}
          </button>
        </div>
      </div>

      {isActive && (
        <div className="border-t border-border">
          <IssueAndPayDialog
            invoice={invoice}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </div>
      )}
    </div>
  );
}

interface GroupProps {
  title: string;
  invoices: Invoice[];
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  onSuccess: () => void;
}

function InvoiceGroup({ title, invoices, activeId, setActiveId, onSuccess }: GroupProps) {
  if (invoices.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="border-b border-border bg-muted/40 px-4 py-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      </div>
      {invoices.map((inv) => (
        <InvoiceRow
          key={inv.id}
          invoice={inv}
          isActive={activeId === inv.id}
          onAction={() => setActiveId(inv.id)}
          onSuccess={() => { setActiveId(null); onSuccess(); }}
          onCancel={() => setActiveId(null)}
        />
      ))}
    </div>
  );
}

function UnbilledRow({ appointment }: { appointment: Appointment }) {
  const t = useTranslations('cashier');

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              {appointment.patient?.firstName ?? ''} {appointment.patient?.lastName ?? ''}
            </span>
            <span className="text-xs text-muted-foreground" dir="ltr">
              {appointment.patient?.mrn ?? ''}
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {'Dr. '}{appointment.doctor?.user?.firstName ?? ''}{' '}{appointment.doctor?.user?.lastName ?? ''}
            {' · '}
            <span dir="ltr">{formatDateTimeDisplay(appointment.scheduledAt)}</span>
          </div>
        </div>
        <div className="shrink-0">
          <Link
            href={`/dashboard/invoices/new?appointmentId=${appointment.id}&patientId=${appointment.patientId}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Receipt className="h-3 w-3" />
            {t('unbilled.createInvoice')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function CashierView() {
  const t = useTranslations('cashier');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);
  const canSeeBillingReport = BILLING_REPORT_ROLES.has(user?.role ?? '');

  const [tab, setTab] = useState<'today' | 'outstanding' | 'unbilled'>('today');
  const [activeId, setActiveId] = useState<string | null>(null);
  const { from, to, dateStr } = useMemo(() => getTodayRange(), []);

  // Today data — always enabled
  const { data, isLoading, isError, error, refetch } = useInvoices({ from, to, limit: 50 });
  const { data: billingReport } = useBillingReport({ from, to }, canSeeBillingReport);

  // Outstanding data — two queries, enabled when tab is 'outstanding'
  const outstandingEnabled = tab === 'outstanding';
  const issuedQuery = useInvoices({ status: 'ISSUED', limit: 100 }, { enabled: outstandingEnabled });
  const partialQuery = useInvoices({ status: 'PARTIALLY_PAID', limit: 100 }, { enabled: outstandingEnabled });

  const outstandingInvoices = useMemo(() => {
    const issued = issuedQuery.data?.data ?? [];
    const partial = partialQuery.data?.data ?? [];
    return [...issued, ...partial].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [issuedQuery.data, partialQuery.data]);

  // Unbilled data — enabled when tab is 'unbilled'
  const unbilledEnabled = tab === 'unbilled';
  const todayApptsQuery = useAppointments(
    { date: dateStr, status: ['COMPLETED', 'IN_PROGRESS'], limit: 100 },
    { enabled: unbilledEnabled },
  );
  const todayInvoicesUnbilledQuery = useInvoices({ from, to, limit: 100 }, { enabled: unbilledEnabled });

  const unbilledAppointments = useMemo(() => {
    const appts = todayApptsQuery.data?.data ?? [];
    const invs = todayInvoicesUnbilledQuery.data?.data ?? [];
    const billedIds = new Set(
      invs
        .filter((inv) => inv.status !== 'CANCELLED' && inv.appointmentId)
        .map((inv) => inv.appointmentId!),
    );
    return appts.filter(
      (appt) => !billedIds.has(appt.id) && appt.patient != null && appt.doctor?.user != null,
    );
  }, [todayApptsQuery.data, todayInvoicesUnbilledQuery.data]);

  function switchTab(next: 'today' | 'outstanding' | 'unbilled') {
    setTab(next);
    setActiveId(null);
  }

  const tabToggle = (
    <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-0.5">
      <button
        onClick={() => switchTab('today')}
        className={cn(
          'flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
          tab === 'today'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {t('tabs.today')}
      </button>
      <button
        onClick={() => switchTab('outstanding')}
        className={cn(
          'flex flex-1 items-center justify-center rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
          tab === 'outstanding'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {t('tabs.outstanding')}
        {outstandingInvoices.length > 0 && (
          <span className="ms-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
            {outstandingInvoices.length}
          </span>
        )}
      </button>
      <button
        onClick={() => switchTab('unbilled')}
        className={cn(
          'flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
          tab === 'unbilled'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {t('tabs.unbilled')}
      </button>
    </div>
  );

  // ── Outstanding tab ────────────────────────────────────────────────────────

  if (tab === 'outstanding') {
    const outLoading = issuedQuery.isLoading || partialQuery.isLoading;
    const outError = issuedQuery.isError || partialQuery.isError;

    if (outLoading) {
      return (
        <div className="space-y-4">
          {tabToggle}
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        </div>
      );
    }

    if (outError) {
      return (
        <div className="space-y-4">
          {tabToggle}
          <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
            <p className="text-sm font-medium text-destructive">{tCommon('states.error')}</p>
            <button
              onClick={() => { issuedQuery.refetch(); partialQuery.refetch(); }}
              className="h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
            >
              {tCommon('actions.tryAgain')}
            </button>
          </div>
        </div>
      );
    }

    if (outstandingInvoices.length === 0) {
      return (
        <div className="space-y-4">
          {tabToggle}
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <Receipt className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">{t('outstanding.empty')}</p>
            <p className="text-xs text-muted-foreground">{t('outstanding.emptyHint')}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {tabToggle}
        <p className="text-sm text-muted-foreground">{t('outstanding.description')}</p>
        <div className="overflow-hidden rounded-xl border border-border">
          {outstandingInvoices.map((inv) => (
            <OutstandingRow
              key={inv.id}
              invoice={inv}
              isActive={activeId === inv.id}
              onAction={() => setActiveId(inv.id)}
              onSuccess={() => setActiveId(null)}
              onCancel={() => setActiveId(null)}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Unbilled tab ──────────────────────────────────────────────────────────

  if (tab === 'unbilled') {
    const unbilledLoading = todayApptsQuery.isLoading || todayInvoicesUnbilledQuery.isLoading;
    const unbilledError = todayApptsQuery.isError || todayInvoicesUnbilledQuery.isError;

    if (unbilledLoading) {
      return (
        <div className="space-y-4">
          {tabToggle}
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        </div>
      );
    }

    if (unbilledError) {
      return (
        <div className="space-y-4">
          {tabToggle}
          <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
            <p className="text-sm font-medium text-destructive">{tCommon('states.error')}</p>
            <button
              onClick={() => { todayApptsQuery.refetch(); todayInvoicesUnbilledQuery.refetch(); }}
              className="h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
            >
              {tCommon('actions.tryAgain')}
            </button>
          </div>
        </div>
      );
    }

    if (unbilledAppointments.length === 0) {
      return (
        <div className="space-y-4">
          {tabToggle}
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500/50" />
            <p className="text-sm font-medium">{t('unbilled.empty')}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {tabToggle}
        <div className="overflow-hidden rounded-xl border border-border">
          {unbilledAppointments.map((appt) => (
            <UnbilledRow key={appt.id} appointment={appt} />
          ))}
        </div>
      </div>
    );
  }

  // ── Today tab ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        {tabToggle}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        {tabToggle}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
          <p className="text-sm font-medium text-destructive">
            {error instanceof Error ? error.message : tCommon('states.error')}
          </p>
          <button
            onClick={() => refetch()}
            className="h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
          >
            {tCommon('actions.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  const invoices = (data?.data ?? []).filter((inv) => inv.status !== 'CANCELLED');
  const pending = invoices.filter((inv) => inv.status === 'DRAFT' || inv.status === 'ISSUED');
  const partial = invoices.filter((inv) => inv.status === 'PARTIALLY_PAID');
  const collected = invoices.filter((inv) => inv.status === 'PAID');

  const pendingToday = [...pending, ...partial].reduce((sum, inv) => {
    const total = parseFloat(inv.totalAmount);
    const paid = parseFloat(inv.paidAmount);
    return sum + Math.max(0, total - paid);
  }, 0);

  if (invoices.length === 0) {
    return (
      <div className="space-y-4">
        {tabToggle}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Receipt className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">{t('noInvoices')}</p>
          <p className="text-xs text-muted-foreground">{t('noInvoicesHint')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tabToggle}

      {/* Today summary bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border bg-muted/40 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('todaySummary.title')}
        </p>
        {billingReport && (
          <span className="text-sm">
            <span className="text-muted-foreground">{t('todaySummary.collected')}:</span>{' '}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {formatAmount(String(billingReport.totalCollected), locale)}
            </span>
          </span>
        )}
        <span className="text-sm">
          <span className="text-muted-foreground">{t('todaySummary.pending')}:</span>{' '}
          <span className={`font-semibold ${pendingToday > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
            {formatAmount(String(pendingToday), locale)}
          </span>
        </span>
      </div>

      <InvoiceGroup
        title={t('groups.pending')}
        invoices={pending}
        activeId={activeId}
        setActiveId={setActiveId}
        onSuccess={() => refetch()}
      />
      <InvoiceGroup
        title={t('groups.partial')}
        invoices={partial}
        activeId={activeId}
        setActiveId={setActiveId}
        onSuccess={() => refetch()}
      />
      <InvoiceGroup
        title={t('groups.collected')}
        invoices={collected}
        activeId={activeId}
        setActiveId={setActiveId}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
