'use client';

import { useTranslations } from 'next-intl';
import { LeaveRequestsTable } from '@/components/hr/leave-requests-table';

export default function HrLeavePage() {
  const t = useTranslations('hr.leave');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <LeaveRequestsTable />
    </div>
  );
}
