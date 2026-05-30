'use client';

import { useTranslations } from 'next-intl';
import { ServicesTable } from '@/components/settings/services-table';

export default function ServicesPage() {
  const t = useTranslations('settings.services');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <ServicesTable />
    </div>
  );
}
