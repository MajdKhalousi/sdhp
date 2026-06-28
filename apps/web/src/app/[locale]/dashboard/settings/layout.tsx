'use client';

import { usePathname, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Tabs, type TabItem } from '@/components/ui/tabs';
import { RoleGuard } from '@/components/layout/role-guard';
import { SETTINGS_ACCESS_ROLES } from '@/lib/permissions';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('settings');
  const router = useRouter();
  const pathname = usePathname();

  const activeTab = pathname.startsWith('/dashboard/settings/visit-types')
    ? 'visit-types'
    : pathname.startsWith('/dashboard/settings/services')
    ? 'services'
    : pathname.startsWith('/dashboard/settings/billing')
    ? 'billing'
    : pathname.startsWith('/dashboard/settings/departments')
    ? 'departments'
    : 'clinic';

  const TABS: TabItem[] = [
    { value: 'clinic',       label: t('tabs.clinic') },
    { value: 'visit-types',  label: t('tabs.visitTypes') },
    { value: 'services',     label: t('tabs.services') },
    { value: 'billing',      label: t('tabs.billing') },
    { value: 'departments',  label: t('tabs.departments') },
  ];

  return (
    <RoleGuard allowedRoles={SETTINGS_ACCESS_ROLES}>
      <div className="space-y-6">
        <div className="overflow-x-auto">
          <Tabs
            tabs={TABS}
            value={activeTab}
            onChange={(v) => router.push(`/dashboard/settings/${v}`)}
            aria-label="Settings sections"
          />
        </div>
        <div>{children}</div>
      </div>
    </RoleGuard>
  );
}
