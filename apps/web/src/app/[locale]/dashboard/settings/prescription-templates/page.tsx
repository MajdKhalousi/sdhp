'use client';

import { useTranslations } from 'next-intl';
import { PrescriptionTemplatesTable } from '@/components/settings/prescription-templates-table';

export default function PrescriptionTemplatesPage() {
  const t = useTranslations('settings.prescriptionTemplates');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <PrescriptionTemplatesTable />
    </div>
  );
}
