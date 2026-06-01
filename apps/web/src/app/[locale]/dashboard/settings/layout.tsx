'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Tabs, type TabItem } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/auth';

const SETTINGS_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN']);

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('settings');
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && !SETTINGS_ROLES.has(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (!user || !SETTINGS_ROLES.has(user.role)) return null;

  const activeTab = pathname.startsWith('/dashboard/settings/visit-types')
    ? 'visit-types'
    : pathname.startsWith('/dashboard/settings/services')
    ? 'services'
    : pathname.startsWith('/dashboard/settings/billing')
    ? 'billing'
    : pathname.startsWith('/dashboard/settings/departments')
    ? 'departments'
    : pathname.startsWith('/dashboard/settings/staff')
    ? 'staff'
    : 'clinic';

  const TABS: TabItem[] = [
    { value: 'clinic',       label: t('tabs.clinic') },
    { value: 'visit-types',  label: t('tabs.visitTypes') },
    { value: 'services',     label: t('tabs.services') },
    { value: 'billing',      label: t('tabs.billing') },
    { value: 'departments',  label: t('tabs.departments') },
    { value: 'staff',        label: t('tabs.staff') },
  ];

  return (
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
  );
}
