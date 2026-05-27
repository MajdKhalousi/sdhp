import { useTranslations } from 'next-intl';
import { RadiologyWorklistPanel } from '@/components/technician/radiology-worklist-panel';

export default function TechnicianRadiologyPage() {
  const t = useTranslations('technicianRadiology');
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t('pageTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('pageSubtitle')}</p>
      </div>
      <RadiologyWorklistPanel />
    </div>
  );
}
