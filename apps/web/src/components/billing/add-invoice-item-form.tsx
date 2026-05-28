'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAddInvoiceItem } from '@/hooks/use-invoices';
import type { AddInvoiceItemDto } from '@/types/invoice';

interface AddInvoiceItemFormProps {
  invoiceId: string;
  onCancel: () => void;
}

interface FormState {
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  notes: string;
}

const INITIAL: FormState = {
  description: '',
  quantity: '1',
  unitPrice: '',
  discount: '0',
  notes: '',
};

export function AddInvoiceItemForm({ invoiceId, onCancel }: AddInvoiceItemFormProps) {
  const t = useTranslations('invoice.items.addForm');
  const tCommon = useTranslations('common');
  const [form, setForm] = useState<FormState>(INITIAL);
  const [validationError, setValidationError] = useState('');

  const { mutate, isPending, error: mutationError } = useAddInvoiceItem();

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setValidationError('');
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const description = form.description.trim();
    if (!description) {
      setValidationError(t('validation.descriptionRequired'));
      return;
    }

    const qty = parseInt(form.quantity, 10);
    if (isNaN(qty) || qty < 1) {
      setValidationError(t('validation.quantityMin'));
      return;
    }

    const price = parseFloat(form.unitPrice);
    if (isNaN(price) || price <= 0) {
      setValidationError(t('validation.unitPriceRequired'));
      return;
    }

    const discount = parseFloat(form.discount) || 0;

    const dto: AddInvoiceItemDto = {
      description,
      quantity: qty,
      unitPrice: price,
      ...(discount > 0 ? { discount } : {}),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    };

    mutate(
      { id: invoiceId, dto },
      {
        onSuccess: () => {
          setForm(INITIAL);
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
        <div className="space-y-1 lg:col-span-2">
          <label className="text-xs font-medium text-foreground">
            {t('description')} <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={form.description}
            onChange={set('description')}
            disabled={isPending}
            placeholder={t('descriptionPlaceholder')}
            className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">
            {t('quantity')}
          </label>
          <input
            type="number"
            min={1}
            step={1}
            value={form.quantity}
            onChange={set('quantity')}
            disabled={isPending}
            className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">
            {t('unitPrice')} <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            min={0}
            step="any"
            value={form.unitPrice}
            onChange={set('unitPrice')}
            disabled={isPending}
            placeholder="0"
            className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">
            {t('discount')}
          </label>
          <input
            type="number"
            min={0}
            step="any"
            value={form.discount}
            onChange={set('discount')}
            disabled={isPending}
            className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
        </div>

        <div className="space-y-1 sm:col-span-2 lg:col-span-3">
          <label className="text-xs font-medium text-foreground">
            {t('notes')}
          </label>
          <input
            type="text"
            value={form.notes}
            onChange={set('notes')}
            disabled={isPending}
            placeholder={t('notesPlaceholder')}
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
