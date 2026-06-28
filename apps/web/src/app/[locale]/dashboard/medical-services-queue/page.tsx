'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth';
import { MedicalServicesQueuePanel } from '@/components/medical-services-queue/medical-services-queue-panel';
import { MEDICAL_SERVICES_QUEUE_ACCESS_ROLES } from '@/lib/permissions';

export default function MedicalServicesQueuePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const t = useTranslations('medicalServicesQueue');

  useEffect(() => {
    if (user && !MEDICAL_SERVICES_QUEUE_ACCESS_ROLES.has(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (!user || !MEDICAL_SERVICES_QUEUE_ACCESS_ROLES.has(user.role)) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t('pageTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('pageSubtitle')}</p>
      </div>
      <MedicalServicesQueuePanel />
    </div>
  );
}
