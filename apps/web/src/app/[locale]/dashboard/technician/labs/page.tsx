import { useTranslations } from 'next-intl';
import { LabWorklistPanel } from '@/components/technician/lab-worklist-panel';

export default function TechnicianLabsPage() {
  const t = useTranslations('technicianLabs');
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t('pageTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('pageSubtitle')}</p>
      </div>
      <LabWorklistPanel />
    </div>
  );
}
