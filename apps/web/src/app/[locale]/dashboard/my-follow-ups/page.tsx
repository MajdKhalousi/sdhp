'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth';
import { DoctorFollowUpList } from '@/components/follow-ups/doctor-follow-up-list';
import { MY_FOLLOW_UPS_ROLES } from '@/lib/permissions';

export default function MyFollowUpsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const t = useTranslations('followups');

  useEffect(() => {
    if (user && !MY_FOLLOW_UPS_ROLES.has(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (!user || !MY_FOLLOW_UPS_ROLES.has(user.role)) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t('doctorView.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('doctorView.subtitle')}</p>
      </div>

      <DoctorFollowUpList />
    </div>
  );
}
