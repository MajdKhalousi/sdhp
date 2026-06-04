'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth';
import { FollowUpList } from '@/components/follow-ups/follow-up-list';

const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'BRANCH_ADMIN', 'NURSE', 'SECRETARY']);

export default function FollowUpsPage() {
  const t = useTranslations('followups');
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.role === 'DOCTOR') {
      router.replace('/dashboard/my-follow-ups');
    }
  }, [user, router]);

  // Auth not initialized yet — no flash
  if (!user) return null;

  // Redirect in flight — render nothing while navigating
  if (user.role === 'DOCTOR') return null;

  // Roles with no access to this page
  if (!ALLOWED_ROLES.has(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-muted-foreground">{t('forbidden')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <FollowUpList />
    </div>
  );
}
