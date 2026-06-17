'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { UserPlus } from 'lucide-react';
import { QueueBoard } from '@/components/queue/queue-board';
import { WalkInWizard } from '@/components/queue/walk-in-wizard';
import { useAuthStore } from '@/store/auth';
import { QUEUE_CREATE_ROLES } from '@/lib/permissions';

export default function QueuePage() {
  const t = useTranslations('queue.board');
  const { user } = useAuthStore();
  const canCheckIn = user ? QUEUE_CREATE_ROLES.has(user.role) : false;
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);

  useEffect(() => {
    if (isCheckInOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isCheckInOpen]);

  useEffect(() => {
    if (!isCheckInOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsCheckInOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isCheckInOpen]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        {canCheckIn && (
          <button
            onClick={() => setIsCheckInOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4" />
            {t('checkInPatient')}
          </button>
        )}
      </div>

      <QueueBoard />

      {isCheckInOpen && (
        <div
          className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-12"
          onClick={(e) => { if (e.target === e.currentTarget) setIsCheckInOpen(false); }}
        >
          <div className="relative w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-xl">
            <WalkInWizard onClose={() => setIsCheckInOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
