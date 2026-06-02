'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { Allergy } from '@/hooks/use-allergies';
import { formatDateDisplay } from '@/lib/format-date';

interface Props {
  allergies: Allergy[];
  chronicDiseases?: string | null;
  isActive: boolean;
  hasEmergencyContact: boolean;
  pendingLabsCount: number;
  pendingRadiologyCount: number;
  overdueFollowUpDate: string | null;
}

type AlertSeverity = 'critical' | 'warning' | 'info';

interface AlertItem {
  id: string;
  severity: AlertSeverity;
  message: string;
}

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  critical: 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400',
  warning:  'bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400',
  info:     'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400',
};

const DOT_STYLES: Record<AlertSeverity, string> = {
  critical: 'bg-red-500 dark:bg-red-400',
  warning:  'bg-orange-500 dark:bg-orange-400',
  info:     'bg-slate-400 dark:bg-slate-500',
};

function isOverdue(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr + 'T00:00:00') < today;
}

export function PatientSafetyAlerts({
  allergies,
  chronicDiseases,
  isActive,
  hasEmergencyContact,
  pendingLabsCount,
  pendingRadiologyCount,
  overdueFollowUpDate,
}: Props) {
  const t = useTranslations('patient.safety');
  const locale = useLocale();
  const displayLocale = locale === 'ar' ? 'ar-u-nu-latn' : 'en-US';

  const alerts = useMemo<AlertItem[]>(() => {
    const items: AlertItem[] = [];

    if (!isActive) {
      items.push({ id: 'inactive', severity: 'critical', message: t('inactivePatient') });
    }

    const severeAllergies = allergies.filter((a) => a.severity === 'SEVERE');

    if (severeAllergies.length > 0) {
      for (const a of severeAllergies) {
        items.push({
          id: `allergy-${a.id}`,
          severity: 'critical',
          message: `${t('severeAllergy')}: ${a.substance}${a.reaction ? ` — ${a.reaction}` : ''}`,
        });
      }
    } else {
      for (const a of allergies) {
        items.push({
          id: `allergy-${a.id}`,
          severity: 'warning',
          message: `${t('allergy')}: ${a.substance}${a.reaction ? ` — ${a.reaction}` : ''}`,
        });
      }
    }

    if (chronicDiseases) {
      items.push({
        id: 'chronic',
        severity: 'warning',
        message: `${t('chronicDiseases')}: ${chronicDiseases}`,
      });
    }

    if (overdueFollowUpDate && isOverdue(overdueFollowUpDate)) {
      items.push({
        id: 'followup',
        severity: 'warning',
        message: `${t('overdueFollowUp')} ${formatDateDisplay(overdueFollowUpDate)}`,
      });
    }

    if (pendingLabsCount > 0) {
      items.push({
        id: 'labs',
        severity: 'info',
        message: `${pendingLabsCount} ${t('pendingLabs')}`,
      });
    }

    if (pendingRadiologyCount > 0) {
      items.push({
        id: 'radiology',
        severity: 'info',
        message: `${pendingRadiologyCount} ${t('pendingRadiology')}`,
      });
    }

    if (!hasEmergencyContact) {
      items.push({
        id: 'emergency',
        severity: 'info',
        message: t('missingEmergencyContact'),
      });
    }

    return items;
  }, [
    allergies,
    chronicDiseases,
    isActive,
    hasEmergencyContact,
    pendingLabsCount,
    pendingRadiologyCount,
    overdueFollowUpDate,
    t,
    displayLocale,
  ]);

  if (alerts.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card px-5 py-3 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('heading')}
      </p>
      <div className="space-y-1.5">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-start gap-2.5 rounded-md px-3 py-1.5 text-sm ${SEVERITY_STYLES[alert.severity]}`}
          >
            <div
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${DOT_STYLES[alert.severity]}`}
            />
            <span dir="auto">{alert.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
