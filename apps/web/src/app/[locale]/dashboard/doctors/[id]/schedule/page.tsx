'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { DOCTORS_PAGE_ROLES } from '@/lib/permissions';
import { useDoctorsList } from '@/hooks/use-appointments';
import { DoctorScheduleGrid } from '@/components/doctors/doctor-schedule-grid';
import { ExceptionList } from '@/components/doctors/exception-list';


export default function DoctorSchedulePage() {
  const t      = useTranslations('doctors.schedule');
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuthStore();
  const params   = useParams();
  const doctorId = params.id as string;

  const { data: doctorsData } = useDoctorsList();

  useEffect(() => {
    if (user && !DOCTORS_PAGE_ROLES.has(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (!user || !DOCTORS_PAGE_ROLES.has(user.role)) return null;

  const doctor     = doctorsData?.data.find((d) => d.id === doctorId);
  const doctorName = doctor ? `${doctor.user.firstName} ${doctor.user.lastName}` : '—';

  const BackIcon = locale === 'ar' ? ChevronRight : ChevronLeft;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/dashboard/doctors"
          locale={locale}
          className="mt-0.5 inline-flex items-center justify-center rounded-lg border border-input p-1.5 text-muted-foreground transition-colors hover:bg-muted"
          aria-label={t('backToDoctors')}
        >
          <BackIcon className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{doctorName}</p>
        </div>
      </div>

      {/* Weekly schedule */}
      <DoctorScheduleGrid doctorId={doctorId} />

      {/* Exceptions */}
      <ExceptionList doctorId={doctorId} />
    </div>
  );
}
