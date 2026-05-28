import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { AppointmentForm } from '@/components/appointments/appointment-form';

export default function NewAppointmentPage() {
  const t = useTranslations('appointment.form');
  const tCommon = useTranslations('common');

  return (
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
          <h1 className="text-xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <AppointmentForm />
      </div>
    </div>
  );
}
