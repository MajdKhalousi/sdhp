'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth';
import { DoctorsList } from '@/components/doctors/doctors-list';
import { DOCTORS_PAGE_ROLES } from '@/lib/permissions';

export default function DoctorsPage() {
  const t      = useTranslations('doctors.list');
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && !DOCTORS_PAGE_ROLES.has(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (!user || !DOCTORS_PAGE_ROLES.has(user.role)) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <DoctorsList />
    </div>
  );
}
