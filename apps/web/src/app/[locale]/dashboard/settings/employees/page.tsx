'use client';

import { useTranslations } from 'next-intl';
import { EmployeeProfilesTable } from '@/components/settings/employee-profiles-table';

export default function EmployeesPage() {
  const t = useTranslations('settings.employees');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <EmployeeProfilesTable />
    </div>
  );
}
