'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useIssueInvoice, useRecordPayment } from '@/hooks/use-invoices';
import type { Invoice, PaymentMethod } from '@/types/invoice';

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'BANK_TRANSFER', 'INSURANCE', 'OTHER'];

interface FormState {
  amount: string;
  method: PaymentMethod | '';
  referenceNumber: string;
  paidAt: string;
}

interface Props {
  invoice: Invoice;
  onSuccess: () => void;
  onCancel: () => void;
}

export function IssueAndPayDialog({ invoice, onSuccess, onCancel }: Props) {
  const t = useTranslations('cashier.issueAndPayDialog');
  const tPayment = useTranslations('invoice.payment');
  const tPayments = useTranslations('invoice.payments');
  const tDetail = useTranslations('invoice.detail');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const remaining = Math.max(0, parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount));

  const [form, setForm] = useState<FormState>({
    amount: remaining > 0 ? String(remaining) : '',
    method: '',
    referenceNumber: '',
    paidAt: '',
  });
  const [validationError, setValidationError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { mutateAsync: issueInvoice } = useIssueInvoice();
  const { mutateAsync: recordPayment } = useRecordPayment();

  function formatAmt(n: number): string {
    return (
      new Intl.NumberFormat(locale === 'ar' ? 'ar-SY' : 'en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(n) + ' SYP'
    );
  }

  function setField(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setValidationError('');
      setSubmitError('');
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');

    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount)) {
      setValidationError(tPayment('validation.amountRequired'));
      return;
    }
    if (amount <= 0) {
      setValidationError(tPayment('validation.amountMin'));
      return;
    }
    if (remaining > 0 && amount > remaining + 0.001) {
      setValidationError(tPayment('validation.amountExceedsRemaining'));
      return;
    }
    if (!form.method) {
      setValidationError(tPayment('validation.methodRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      const isDraft = invoice.status === 'DRAFT';

      if (isDraft) {
        try {
          await issueInvoice(invoice.id);
        } catch {
          setSubmitError(t('issueError'));
          return;
        }
      }

      try {
        await recordPayment({
          id: invoice.id,
          dto: {
            amount,
            method: form.method as PaymentMethod,
            ...(form.referenceNumber.trim() ? { referenceNumber: form.referenceNumber.trim() } : {}),
            ...(form.paidAt ? { paidAt: new Date(form.paidAt).toISOString() } : {}),
          },
        });
        onSuccess();
      } catch (err) {
        setSubmitError(
          isDraft
            ? t('paymentError')
            : (err instanceof Error ? err.message : tCommon('states.error')),
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const displayError = validationError || submitError;

  return (
    <div className="bg-muted/20 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{t('title')}</p>
          {invoice.status === 'DRAFT' && (
            <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">{t('issuingNote')}</p>
          )}
        </div>
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-accent disabled:opacity-50"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Invoice summary */}
      <div className="mb-3 flex flex-wrap gap-4 rounded-lg bg-background px-3 py-2 text-xs">
        <div>
          <span className="text-muted-foreground">{tDetail('fields.invoiceNumber')} </span>
          <span className="font-medium" dir="ltr">{invoice.invoiceNumber}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{tDetail('fields.total')} </span>
          <span dir="ltr">{formatAmt(parseFloat(invoice.totalAmount))}</span>
        </div>
        {parseFloat(invoice.paidAmount) > 0 && (
          <div>
            <span className="text-muted-foreground">{tDetail('fields.paid')} </span>
            <span dir="ltr">{formatAmt(parseFloat(invoice.paidAmount))}</span>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">{tDetail('fields.remaining')} </span>
          <span className="font-semibold" dir="ltr">{formatAmt(remaining)}</span>
        </div>
      </div>

      {displayError && (
        <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {displayError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs font-medium">
              {tPayment('fields.amount')} <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              min={0.01}
              step="any"
              value={form.amount}
              onChange={setField('amount')}
              disabled={isSubmitting}
              className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              dir="ltr"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">
              {tPayment('fields.method')} <span className="text-destructive">*</span>
            </label>
            <select
              value={form.method}
              onChange={setField('method')}
              disabled={isSubmitting}
              className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            >
              <option value="">{tPayment('fields.selectMethod')}</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {tPayments(`method.${m}` as Parameters<typeof tPayments>[0])}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">{tPayment('fields.referenceNumber')}</label>
            <input
              type="text"
              value={form.referenceNumber}
              onChange={setField('referenceNumber')}
              disabled={isSubmitting}
              className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              dir="ltr"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">{tPayment('fields.paidAt')}</label>
            <input
              type="date"
              value={form.paidAt}
              onChange={setField('paidAt')}
              disabled={isSubmitting}
              className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              dir="ltr"
            />
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? t('submitting') : t('submitButton')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-8 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
          >
            {tCommon('actions.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
