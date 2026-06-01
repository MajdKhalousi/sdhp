'use client';

import { useTranslations } from 'next-intl';
import { FollowUpList } from '@/components/follow-ups/follow-up-list';

export default function FollowUpsPage() {
  const t = useTranslations('followups');

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
