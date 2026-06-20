'use client';

import { useTranslations } from 'next-intl';
import { AttendanceTable } from '@/components/hr/attendance-table';

export default function HrAttendancePage() {
  const t = useTranslations('hr.attendance');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <AttendanceTable />
    </div>
  );
}
