import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { WalkInWizard } from '@/components/queue/walk-in-wizard';
import { RoleGuard } from '@/components/layout/role-guard';
import { QUEUE_CREATE_ROLES } from '@/lib/permissions';

interface Props {
  searchParams: Promise<{ patientId?: string }>;
}

export default async function WalkInPage({ searchParams }: Props) {
  const { patientId } = await searchParams;
  const t = await getTranslations('queue.walkIn');

  return (
    <RoleGuard allowedRoles={QUEUE_CREATE_ROLES}>
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/queue"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent"
            aria-label={t('actions.backToQueue')}
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold">{t('pageTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('pageSubtitle')}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <WalkInWizard initialPatientId={patientId} />
        </div>
      </div>
    </RoleGuard>
  );
}
