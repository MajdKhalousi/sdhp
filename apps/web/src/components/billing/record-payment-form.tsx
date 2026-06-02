'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRecordPayment } from '@/hooks/use-invoices';
import type { PaymentMethod } from '@/types/invoice';

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'BANK_TRANSFER', 'INSURANCE', 'OTHER'];

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

interface RecordPaymentFormProps {
  invoiceId: string;
  remaining: number;
  onCancel: () => void;
  onSuccess?: () => void;
}

interface FormState {
  amount: string;
  method: PaymentMethod | '';
  referenceNumber: string;
  paidAt: string;
  notes: string;
}

const INITIAL: FormState = {
  amount: '',
  method: '',
  referenceNumber: '',
  paidAt: '',
  notes: '',
};

export function RecordPaymentForm({ invoiceId, remaining, onCancel, onSuccess }: RecordPaymentFormProps) {
  const t = useTranslations('invoice.payment');
  const tPayments = useTranslations('invoice.payments');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const [form, setForm] = useState<FormState>(INITIAL);
  const [validationError, setValidationError] = useState('');

  const { mutate, isPending, error: mutationError } = useRecordPayment();

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setValidationError('');
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || !form.amount) {
      setValidationError(t('validation.amountRequired'));
      return;
    }
    if (amount <= 0) {
      setValidationError(t('validation.amountMin'));
      return;
    }
    if (remaining > 0 && amount > remaining) {
      setValidationError(t('validation.amountExceedsRemaining'));
      return;
    }
    if (!form.method) {
      setValidationError(t('validation.methodRequired'));
      return;
    }

    mutate(
      {
        id: invoiceId,
        dto: {
          amount,
          method: form.method as PaymentMethod,
          ...(form.referenceNumber.trim() ? { referenceNumber: form.referenceNumber.trim() } : {}),
          ...(form.paidAt ? { paidAt: new Date(form.paidAt).toISOString() } : {}),
          ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
        },
      },
      {
        onSuccess: () => {
          setForm(INITIAL);
          setValidationError('');
          onSuccess?.();
          onCancel();
        },
      },
    );
  }

  const apiError = mutationError instanceof Error ? mutationError.message : null;
  const displayError = validationError || apiError;

  return (
    <form onSubmit={handleSubmit} className="border-t border-border bg-muted/20 p-4">
      <p className="mb-3 text-sm font-medium">{t('title')}</p>

      {displayError && (
        <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {displayError}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Amount */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">
            {t('fields.amount')} <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            min={0.01}
            step="any"
            value={form.amount}
            onChange={set('amount')}
            disabled={isPending}
            placeholder="0"
            className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
            dir="ltr"
          />
          {remaining > 0 && (
            <p className="text-xs text-muted-foreground">
              {t('remainingHint', { amount: formatAmount(String(remaining), locale) })}
            </p>
          )}
        </div>

        {/* Method */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">
            {t('fields.method')} <span className="text-destructive">*</span>
          </label>
          <select
            value={form.method}
            onChange={set('method')}
            disabled={isPending}
            className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
          >
            <option value="">{t('fields.selectMethod')}</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {tPayments(`method.${method}` as Parameters<typeof tPayments>[0])}
              </option>
            ))}
          </select>
        </div>

        {/* Reference Number */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">
            {t('fields.referenceNumber')}
          </label>
          <input
            type="text"
            value={form.referenceNumber}
            onChange={set('referenceNumber')}
            disabled={isPending}
            placeholder={t('fields.referenceNumberPlaceholder')}
            className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
            dir="ltr"
          />
        </div>

        {/* Payment Date */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">
            {t('fields.paidAt')}
          </label>
          <input
            type="date"
            value={form.paidAt}
            onChange={set('paidAt')}
            disabled={isPending}
            className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
            dir="ltr"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1 sm:col-span-2 lg:col-span-4">
          <label className="text-xs font-medium text-foreground">
            {t('fields.notes')}
          </label>
          <input
            type="text"
            value={form.notes}
            onChange={set('notes')}
            disabled={isPending}
            placeholder={t('fields.notesPlaceholder')}
            className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? t('submitting') : t('submit')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="h-8 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
        >
          {tCommon('actions.cancel')}
        </button>
      </div>
    </form>
  );
}
