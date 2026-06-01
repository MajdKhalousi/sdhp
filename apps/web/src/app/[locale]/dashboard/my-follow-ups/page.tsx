'use client';

import { useTranslations } from 'next-intl';
import { DoctorFollowUpList } from '@/components/follow-ups/doctor-follow-up-list';

export default function MyFollowUpsPage() {
  const t = useTranslations('followups');

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
