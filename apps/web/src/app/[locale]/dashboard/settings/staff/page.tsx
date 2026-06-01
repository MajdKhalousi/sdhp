'use client';

import { useTranslations } from 'next-intl';
import { StaffTable } from '@/components/settings/staff-table';

export default function StaffPage() {
  const t = useTranslations('settings.staff');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <StaffTable />
    </div>
  );
}
