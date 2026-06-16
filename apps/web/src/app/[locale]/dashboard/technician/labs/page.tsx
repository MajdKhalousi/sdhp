'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth';
import { LabWorklistPanel } from '@/components/technician/lab-worklist-panel';
import { TECHNICIAN_ACCESS_ROLES } from '@/lib/permissions';

export default function TechnicianLabsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const t = useTranslations('technicianLabs');

  useEffect(() => {
    if (user && !TECHNICIAN_ACCESS_ROLES.has(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (!user || !TECHNICIAN_ACCESS_ROLES.has(user.role)) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t('pageTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('pageSubtitle')}</p>
      </div>
      <LabWorklistPanel />
    </div>
  );
}
