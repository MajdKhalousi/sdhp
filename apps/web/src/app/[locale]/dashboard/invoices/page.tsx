'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth';
import { InvoiceList } from '@/components/billing/invoice-list';
import { BILLING_ACCESS_ROLES } from '@/lib/permissions';

export default function InvoicesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const t = useTranslations('invoice.list');

  useEffect(() => {
    if (user && !BILLING_ACCESS_ROLES.has(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (!user || !BILLING_ACCESS_ROLES.has(user.role)) return null;

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
