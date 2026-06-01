'use client';

import { useTranslations } from 'next-intl';
import { useBillingPolicy, useUpdateBillingPolicy } from '@/hooks/use-billing-policy';
import { BillingPolicyForm } from '@/components/settings/billing-policy-form';
import { Skeleton } from '@/components/ui/skeleton';

export default function BillingSettingsPage() {
  const t = useTranslations('settings.billing');
  const { data: policy, isLoading, isError } = useBillingPolicy();
  const update = useUpdateBillingPolicy();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="mb-1 h-6 w-48 rounded" />
          <Skeleton className="h-4 w-80 rounded" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (isError || !policy) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
        <p className="text-sm text-destructive">{t('error.loadFailed')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <BillingPolicyForm policy={policy} update={update} />
    </div>
  );
}
