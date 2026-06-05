'use client';

import { useState, Fragment } from 'react';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useInvoice, useIssueInvoice, useVoidPayment } from '@/hooks/use-invoices';
import { useAuthStore } from '@/store/auth';
import { InvoiceStatusBadge } from './invoice-status-badge';
import { InvoiceItemsTable } from './invoice-items-table';
import { CancelInvoiceDialog } from './cancel-invoice-dialog';
import { RecordPaymentForm } from './record-payment-form';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateDisplay } from '@/lib/format-date';
import { isOverdue } from '@/lib/billing-utils';
import type { Invoice } from '@/types/invoice';

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

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-2 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}

function AmountCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-primary/30 bg-primary/5' : 'bg-card'}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold tabular-nums ${highlight ? 'text-primary' : ''}`} dir="ltr">
        {value}
      </p>
    </div>
  );
}

function IssueButton({ invoice }: { invoice: Invoice }) {
  const t = useTranslations('invoice.actions');
  const tCommon = useTranslations('common');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const { mutate, isPending } = useIssueInvoice();

  const hasItems = invoice.items.length > 0;

  if (!hasItems) {
    return (
      <div className="flex flex-col gap-1">
        <button
          disabled
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground opacity-50 cursor-not-allowed"
        >
          {t('issue')}
        </button>
        <p className="text-xs text-muted-foreground">{t('issueDisabled')}</p>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground">{t('issueConfirm')}</p>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setError('');
              mutate(invoice.id, {
                onSuccess: () => setConfirming(false),
                onError: (e) => {
                  setConfirming(false);
                  setError(e instanceof Error ? e.message : t('issueFailed'));
                },
              });
            }}
            disabled={isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? t('issuing') : t('issue')}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={isPending}
            className="h-8 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
          >
            {tCommon('actions.cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
    >
      {t('issue')}
    </button>
  );
}

const BILLING_WRITE_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'ACCOUNTANT']);
const INVOICE_CREATE_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'ACCOUNTANT', 'SECRETARY']);

function PaymentsSection({ invoice }: { invoice: Invoice }) {
  const t = useTranslations('invoice.payments');
  const tPayment = useTranslations('invoice.payment');
  const locale = useLocale();
  const { user } = useAuthStore();
  const canVoid = BILLING_WRITE_ROLES.has(user?.role ?? '');
  const canRecord = INVOICE_CREATE_ROLES.has(user?.role ?? '');

  const [showForm, setShowForm] = useState(false);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidError, setVoidError] = useState('');

  const { mutate: voidPayment, isPending: isVoiding } = useVoidPayment();

  const isPayable = invoice.status === 'ISSUED' || invoice.status === 'PARTIALLY_PAID';
  const remaining = parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount);
  const colCount = canVoid ? 7 : 6;

  function openVoid(paymentId: string) {
    setVoidingId(paymentId);
    setVoidReason('');
    setVoidError('');
    setShowForm(false);
  }

  function cancelVoid() {
    setVoidingId(null);
    setVoidReason('');
    setVoidError('');
  }

  function handleVoid(invoiceId: string, paymentId: string) {
    if (!voidReason.trim()) {
      setVoidError(t('voidReasonRequired'));
      return;
    }
    setVoidError('');
    voidPayment(
      { invoiceId, paymentId, voidReason: voidReason.trim() },
      {
        onSuccess: () => {
          setVoidingId(null);
          setVoidReason('');
        },
        onError: (e) => {
          setVoidError(e instanceof Error ? e.message : t('voidError'));
        },
      },
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">{t('title')}</h3>
        {isPayable && canRecord && !showForm && (
          <button
            onClick={() => { setShowForm(true); cancelVoid(); }}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors hover:bg-accent"
          >
            <Plus className="h-3 w-3" />
            {tPayment('title')}
          </button>
        )}
      </div>

      {invoice.payments.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-start font-medium">{t('columns.amount')}</th>
                <th className="px-4 py-2 text-start font-medium">{t('columns.method')}</th>
                <th className="px-4 py-2 text-start font-medium">{t('columns.date')}</th>
                <th className="px-4 py-2 text-start font-medium">{t('columns.reference')}</th>
                <th className="px-4 py-2 text-start font-medium">{t('columns.receivedBy')}</th>
                <th className="px-4 py-2 text-start font-medium">{t('columns.status')}</th>
                {canVoid && (
                  <th className="px-4 py-2 text-start font-medium">{t('columns.actions')}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map((payment) => {
                const isVoided = payment.voidedAt !== null;
                const isExpanded = voidingId === payment.id;
                return (
                  <Fragment key={payment.id}>
                    <tr
                      className={`border-t border-border ${isVoided ? 'opacity-60' : ''}`}
                    >
                      <td className="px-4 py-3 text-sm font-medium tabular-nums" dir="ltr">
                        <span className={isVoided ? 'line-through text-muted-foreground' : ''}>
                          {formatAmount(payment.amount, locale)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {t(`method.${payment.method}` as Parameters<typeof t>[0])}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap" dir="ltr">
                        {formatDateDisplay(payment.paidAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground" dir="ltr">
                        {payment.referenceNumber ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {payment.receivedBy.firstName} {payment.receivedBy.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {isVoided ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex w-fit items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                              {t('voided')}
                            </span>
                            {payment.voidReason && (
                              <span className="text-xs text-muted-foreground">{payment.voidReason}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      {canVoid && (
                        <td className="px-4 py-3 text-sm">
                          {!isVoided && (
                            <button
                              onClick={() => isExpanded ? cancelVoid() : openVoid(payment.id)}
                              disabled={isVoiding}
                              className="inline-flex h-7 items-center rounded-md border border-destructive/40 px-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                            >
                              {t('voidAction')}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                    {isExpanded && (
                      <tr className="border-t border-border">
                        <td colSpan={colCount} className="px-4 pb-4 pt-3">
                          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                            <p className="text-xs font-semibold text-destructive">{t('voidConfirmTitle')}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{t('voidConfirmDescription')}</p>
                            {voidError && (
                              <p className="mt-2 text-xs text-destructive">{voidError}</p>
                            )}
                            <div className="mt-3 flex flex-wrap items-end gap-2">
                              <div className="min-w-[200px] flex-1 space-y-1">
                                <label className="text-xs font-medium">
                                  {t('voidReason')} <span className="text-destructive">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={voidReason}
                                  onChange={(e) => { setVoidReason(e.target.value); setVoidError(''); }}
                                  placeholder={t('voidReasonPlaceholder')}
                                  disabled={isVoiding}
                                  className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                                  autoFocus
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleVoid(payment.invoiceId, payment.id)}
                                  disabled={isVoiding}
                                  className="inline-flex h-8 items-center rounded-md bg-destructive px-3 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isVoiding ? t('voiding') : t('voidSubmit')}
                                </button>
                                <button
                                  onClick={cancelVoid}
                                  disabled={isVoiding}
                                  className="h-8 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
                                >
                                  {t('voidCancel')}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {invoice.payments.length === 0 && !showForm && (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t('empty')}</p>
      )}

      {isPayable && canRecord && showForm && (
        <RecordPaymentForm
          invoiceId={invoice.id}
          remaining={isNaN(remaining) ? 0 : remaining}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

interface InvoiceDetailProps {
  invoiceId: string;
}

export function InvoiceDetail({ invoiceId }: InvoiceDetailProps) {
  const t = useTranslations('invoice.detail');
  const tActions = useTranslations('invoice.actions');
  const tInvoice = useTranslations('invoice');
  const tPrint = useTranslations('invoice.print');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const { data: invoice, isLoading, isError, error, refetch } = useInvoice(invoiceId);
  const { user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-16 text-center">
        <p className="text-sm font-medium text-destructive">{t('error.loadFailed')}</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          {error instanceof Error ? error.message : t('error.loadFailed')}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-1 h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
        >
          {tCommon('actions.tryAgain')}
        </button>
      </div>
    );
  }

  if (!invoice) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">{t('notFound')}</p>
    );
  }

  const remaining = parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount);
  const remainingStr = isNaN(remaining) ? '—' : formatAmount(String(remaining), locale);
  const isDraft = invoice.status === 'DRAFT';
  const isCancellable = invoice.status === 'DRAFT' || invoice.status === 'ISSUED';
  const canCancel = BILLING_WRITE_ROLES.has(user?.role ?? '');
  const canCreate = INVOICE_CREATE_ROLES.has(user?.role ?? '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/invoices"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent"
            aria-label={t('back')}
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold" dir="ltr">{invoice.invoiceNumber}</h1>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              <Link
                href={`/dashboard/patients/${invoice.patientId}`}
                className="text-primary hover:underline"
              >
                {invoice.patient.firstName} {invoice.patient.lastName}
              </Link>
              <span className="mx-1.5 text-muted-foreground/40">·</span>
              <span dir="ltr">{invoice.patient.mrn}</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {invoice.appointmentId && (
            <Link
              href={`/dashboard/appointments/${invoice.appointmentId}`}
              className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              {tActions('openAppointment')}
            </Link>
          )}
          {isDraft && canCreate && <IssueButton invoice={invoice} />}
          {isCancellable && canCancel && <CancelInvoiceDialog invoiceId={invoice.id} />}
          <a
            href={`/${locale}/invoice/${invoice.id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            {tPrint('printInvoice')}
          </a>
        </div>
      </div>

      {/* Amount Summary */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <AmountCard label={t('fields.subtotal')} value={formatAmount(invoice.subtotal, locale)} />
        <AmountCard label={t('fields.discount')} value={formatAmount(invoice.discountAmount, locale)} />
        <AmountCard label={t('fields.total')} value={formatAmount(invoice.totalAmount, locale)} />
        <AmountCard label={t('fields.paid')} value={formatAmount(invoice.paidAmount, locale)} />
        <AmountCard
          label={t('fields.remaining')}
          value={remainingStr}
          highlight={remaining > 0 && invoice.status !== 'CANCELLED'}
        />
      </div>

      {/* Metadata */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('title')}
          </p>
          <InfoRow label={t('fields.date')}>{formatDateDisplay(invoice.issuedAt ?? invoice.createdAt)}</InfoRow>
          {invoice.dueDate && (
            <InfoRow label={t('fields.dueDate')}>
              <span dir="ltr" className={isOverdue(invoice) ? 'text-destructive' : ''}>
                {formatDateDisplay(invoice.dueDate)}
              </span>
              {isOverdue(invoice) && (
                <span className="ms-2 rounded-full bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
                  {tInvoice('overdue')}
                </span>
              )}
            </InfoRow>
          )}
          {invoice.issuedAt && (
            <InfoRow label={t('fields.issuedAt')}>
              <span dir="ltr">{formatDateDisplay(invoice.issuedAt)}</span>
            </InfoRow>
          )}
          {invoice.cancelledAt && (
            <InfoRow label={t('fields.cancelledAt')}>
              <span dir="ltr">{formatDateDisplay(invoice.cancelledAt)}</span>
            </InfoRow>
          )}
          <InfoRow label={t('fields.createdBy')}>
            {invoice.createdBy.firstName} {invoice.createdBy.lastName}
          </InfoRow>
        </div>

        {(invoice.notes || invoice.cancelReason) && (
          <div className="rounded-xl border bg-card px-4 py-3">
            {invoice.notes && (
              <div className="mb-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('fields.notes')}
                </p>
                <p className="text-sm text-foreground">{invoice.notes}</p>
              </div>
            )}
            {invoice.cancelReason && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('fields.cancelReason')}
                </p>
                <p className="text-sm text-foreground">{invoice.cancelReason}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Items */}
      <InvoiceItemsTable invoice={invoice} />

      {/* Payments */}
      <PaymentsSection invoice={invoice} />
    </div>
  );
}
