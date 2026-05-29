'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { UserPlus } from 'lucide-react';
import { QueueBoard } from '@/components/queue/queue-board';
import { useAuthStore } from '@/store/auth';

const QUEUE_CREATE_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'SECRETARY']);

export default function QueuePage() {
  const t = useTranslations('queue.board');
  const { user } = useAuthStore();
  const canCheckIn = user ? QUEUE_CREATE_ROLES.has(user.role) : false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        {canCheckIn && (
          <Link
            href="/dashboard/queue/check-in"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4" />
            {t('checkInPatient')}
          </Link>
        )}
      </div>

      <QueueBoard />
    </div>
  );
}
