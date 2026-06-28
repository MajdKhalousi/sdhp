'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { usePatientInvoices } from '@/hooks/use-invoices';
import { useBillMedicalServiceRequest } from '@/hooks/use-medical-service-requests';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-messages';
import { useToast } from '@/hooks/use-toast';

interface Props {
  patientId: string;
  requestId: string;
  onClose: () => void;
}

export function BillMedicalServiceRequestDialog({ patientId, requestId, onClose }: Props) {
  const t = useTranslations('medicalServiceRequests.bill');
  const tRoot = useTranslations();

  const [invoiceId, setInvoiceId] = useState('');
  const [validationError, setValidationError] = useState('');

  const { data: invoices, isLoading: invoicesLoading } = usePatientInvoices(patientId);
  const draftInvoices = (invoices ?? []).filter((inv) => inv.status === 'DRAFT');

  const { toast } = useToast();
  const { mutate, isPending, error: mutationError } = useBillMedicalServiceRequest();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invoiceId) {
      setValidationError(t('validation.invoiceRequired'));
      return;
    }
    mutate(
      { id: requestId, patientId, payload: { invoiceId } },
      {
        onSuccess: () => {
          toast({ title: t('billSuccess'), variant: 'success' });
          onClose();
        },
      },
    );
  }

  const apiError = mutationError ? getFriendlyApiErrorMessage(mutationError, tRoot) : null;
  const displayError = validationError || apiError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-card shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bill-msr-title"
      >
        <div className="border-b border-border px-5 py-4">
          <h2 id="bill-msr-title" className="text-base font-semibold">
            {t('title')}
          </h2>
        </div>

        <div className="space-y-4 p-5">
          {displayError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {displayError}
            </div>
          )}

          {invoicesLoading ? (
            <p className="text-sm text-muted-foreground">{t('loadingInvoices')}</p>
          ) : draftInvoices.length === 0 ? (
            <div className="space-y-3 rounded-md border border-dashed py-6 text-center">
              <p className="text-sm text-muted-foreground">{t('noDraftInvoices')}</p>
              <Link
                href={`/dashboard/invoices/new?patientId=${patientId}`}
                className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent"
              >
                {t('createInvoiceLink')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="bill-invoice">
                  {t('invoiceLabel')} <span className="text-destructive">*</span>
                </label>
                <select
                  id="bill-invoice"
                  value={invoiceId}
                  onChange={(e) => { setInvoiceId(e.target.value); setValidationError(''); }}
                  disabled={isPending}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
                >
                  <option value="">{t('invoicePlaceholder')}</option>
                  {draftInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id} dir="ltr">
                      {inv.invoiceNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? t('submitting') : t('submit')}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  className="h-9 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
                >
                  {tRoot('common.actions.cancel')}
                </button>
              </div>
            </form>
          )}

          {draftInvoices.length === 0 && !invoicesLoading && (
            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent"
              >
                {tRoot('common.actions.cancel')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
