'use client';

import { useTranslations } from 'next-intl';
import { DepartmentsTable } from '@/components/settings/departments-table';

export default function DepartmentsPage() {
  const t = useTranslations('settings.departments');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <DepartmentsTable />
    </div>
  );
}
