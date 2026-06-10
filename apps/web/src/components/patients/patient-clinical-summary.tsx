'use client';

import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth';
import { usePatientTimeline } from '@/hooks/use-patient-timeline';
import { usePatientLabOrders } from '@/hooks/use-labs';
import { usePatientRadiologyOrders } from '@/hooks/use-radiology';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateDisplay } from '@/lib/format-date';

const CLINICAL_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR', 'NURSE']);

const PENDING_LAB_STATUSES = new Set(['ORDERED', 'SAMPLE_COLLECTED', 'IN_PROGRESS']);
const PENDING_RADIOLOGY_STATUSES = new Set(['ORDERED', 'SCHEDULED', 'IN_PROGRESS']);

interface SnapshotRowProps {
  label: string;
  value: React.ReactNode;
}

function SnapshotRow({ label, value }: SnapshotRowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

interface Props {
  patientId: string;
  onViewHistory?: () => void;
}

export function PatientClinicalSummary({ patientId, onViewHistory }: Props) {
  const t = useTranslations('patient.clinicalSummary');

  const { user } = useAuthStore();
  const hasClinicalRole = !!user && CLINICAL_ROLES.has(user.role);

  const {
    data: timeline,
    isLoading: timelineLoading,
    isError: timelineError,
  } = usePatientTimeline(patientId, { types: ['ENCOUNTER'], limit: 5 });

  const {
    data: labs,
    isLoading: labsLoading,
    isError: labsError,
  } = usePatientLabOrders(patientId);

  const {
    data: radOrders,
    isLoading: radLoading,
    isError: radError,
  } = usePatientRadiologyOrders(patientId);

  if (!hasClinicalRole) return null;

  const isLoading = timelineLoading || labsLoading || radLoading;
  const allFailed = timelineError && labsError && radError;

  if (isLoading) {
    return <Skeleton className="h-28 w-full rounded-xl" />;
  }

  if (allFailed) {
    return (
      <div className="rounded-xl border bg-card px-5 py-3 shadow-sm">
        <p className="text-sm text-muted-foreground">{t('loadFailed')}</p>
      </div>
    );
  }

  const lastEncounterEvent = timeline?.data?.[0];
  const enc = lastEncounterEvent?.type === 'ENCOUNTER' ? lastEncounterEvent.data : null;

  const clinicalEvent = (timeline?.data ?? []).find(
    (e) =>
      e.type === 'ENCOUNTER' &&
      !!(
        e.data.chiefComplaint ||
        e.data.historyOfPresentIllness ||
        e.data.treatmentPlan ||
        e.data.diagnosisCode ||
        e.data.hasDiagnosis ||
        e.data.followUpDate
      ),
  );
  const cEnc = clinicalEvent?.type === 'ENCOUNTER' ? clinicalEvent.data : null;
  const isFromPriorVisit = clinicalEvent !== undefined && clinicalEvent !== lastEncounterEvent;

  const pendingLabs = (labs ?? []).filter((l) => PENDING_LAB_STATUSES.has(l.status)).length;
  const pendingRad = (radOrders ?? []).filter((r) => PENDING_RADIOLOGY_STATUSES.has(r.status)).length;

  const hasAnyData = enc || pendingLabs > 0 || pendingRad > 0;

  const na = t('notAvailable');

  return (
    <div className="rounded-xl border bg-card px-5 py-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('heading')}
        </p>
        {onViewHistory && (
          <button
            type="button"
            onClick={onViewHistory}
            className="text-xs font-medium text-primary hover:underline"
          >
            {t('viewHistory')}
          </button>
        )}
      </div>

      {!hasAnyData ? (
        <p className="text-sm text-muted-foreground">{t('noHistory')}</p>
      ) : (
        <>
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
            <SnapshotRow
              label={t('lastVisit')}
              value={
                enc ? (
                  <span>
                    {formatDateDisplay(enc.startedAt)}
                    {enc.doctor && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {`${enc.doctor.firstName} ${enc.doctor.lastName}`}
                      </span>
                    )}
                  </span>
                ) : na
              }
            />

            <SnapshotRow
              label={t('lastDiagnosis')}
              value={enc?.diagnosisCode ?? (enc?.hasDiagnosis ? t('notAvailable') : na)}
            />

            <SnapshotRow
              label={t('nextFollowUp')}
              value={enc?.followUpDate ? formatDateDisplay(enc.followUpDate) : na}
            />

            <SnapshotRow
              label={t('pendingLabs')}
              value={labsError ? na : String(pendingLabs)}
            />

            <SnapshotRow
              label={t('pendingRadiology')}
              value={radError ? na : String(pendingRad)}
            />
          </div>

          {(cEnc?.chiefComplaint || cEnc?.historyOfPresentIllness || cEnc?.treatmentPlan) && (
            <div className="mt-3 space-y-2 border-t pt-3">
              {isFromPriorVisit && (
                <p className="text-xs text-muted-foreground">
                  <span>{t('fromPreviousVisit')}</span>{' '}
                  <span dir="ltr">{formatDateDisplay(cEnc.startedAt)}</span>
                </p>
              )}
              {cEnc.chiefComplaint && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">{t('lastChiefComplaint')}</span>
                  <span className="text-sm text-foreground line-clamp-2">{cEnc.chiefComplaint}</span>
                </div>
              )}
              {cEnc.historyOfPresentIllness && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">{t('lastHpi')}</span>
                  <span className="text-sm text-foreground line-clamp-2">{cEnc.historyOfPresentIllness}</span>
                </div>
              )}
              {cEnc.treatmentPlan && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">{t('lastTreatmentPlan')}</span>
                  <span className="text-sm text-foreground line-clamp-2">{cEnc.treatmentPlan}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
