'use client';

import { useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useInvoice } from '@/hooks/use-invoices';
import { formatAmount } from '@/lib/format-currency';
import { isOverdue } from '@/lib/billing-utils';

interface Props {
  params: { id: string };
}

function fmtAmt(str: string, locale: string): string {
  const n = parseFloat(str);
  return isNaN(n) ? '— SYP' : formatAmount(n, locale);
}

export default function InvoicePrintPage({ params }: Props) {
  const t = useTranslations('invoice');
  const tPrint = useTranslations('invoice.print');
  const locale = useLocale();
  const displayLocale = locale === 'ar' ? 'ar-u-nu-latn' : 'en-GB';

  const { data: invoice, isLoading, isError } = useInvoice(params.id);

  useEffect(() => {
    if (!isLoading && !isError && invoice) window.print();
  }, [invoice, isLoading, isError]);

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(displayLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  const printTimestamp = new Intl.DateTimeFormat(displayLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{tPrint('loading')}</p>
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive">{tPrint('error')}</p>
      </div>
    );
  }

  const isPaid = invoice.status === 'PAID';
  const docTitle = isPaid ? tPrint('receipt') : tPrint('invoice');

  const totalNum = parseFloat(invoice.totalAmount);
  const paidNum = parseFloat(invoice.paidAmount);
  const balanceNum = isNaN(totalNum) || isNaN(paidNum) ? null : Math.max(0, totalNum - paidNum);

  const discountNum = parseFloat(invoice.discountAmount);
  const hasDiscount = !isNaN(discountNum) && discountNum > 0;

  const showDiscountCol = invoice.items.some((item) => parseFloat(item.discount) > 0);
  const colCount = showDiscountCol ? 5 : 4;

  const issueOrCreateDate = invoice.issuedAt ?? invoice.createdAt;

  return (
    <div className="mx-auto max-w-[720px] px-6 py-8">
      {/* Controls — screen only */}
      <div className="print:hidden mb-6 flex items-center gap-3 border-b pb-4">
        <button
          onClick={() => window.close()}
          className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
        >
          {tPrint('actions.back')}
        </button>
        <div className="flex-1" />
        <button
          onClick={() => window.print()}
          className="inline-flex items-center rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {tPrint('actions.print')}
        </button>
      </div>

      <div className="space-y-6">
        {/* Document header */}
        <div className="border-b pb-4 text-center">
          <h1 className="text-2xl font-bold">{docTitle}</h1>
          <p className="mt-1 font-mono text-sm font-medium" dir="ltr">
            {invoice.invoiceNumber}
          </p>
          <p className="mt-1">
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">
              {t(`status.${invoice.status}` as Parameters<typeof t>[0])}
            </span>
          </p>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">
              {invoice.issuedAt ? t('detail.fields.issuedAt') : t('detail.fields.date')}
            </p>
            <p dir="ltr">{formatDate(issueOrCreateDate)}</p>
          </div>
          {invoice.dueDate && (
            <div>
              <p className="text-xs text-muted-foreground">{t('detail.fields.dueDate')}</p>
              <p dir="ltr" className={isOverdue(invoice) ? 'font-medium text-destructive' : ''}>
                {formatDate(invoice.dueDate)}
                {isOverdue(invoice) && (
                  <span className="ms-2 text-xs">({t('overdue')})</span>
                )}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">{tPrint('printDate')}</p>
            <p dir="ltr">{printTimestamp}</p>
          </div>
        </div>

        {/* Patient */}
        <section className="break-inside-avoid rounded-md border p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('detail.fields.patient')}
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div className="col-span-2 font-semibold">
              {invoice.patient.firstName} {invoice.patient.lastName}
            </div>
            <div>
              <span className="text-muted-foreground">{t('detail.fields.mrn')}: </span>
              <span className="font-mono" dir="ltr">{invoice.patient.mrn}</span>
            </div>
          </div>
        </section>

        {/* Line items */}
        <section className="break-inside-avoid">
          <h2 className="mb-2 text-sm font-semibold">{t('items.title')}</h2>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">{t('items.columns.description')}</th>
                  <th className="w-16 px-3 py-2 text-center font-medium">{t('items.columns.quantity')}</th>
                  <th className="px-3 py-2 text-end font-medium">{t('items.columns.unitPrice')}</th>
                  {showDiscountCol && (
                    <th className="px-3 py-2 text-end font-medium">{t('items.columns.discount')}</th>
                  )}
                  <th className="px-3 py-2 text-end font-medium">{t('items.columns.total')}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.length === 0 && (
                  <tr>
                    <td colSpan={colCount} className="px-3 py-6 text-center text-muted-foreground">
                      {t('items.empty')}
                    </td>
                  </tr>
                )}
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-3 py-2.5" dir="auto">
                      <div>{item.description}</div>
                      {item.notes && (
                        <div className="text-xs text-muted-foreground">{item.notes}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums" dir="ltr">
                      {item.quantity}
                    </td>
                    <td className="px-3 py-2.5 text-end tabular-nums" dir="ltr">
                      {fmtAmt(item.unitPrice, locale)}
                    </td>
                    {showDiscountCol && (
                      <td className="px-3 py-2.5 text-end tabular-nums" dir="ltr">
                        {parseFloat(item.discount) > 0 ? fmtAmt(item.discount, locale) : '—'}
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-end font-medium tabular-nums" dir="ltr">
                      {fmtAmt(item.totalPrice, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Totals */}
        <section className="break-inside-avoid flex justify-end">
          <div className="w-full max-w-xs space-y-1.5 rounded-md border p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{t('detail.fields.subtotal')}</span>
              <span className="tabular-nums" dir="ltr">{fmtAmt(invoice.subtotal, locale)}</span>
            </div>
            {hasDiscount && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">{t('detail.fields.discount')}</span>
                <span className="tabular-nums" dir="ltr">− {fmtAmt(invoice.discountAmount, locale)}</span>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t pt-1.5 font-semibold">
              <span>{t('detail.fields.total')}</span>
              <span className="tabular-nums" dir="ltr">{fmtAmt(invoice.totalAmount, locale)}</span>
            </div>
            <div className="flex justify-between gap-4 text-green-700 dark:text-green-400">
              <span>{t('detail.fields.paid')}</span>
              <span className="tabular-nums" dir="ltr">{fmtAmt(invoice.paidAmount, locale)}</span>
            </div>
            {balanceNum !== null && (
              <div
                className={`flex justify-between gap-4 border-t pt-1.5 font-semibold ${
                  balanceNum > 0 ? 'text-destructive' : 'text-green-700 dark:text-green-400'
                }`}
              >
                <span>{tPrint('balanceDue')}</span>
                <span className="tabular-nums" dir="ltr">
                  {formatAmount(balanceNum, locale)}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Notes */}
        {invoice.notes && (
          <section className="break-inside-avoid space-y-1">
            <h2 className="text-sm font-semibold">{t('detail.fields.notes')}</h2>
            <p className="text-sm" dir="auto">{invoice.notes}</p>
          </section>
        )}

        {/* Payment history */}
        <section className="break-inside-avoid">
          <h2 className="mb-2 text-sm font-semibold">{tPrint('paymentHistory')}</h2>
          {invoice.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tPrint('noPayments')}</p>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-start font-medium">{t('payments.columns.date')}</th>
                    <th className="px-3 py-2 text-start font-medium">{t('payments.columns.method')}</th>
                    <th className="px-3 py-2 text-end font-medium">{t('payments.columns.amount')}</th>
                    <th className="px-3 py-2 text-start font-medium">{t('payments.columns.reference')}</th>
                    <th className="px-3 py-2 text-start font-medium">{t('payments.columns.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((payment) => {
                    const isVoided = payment.voidedAt !== null;
                    return (
                      <tr key={payment.id} className={`border-t ${isVoided ? 'opacity-60' : ''}`}>
                        <td className="whitespace-nowrap px-3 py-2" dir="ltr">
                          {formatDate(payment.paidAt)}
                        </td>
                        <td className="px-3 py-2">
                          {t(`payments.method.${payment.method}` as Parameters<typeof t>[0])}
                        </td>
                        <td className="px-3 py-2 text-end tabular-nums" dir="ltr">
                          <span className={isVoided ? 'text-muted-foreground line-through' : ''}>
                            {fmtAmt(payment.amount, locale)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground" dir="ltr">
                          {payment.referenceNumber ?? '—'}
                        </td>
                        <td className="px-3 py-2">
                          {isVoided ? (
                            <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                              {t('payments.voided')}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Footer */}
        <div className="border-t pt-4 text-center text-xs text-muted-foreground">
          <p>{tPrint('generatedBy')}</p>
          <p className="mt-0.5" dir="ltr">{printTimestamp}</p>
        </div>
      </div>
    </div>
  );
}
