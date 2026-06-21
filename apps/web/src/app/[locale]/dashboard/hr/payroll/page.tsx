'use client';

import { useTranslations } from 'next-intl';
import { PayrollRunsTable } from '@/components/hr/payroll-runs-table';

export default function HrPayrollPage() {
  const t = useTranslations('hr.payroll');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <PayrollRunsTable />
    </div>
  );
}
