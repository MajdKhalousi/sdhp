import { useTranslations } from 'next-intl';
import { DoctorQueuePanel } from '@/components/doctor/doctor-queue-panel';

export default function DoctorQueuePage() {
  const t = useTranslations('doctorQueue');
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t('pageTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('pageSubtitle')}</p>
      </div>

      <DoctorQueuePanel />
    </div>
  );
}
