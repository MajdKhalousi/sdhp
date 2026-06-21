'use client';

import { usePathname, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Tabs, type TabItem } from '@/components/ui/tabs';
import { RoleGuard } from '@/components/layout/role-guard';
import { EMPLOYEES_ACCESS_ROLES } from '@/lib/permissions';

export default function HrLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('hr');
  const router = useRouter();
  const pathname = usePathname();

  const activeTab = pathname.startsWith('/dashboard/hr/employees')
    ? 'employees'
    : pathname.startsWith('/dashboard/hr/accounts')
    ? 'accounts'
    : pathname.startsWith('/dashboard/hr/attendance')
    ? 'attendance'
    : pathname.startsWith('/dashboard/hr/leave')
    ? 'leave'
    : pathname.startsWith('/dashboard/hr/payroll')
    ? 'payroll'
    : 'dashboard';

  const TABS: TabItem[] = [
    { value: 'dashboard', label: t('tabs.dashboard') },
    { value: 'employees', label: t('tabs.employees') },
    { value: 'accounts', label: t('tabs.accounts') },
    { value: 'attendance', label: t('tabs.attendance') },
    { value: 'leave', label: t('tabs.leave') },
    { value: 'payroll', label: t('tabs.payroll') },
  ];

  return (
    <RoleGuard allowedRoles={EMPLOYEES_ACCESS_ROLES}>
      <div className="space-y-6">
        <div className="overflow-x-auto">
          <Tabs
            tabs={TABS}
            value={activeTab}
            onChange={(v) => router.push(v === 'dashboard' ? '/dashboard/hr' : `/dashboard/hr/${v}`)}
            aria-label="HR sections"
          />
        </div>
        <div>{children}</div>
      </div>
    </RoleGuard>
  );
}
