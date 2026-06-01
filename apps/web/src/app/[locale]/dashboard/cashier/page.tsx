'use client';

import { useTranslations } from 'next-intl';
import { CashierView } from '@/components/billing/cashier-view';

export default function CashierPage() {
  const t = useTranslations('cashier');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <CashierView />
    </div>
  );
}
