'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRemoveInvoiceItem } from '@/hooks/use-invoices';
import { AddInvoiceItemForm } from './add-invoice-item-form';
import type { Invoice } from '@/types/invoice';

function formatAmount(value: string, locale: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '— SYP';
  return (
    new Intl.NumberFormat(locale === 'ar' ? 'ar-SY' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num) + ' SYP'
  );
}

interface InvoiceItemsTableProps {
  invoice: Invoice;
}

function RemoveItemButton({ invoiceId, itemId }: { invoiceId: string; itemId: string }) {
  const t = useTranslations('invoice.items');
  const tCommon = useTranslations('common');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const { mutate, isPending } = useRemoveInvoiceItem();

  function handleConfirm() {
    setError('');
    mutate(
      { invoiceId, itemId },
      {
        onSuccess: () => setConfirming(false),
        onError: (e) => {
          setConfirming(false);
          setError(e instanceof Error ? e.message : 'Failed to remove item');
        },
      },
    );
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="h-6 rounded bg-destructive px-2 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-60"
        >
          {isPending ? t('removing') : t('remove')}
        </button>
        <button
          onClick={() => { setConfirming(false); setError(''); }}
          disabled={isPending}
          className="h-6 rounded border px-2 text-xs transition-colors hover:bg-accent disabled:opacity-60"
        >
          {tCommon('actions.cancel')}
        </button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex h-6 w-6 items-center justify-center rounded border border-destructive/30 text-destructive transition-colors hover:bg-destructive/10"
      title={t('remove')}
    >
      <Trash2 className="h-3 w-3" />
    </button>
  );
}

export function InvoiceItemsTable({ invoice }: InvoiceItemsTableProps) {
  const t = useTranslations('invoice.items');
  const locale = useLocale();
  const [showAddForm, setShowAddForm] = useState(false);
  const isDraft = invoice.status === 'DRAFT';

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">{t('title')}</h3>
        {isDraft && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors hover:bg-accent"
          >
            <Plus className="h-3 w-3" />
            {t('addForm.submit')}
          </button>
        )}
      </div>

      {invoice.items.length === 0 && !showAddForm ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-start font-medium">{t('columns.description')}</th>
                <th className="px-4 py-2 text-end font-medium">{t('columns.quantity')}</th>
                <th className="px-4 py-2 text-end font-medium">{t('columns.unitPrice')}</th>
                <th className="px-4 py-2 text-end font-medium">{t('columns.discount')}</th>
                <th className="px-4 py-2 text-end font-medium">{t('columns.total')}</th>
                {isDraft && <th className="px-4 py-2 text-end font-medium">{t('columns.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="text-sm">{item.description}</p>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground">{item.notes}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-end text-sm tabular-nums" dir="ltr">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-end text-sm tabular-nums" dir="ltr">
                    {formatAmount(item.unitPrice, locale)}
                  </td>
                  <td className="px-4 py-3 text-end text-sm tabular-nums" dir="ltr">
                    {parseFloat(item.discount) > 0 ? formatAmount(item.discount, locale) : '—'}
                  </td>
                  <td className="px-4 py-3 text-end text-sm font-medium tabular-nums" dir="ltr">
                    {formatAmount(item.totalPrice, locale)}
                  </td>
                  {isDraft && (
                    <td className="px-4 py-3 text-end">
                      <RemoveItemButton invoiceId={invoice.id} itemId={item.id} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isDraft && showAddForm && (
        <AddInvoiceItemForm
          invoiceId={invoice.id}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}
