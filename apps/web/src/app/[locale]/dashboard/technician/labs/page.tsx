'use client';

import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth';
import { LabWorklistPanel } from '@/components/technician/lab-worklist-panel';

const TECHNICIAN_ACCESS_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'TECHNICIAN']);

export default function TechnicianLabsPage() {
  const t = useTranslations('technicianLabs');
  const tBilling = useTranslations('billingReports');
  const { user } = useAuthStore();
  const canView = user ? TECHNICIAN_ACCESS_ROLES.has(user.role) : false;

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-muted-foreground">{tBilling('forbidden')}</p>
      </div>
    );
  }

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
