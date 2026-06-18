'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store/auth';
import { PLATFORM_ACCESS_ROLES } from '@/lib/permissions';
import { PlatformUsersTable } from '@/components/platform/platform-users-table';

export default function PlatformUsersPage() {
  const t = useTranslations('platform.users');
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && !PLATFORM_ACCESS_ROLES.has(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const isSuperAdmin = !!user && PLATFORM_ACCESS_ROLES.has(user.role);
  if (!user || !isSuperAdmin) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <PlatformUsersTable />
    </div>
  );
}
