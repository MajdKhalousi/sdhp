import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { AppointmentForm } from '@/components/appointments/appointment-form';
import { RoleGuard } from '@/components/layout/role-guard';
import { APPOINTMENT_CREATE_ROLES } from '@/lib/permissions';

interface Props {
  searchParams: Promise<{
    patientId?: string;
    doctorId?: string;
    followUpDate?: string;
    visitTypeId?: string;
  }>;
}

export default async function NewAppointmentPage({ searchParams }: Props) {
  const { patientId, doctorId, followUpDate, visitTypeId } = await searchParams;
  const isFollowUp = !!followUpDate;

  const t = await getTranslations('appointment.form');
  const tCommon = await getTranslations('common');

  return (
    <RoleGuard allowedRoles={APPOINTMENT_CREATE_ROLES}>
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/appointments"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent"
            aria-label={tCommon('actions.back')}
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold">
              {isFollowUp ? t('followUpTitle') : t('title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isFollowUp ? t('followUpSubtitle') : t('subtitle')}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <AppointmentForm
            initialPatientId={patientId}
            initialDoctorId={doctorId}
            initialDate={followUpDate}
            initialVisitTypeId={visitTypeId}
          />
        </div>
      </div>
    </RoleGuard>
  );
}
