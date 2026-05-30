'use client';

import { useTranslations } from 'next-intl';
import {
  useClinicSettings,
  useUpsertClinicSettings,
  useUpsertWorkingDays,
} from '@/hooks/use-clinic-settings';
import { ClinicSettingsForm } from '@/components/settings/clinic-settings-form';
import { WorkingDaysGrid } from '@/components/settings/working-days-grid';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClinicSettingsPage() {
  const t = useTranslations('settings.clinic');
  const { data: settings, isLoading, isError } = useClinicSettings();
  const upsertSettings  = useUpsertClinicSettings();
  const upsertWorkingDays = useUpsertWorkingDays();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="mb-1 h-6 w-48 rounded" />
          <Skeleton className="h-4 w-80 rounded" />
        </div>
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (isError) {
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

      <ClinicSettingsForm
        settings={settings ?? null}
        upsert={upsertSettings}
      />

      <WorkingDaysGrid
        workingDays={settings?.workingDays ?? []}
        upsert={upsertWorkingDays}
      />
    </div>
  );
}
