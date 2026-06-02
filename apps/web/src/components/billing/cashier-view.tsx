'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, Receipt } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useInvoices, useBillingReport } from '@/hooks/use-invoices';
import { useAuthStore } from '@/store/auth';
import { InvoiceStatusBadge } from '@/components/billing/invoice-status-badge';
import { IssueAndPayDialog } from '@/components/billing/issue-and-pay-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import type { Invoice } from '@/types/invoice';

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
            <span dir="ltr">{invoice.invoiceNumber}</span>
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
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t('actions.paid')}
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

export function CashierView() {
  const t = useTranslations('cashier');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);
  const canSeeBillingReport = BILLING_REPORT_ROLES.has(user?.role ?? '');
  const [activeId, setActiveId] = useState<string | null>(null);
  const { from, to } = useMemo(() => getTodayRange(), []);

  const { data, isLoading, isError, error, refetch } = useInvoices({ from, to, limit: 50 });
  const { data: billingReport } = useBillingReport({ from, to }, canSeeBillingReport);

  const invoices = (data?.data ?? []).filter((inv) => inv.status !== 'CANCELLED');
  const pending = invoices.filter((inv) => (inv.status === 'DRAFT' && parseFloat(inv.totalAmount) > 0) || inv.status === 'ISSUED');
  const partial = invoices.filter((inv) => inv.status === 'PARTIALLY_PAID');
  const collected = invoices.filter((inv) => inv.status === 'PAID');

  const pendingToday = [...pending, ...partial].reduce((sum, inv) => {
    const total = parseFloat(inv.totalAmount);
    const paid = parseFloat(inv.paidAmount);
    return sum + Math.max(0, total - paid);
  }, 0);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  if (isError) {
    return (
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
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <Receipt className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium">{t('noInvoices')}</p>
        <p className="text-xs text-muted-foreground">{t('noInvoicesHint')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
