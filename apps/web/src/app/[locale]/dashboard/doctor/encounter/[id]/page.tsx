'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Printer } from 'lucide-react';
import { EncounterWorkspace } from '@/components/encounters/encounter-workspace';
import { useAuthStore } from '@/store/auth';
import { ENCOUNTER_DETAIL_ACCESS_ROLES } from '@/lib/permissions';

interface Props {
  params: { id: string };
}

export default function EncounterPage({ params }: Props) {
  const t = useTranslations('encounter');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const locale = useLocale();
  const { user } = useAuthStore();
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (user && !ENCOUNTER_DETAIL_ACCESS_ROLES.has(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (!user || !ENCOUNTER_DETAIL_ACCESS_ROLES.has(user.role)) return null;

  function handleBack() {
    if (isDirty && !window.confirm(t('actions.unsavedChangesConfirm'))) return;
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard/doctor/queue');
    }
  }

  function handlePrint() {
    window.open(`/${locale}/encounter/${params.id}/print`, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent"
          aria-label={tCommon('actions.back')}
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </button>
        <div>
          <h1 className="text-xl font-semibold">{t('page.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('page.subtitle')}</p>
        </div>
        <button
          onClick={handlePrint}
          className="ms-auto inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent"
          aria-label={tCommon('actions.print')}
          title={tCommon('actions.print')}
        >
          <Printer className="h-4 w-4" />
        </button>
      </div>

      <EncounterWorkspace encounterId={params.id} onDirtyChange={setIsDirty} />
    </div>
  );
}
