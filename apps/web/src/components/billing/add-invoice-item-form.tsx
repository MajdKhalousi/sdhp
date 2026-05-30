'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useAddInvoiceItem } from '@/hooks/use-invoices';
import { ServicePicker } from './service-picker';
import type { AddInvoiceItemDto } from '@/types/invoice';
import type { Service } from '@/types/clinic-settings';

interface AddInvoiceItemFormProps {
  invoiceId: string;
  onCancel: () => void;
}

type SourceMode = 'catalog' | 'manual';

interface CatalogState {
  serviceId: string;
  unitPrice: string;
  quantity: string;
  discount: string;
  notes: string;
}

interface ManualState {
  description: string;
  unitPrice: string;
  quantity: string;
  discount: string;
  notes: string;
}

const CATALOG_INITIAL: CatalogState = {
  serviceId: '',
  unitPrice: '',
  quantity: '1',
  discount: '0',
  notes: '',
};

const MANUAL_INITIAL: ManualState = {
  description: '',
  unitPrice: '',
  quantity: '1',
  discount: '0',
  notes: '',
};

export function AddInvoiceItemForm({ invoiceId, onCancel }: AddInvoiceItemFormProps) {
  const t       = useTranslations('invoice.items.addForm');
  const tCommon = useTranslations('common');

  const [mode, setMode]                       = useState<SourceMode>('catalog');
  const [catalog, setCatalog]                 = useState<CatalogState>(CATALOG_INITIAL);
  const [manual, setManual]                   = useState<ManualState>(MANUAL_INITIAL);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [validationError, setValidationError] = useState('');

  const { mutate, isPending, error: mutationError } = useAddInvoiceItem();

  function switchMode(next: SourceMode) {
    setMode(next);
    setValidationError('');
  }

  function handleServiceChange(id: string, svc: Service | null) {
    setSelectedService(svc);
    setCatalog((prev) => ({
      ...prev,
      serviceId: id,
      unitPrice: svc ? svc.defaultPrice : prev.unitPrice,
    }));
    setValidationError('');
  }

  function setCatalogField(field: keyof CatalogState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setCatalog((prev) => ({ ...prev, [field]: e.target.value }));
      setValidationError('');
    };
  }

  function setManualField(field: keyof ManualState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setManual((prev) => ({ ...prev, [field]: e.target.value }));
      setValidationError('');
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let dto: AddInvoiceItemDto;

    if (mode === 'catalog') {
      if (!catalog.serviceId) {
        setValidationError(t('validation.serviceRequired'));
        return;
      }

      const qty = parseInt(catalog.quantity, 10);
      if (isNaN(qty) || qty < 1) {
        setValidationError(t('validation.quantityMin'));
        return;
      }

      const price    = parseFloat(catalog.unitPrice);
      const discount = parseFloat(catalog.discount) || 0;

      dto = {
        serviceId: catalog.serviceId,
        quantity:  qty,
        ...(isNaN(price) ? {} : { unitPrice: price }),
        ...(discount > 0 ? { discount } : {}),
        ...(catalog.notes.trim() ? { notes: catalog.notes.trim() } : {}),
      };
    } else {
      const description = manual.description.trim();
      if (!description) {
        setValidationError(t('validation.descriptionRequired'));
        return;
      }

      const qty = parseInt(manual.quantity, 10);
      if (isNaN(qty) || qty < 1) {
        setValidationError(t('validation.quantityMin'));
        return;
      }

      const price = parseFloat(manual.unitPrice);
      if (isNaN(price) || price <= 0) {
        setValidationError(t('validation.unitPriceRequired'));
        return;
      }

      const discount = parseFloat(manual.discount) || 0;

      dto = {
        description,
        quantity:  qty,
        unitPrice: price,
        ...(discount > 0 ? { discount } : {}),
        ...(manual.notes.trim() ? { notes: manual.notes.trim() } : {}),
      };
    }

    mutate(
      { id: invoiceId, dto },
      {
        onSuccess: () => {
          setCatalog(CATALOG_INITIAL);
          setManual(MANUAL_INITIAL);
          setSelectedService(null);
          onCancel();
        },
      },
    );
  }

  const apiError    = mutationError instanceof Error ? mutationError.message : null;
  const displayError = validationError || apiError;

  return (
    <form onSubmit={handleSubmit} className="border-t border-border bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="text-sm font-medium">{t('title')}</p>

        {/* Source toggle */}
        <div className="flex overflow-hidden rounded-lg border">
          {(['catalog', 'manual'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={cn(
                'px-3 py-1 text-xs font-medium transition-colors',
                mode === m
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              {t(`sourceToggle.${m}`)}
            </button>
          ))}
        </div>
      </div>

      {displayError && (
        <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {displayError}
        </div>
      )}

      {mode === 'catalog' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Service */}
          <div className="lg:col-span-2">
            <ServicePicker
              value={catalog.serviceId}
              onChange={handleServiceChange}
              disabled={isPending}
            />
          </div>

          {/* Price override */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">{t('priceOverride')}</label>
            <input
              type="number"
              min={0}
              step="any"
              dir="ltr"
              value={catalog.unitPrice}
              onChange={setCatalogField('unitPrice')}
              disabled={isPending}
              placeholder={selectedService?.defaultPrice ?? '0'}
              className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>

          {/* Quantity */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">{t('quantity')}</label>
            <input
              type="number"
              min={1}
              step={1}
              dir="ltr"
              value={catalog.quantity}
              onChange={setCatalogField('quantity')}
              disabled={isPending}
              className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>

          {/* Discount */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">{t('discount')}</label>
            <input
              type="number"
              min={0}
              step="any"
              dir="ltr"
              value={catalog.discount}
              onChange={setCatalogField('discount')}
              disabled={isPending}
              className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-3">
            <label className="text-xs font-medium text-foreground">{t('notes')}</label>
            <input
              type="text"
              value={catalog.notes}
              onChange={setCatalogField('notes')}
              disabled={isPending}
              placeholder={t('notesPlaceholder')}
              className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Description */}
          <div className="space-y-1 lg:col-span-2">
            <label className="text-xs font-medium text-foreground">
              {t('description')} <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={manual.description}
              onChange={setManualField('description')}
              disabled={isPending}
              placeholder={t('descriptionPlaceholder')}
              className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>

          {/* Unit Price */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              {t('unitPrice')} <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              min={0}
              step="any"
              dir="ltr"
              value={manual.unitPrice}
              onChange={setManualField('unitPrice')}
              disabled={isPending}
              placeholder="0"
              className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>

          {/* Quantity */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">{t('quantity')}</label>
            <input
              type="number"
              min={1}
              step={1}
              dir="ltr"
              value={manual.quantity}
              onChange={setManualField('quantity')}
              disabled={isPending}
              className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>

          {/* Discount */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">{t('discount')}</label>
            <input
              type="number"
              min={0}
              step="any"
              dir="ltr"
              value={manual.discount}
              onChange={setManualField('discount')}
              disabled={isPending}
              className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-3">
            <label className="text-xs font-medium text-foreground">{t('notes')}</label>
            <input
              type="text"
              value={manual.notes}
              onChange={setManualField('notes')}
              disabled={isPending}
              placeholder={t('notesPlaceholder')}
              className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>
        </div>
      )}

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
