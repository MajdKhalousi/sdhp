'use client';

import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CreateInvoiceForm } from '@/components/billing/create-invoice-form';

export default function NewInvoicePage() {
  const t = useTranslations('invoice.form');
  const tDetail = useTranslations('invoice.detail');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/invoices"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent"
          aria-label={tDetail('back')}
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <CreateInvoiceForm />
      </div>
    </div>
  );
}
