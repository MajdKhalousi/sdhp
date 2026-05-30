'use client';

import { useTranslations } from 'next-intl';
import { VisitTypesTable } from '@/components/settings/visit-types-table';

export default function VisitTypesPage() {
  const t = useTranslations('settings.visitTypes');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <VisitTypesTable />
    </div>
  );
}
