'use client';

import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth';
import { CashierView } from '@/components/billing/cashier-view';

const BILLING_ACCESS_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'ACCOUNTANT', 'SECRETARY']);

export default function CashierPage() {
  const t = useTranslations('cashier');
  const tBilling = useTranslations('billingReports');
  const { user } = useAuthStore();
  const canView = user ? BILLING_ACCESS_ROLES.has(user.role) : false;

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-muted-foreground">{tBilling('forbidden')}</p>
      </div>
    );
  }

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
