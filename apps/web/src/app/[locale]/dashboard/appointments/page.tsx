'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Plus } from 'lucide-react';
import { AppointmentList } from '@/components/appointments/appointment-list';
import { useAuthStore } from '@/store/auth';
import { APPOINTMENT_CREATE_ROLES } from '@/lib/permissions';

export default function AppointmentsPage() {
  const t = useTranslations('appointment.list');
  const { user } = useAuthStore();
  const canCreate = user ? APPOINTMENT_CREATE_ROLES.has(user.role) : false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        {canCreate && (
          <Link
            href="/dashboard/appointments/new"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            {t('newAppointment')}
          </Link>
        )}
      </div>

      <AppointmentList />
    </div>
  );
}
