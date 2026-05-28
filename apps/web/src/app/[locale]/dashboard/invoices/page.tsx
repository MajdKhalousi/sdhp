'use client';

import { useTranslations } from 'next-intl';
import { InvoiceList } from '@/components/billing/invoice-list';

export default function InvoicesPage() {
  const t = useTranslations('invoice.list');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <InvoiceList />
    </div>
  );
}
