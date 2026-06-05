'use client';

import { useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useEncounter } from '@/hooks/use-encounters';
import { useEncounterPrescriptions } from '@/hooks/use-prescriptions';
import { usePatientLabOrders } from '@/hooks/use-labs';
import { usePatientRadiologyOrders } from '@/hooks/use-radiology';
import { ICD_CODES } from '@/lib/icd-codes';
import type { VitalsPayload } from '@/types/encounter';

const VITALS_KEYS: (keyof VitalsPayload)[] = [
  'temperature',
  'bloodPressure',
  'heartRate',
  'oxygenSaturation',
  'respiratoryRate',
  'weight',
  'height',
];

interface Props {
  params: { id: string };
}

export default function EncounterPrintPage({ params }: Props) {
  const t = useTranslations('encounter');
  const tPrint = useTranslations('encounter.print');
  const tTimeline = useTranslations('timeline');
  const locale = useLocale();
  const displayLocale = locale === 'ar' ? 'ar-u-nu-latn' : 'en-GB';

  const { data: encounter, isLoading: loadingEncounter, isError } = useEncounter(params.id);
  const patientId = encounter?.patient.id ?? '';

  const { data: rxData, isLoading: loadingRx } = useEncounterPrescriptions(params.id);
  const { data: allLabOrders = [], isLoading: loadingLabs } = usePatientLabOrders(patientId);
  const { data: allRadOrders = [], isLoading: loadingRad } = usePatientRadiologyOrders(patientId);

  const prescriptions = rxData?.data ?? [];
  const encounterLabs = allLabOrders.filter((o) => o.encounterId === params.id);
  const encounterRad = allRadOrders.filter((o) => o.encounterId === params.id);

  const allLoaded = !!encounter && !!patientId && !loadingRx && !loadingLabs && !loadingRad;

  useEffect(() => {
    if (allLoaded) window.print();
  }, [allLoaded]);

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(displayLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  const anyLoading =
    loadingEncounter || loadingRx || (!!patientId && (loadingLabs || loadingRad));

  if (anyLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{tPrint('loading')}</p>
      </div>
    );
  }

  if (isError || !encounter) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive">{tPrint('error')}</p>
      </div>
    );
  }

  const vitals = encounter.vitals as VitalsPayload | null;
  const nonEmptyVitals = vitals ? VITALS_KEYS.filter((k) => !!vitals[k]?.trim()) : [];
  const icdEntry = encounter.diagnosisCode
    ? (ICD_CODES.find((e) => e.code === encounter.diagnosisCode) ?? null)
    : null;

  const doctorName = `${encounter.doctor.user.firstName} ${encounter.doctor.user.lastName}`;
  const patientName = `${encounter.patient.firstName} ${encounter.patient.lastName}`;
  const encounterDate = encounter.startedAt
    ? formatDate(encounter.startedAt)
    : formatDate(encounter.createdAt);

  return (
    <div className="mx-auto max-w-[720px] px-6 py-8">
      {/* Controls bar — hidden when printing */}
      <div className="print:hidden mb-6 flex items-center gap-3 border-b pb-4">
        <button
          onClick={() => window.close()}
          className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
        >
          {tPrint('actions.back')}
        </button>
        <div className="flex-1" />
        <button
          onClick={() => window.print()}
          className="inline-flex items-center rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {tPrint('actions.print')}
        </button>
      </div>

      {/* Document */}
      <div className="space-y-5">
        {/* Title */}
        <div className="border-b pb-3 text-center">
          <h1 className="text-xl font-bold">{tPrint('title')}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{encounterDate}</p>
        </div>

        {/* Patient */}
        <section className="break-inside-avoid rounded-md border p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {tPrint('patientHeader')}
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div className="col-span-2 font-semibold">{patientName}</div>
            <div>
              <span className="text-muted-foreground">{tPrint('patient.mrn')}: </span>
              <span className="font-mono" dir="ltr">{encounter.patient.mrn}</span>
            </div>
            {encounter.patient.dateOfBirth && (
              <div>
                <span className="text-muted-foreground">{tPrint('patient.dob')}: </span>
                <span dir="ltr">{formatDate(encounter.patient.dateOfBirth)}</span>
              </div>
            )}
            {encounter.patient.gender && (
              <div>
                <span className="text-muted-foreground">{tPrint('patient.gender')}: </span>
                <span>{encounter.patient.gender}</span>
              </div>
            )}
            {encounter.patient.chronicDiseases && (
              <div className="col-span-2">
                <span className="text-muted-foreground">{tPrint('patient.chronicDiseases')}: </span>
                <span dir="auto">{encounter.patient.chronicDiseases}</span>
              </div>
            )}
          </div>
        </section>

        {/* Encounter meta */}
        <section className="break-inside-avoid rounded-md border p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {tPrint('encounterHeader')}
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div>
              <span className="text-muted-foreground">{tPrint('encounter.doctor')}: </span>
              <span>{t('header.doctorPrefix')} {doctorName}</span>
            </div>
            {encounter.doctor.specialization && (
              <div>
                <span className="text-muted-foreground">{tPrint('encounter.specialization')}: </span>
                <span>{encounter.doctor.specialization}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">{tPrint('encounter.status')}: </span>
              <span>
                {encounter.endedAt ? t('status.completed') : t('status.inProgress')}
              </span>
            </div>
          </div>
        </section>

        {/* Chief Complaint */}
        {encounter.chiefComplaint && (
          <section className="break-inside-avoid space-y-1">
            <h2 className="text-sm font-semibold">{tPrint('sections.subjectiveCC')}</h2>
            <p className="text-sm" dir="auto">{encounter.chiefComplaint}</p>
          </section>
        )}

        {/* History of Present Illness */}
        {encounter.historyOfPresentIllness && (
          <section className="break-inside-avoid space-y-1">
            <h2 className="text-sm font-semibold">{tPrint('sections.subjectiveHPI')}</h2>
            <p className="whitespace-pre-wrap text-sm" dir="auto">{encounter.historyOfPresentIllness}</p>
          </section>
        )}

        {/* Vitals */}
        {nonEmptyVitals.length > 0 && (
          <section className="break-inside-avoid space-y-2">
            <h2 className="text-sm font-semibold">{tPrint('sections.vitals')}</h2>
            <div className="grid grid-cols-3 gap-2 text-sm sm:grid-cols-4">
              {nonEmptyVitals.map((key) => (
                <div key={key} className="rounded border px-2.5 py-1.5">
                  <div className="text-xs text-muted-foreground">
                    {t(`vitals.fields.${key}` as Parameters<typeof t>[0])}
                  </div>
                  <div dir="ltr" className="font-medium">
                    {vitals![key]}{' '}
                    <span className="text-xs font-normal text-muted-foreground">
                      {t(`vitals.units.${key}` as Parameters<typeof t>[0])}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Examination & Findings */}
        {encounter.notes && (
          <section className="break-inside-avoid space-y-1">
            <h2 className="text-sm font-semibold">{tPrint('sections.examination')}</h2>
            <p className="whitespace-pre-wrap text-sm" dir="auto">{encounter.notes}</p>
          </section>
        )}

        {/* Diagnosis */}
        {(encounter.diagnosis || encounter.diagnosisCode) && (
          <section className="break-inside-avoid rounded-md border p-4">
            <h2 className="mb-2 text-sm font-semibold">{tPrint('sections.assessment')}</h2>
            {encounter.diagnosisCode && (
              <p className="text-xs text-muted-foreground" dir="ltr">
                {encounter.diagnosisCode}
                {icdEntry ? ` — ${icdEntry.description}` : ''}
              </p>
            )}
            {encounter.diagnosis && (
              <p className="mt-1 text-sm" dir="auto">{encounter.diagnosis}</p>
            )}
          </section>
        )}

        {/* Treatment Plan */}
        {encounter.treatmentPlan && (
          <section className="break-inside-avoid space-y-1">
            <h2 className="text-sm font-semibold">{tPrint('sections.plan')}</h2>
            <p className="whitespace-pre-wrap text-sm" dir="auto">{encounter.treatmentPlan}</p>
          </section>
        )}

        {/* Patient Instructions */}
        {encounter.patientInstructions && (
          <section className="break-inside-avoid space-y-1">
            <h2 className="text-sm font-semibold">{tPrint('sections.patientInstructions')}</h2>
            <p className="whitespace-pre-wrap text-sm" dir="auto">{encounter.patientInstructions}</p>
          </section>
        )}

        {/* Follow-up Date */}
        {encounter.followUpDate && (
          <section className="break-inside-avoid space-y-1">
            <h2 className="text-sm font-semibold">{tPrint('sections.followUp')}</h2>
            <p className="text-sm" dir="ltr">{formatDate(encounter.followUpDate)}</p>
          </section>
        )}

        {/* Prescriptions */}
        {prescriptions.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">{tPrint('sections.prescriptions')}</h2>
            <div className="space-y-2">
              {prescriptions.map((rx) => (
                <div key={rx.id} className="break-inside-avoid rounded border px-3 py-2 text-sm">
                  <div className="font-medium" dir="auto">{rx.medication}</div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                    {rx.dosage && (
                      <span>
                        {tPrint('prescription.dosage')}: <span dir="ltr">{rx.dosage}</span>
                      </span>
                    )}
                    {rx.frequency && (
                      <span>
                        {tPrint('prescription.frequency')}: <span dir="auto">{rx.frequency}</span>
                      </span>
                    )}
                    {rx.duration && (
                      <span>
                        {tPrint('prescription.duration')}: <span dir="auto">{rx.duration}</span>
                      </span>
                    )}
                    {rx.quantity != null && (
                      <span>
                        {tPrint('prescription.quantity')}: <span dir="ltr">{rx.quantity}</span>
                      </span>
                    )}
                  </div>
                  {rx.instructions && (
                    <p className="mt-1 text-xs text-muted-foreground" dir="auto">{rx.instructions}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Lab Orders */}
        {encounterLabs.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">{tPrint('sections.labOrders')}</h2>
            <div className="space-y-2">
              {encounterLabs.map((order) => (
                <div key={order.id} className="break-inside-avoid rounded border px-3 py-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium" dir="auto">{order.testName}</span>
                    <span className="shrink-0 rounded border bg-muted px-1.5 py-0.5 text-xs" dir="ltr">
                      {tTimeline(`labOrderStatus.${order.status}` as Parameters<typeof tTimeline>[0])}
                    </span>
                  </div>
                  {order.testCode && (
                    <p className="mt-0.5 text-xs text-muted-foreground" dir="ltr">
                      {tPrint('labOrder.testCode')}: {order.testCode}
                    </p>
                  )}
                  {order.result && (
                    <div className="mt-1.5 space-y-0.5 text-xs">
                      {order.result.resultValue && (
                        <div>
                          <span className="text-muted-foreground">{tPrint('labOrder.result')}: </span>
                          <span dir="ltr">
                            {order.result.resultValue}
                            {order.result.unit ? ` ${order.result.unit}` : ''}
                          </span>
                        </div>
                      )}
                      {order.result.referenceRange && (
                        <div>
                          <span className="text-muted-foreground">{tPrint('labOrder.referenceRange')}: </span>
                          <span dir="ltr">{order.result.referenceRange}</span>
                        </div>
                      )}
                      {order.result.interpretation && (
                        <div>
                          <span className="text-muted-foreground">{tPrint('labOrder.interpretation')}: </span>
                          <span dir="auto">{order.result.interpretation}</span>
                        </div>
                      )}
                      {order.result.resultNotes && (
                        <div>
                          <span className="text-muted-foreground">{tPrint('labOrder.notes')}: </span>
                          <span dir="auto">{order.result.resultNotes}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {!order.result && order.notes && (
                    <p className="mt-1 text-xs text-muted-foreground" dir="auto">{order.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Radiology Orders */}
        {encounterRad.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">{tPrint('sections.radiologyOrders')}</h2>
            <div className="space-y-2">
              {encounterRad.map((order) => (
                <div key={order.id} className="break-inside-avoid rounded border px-3 py-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium" dir="ltr">
                      {order.modality}{order.bodyPart ? ` — ${order.bodyPart}` : ''}
                    </span>
                    <span className="shrink-0 rounded border bg-muted px-1.5 py-0.5 text-xs" dir="ltr">
                      {tTimeline(`radiologyStatus.${order.status}` as Parameters<typeof tTimeline>[0])}
                    </span>
                  </div>
                  {order.report && (
                    <div className="mt-1.5 space-y-1 text-xs">
                      {order.report.findings && (
                        <div>
                          <span className="text-muted-foreground">{tPrint('radiologyOrder.findings')}: </span>
                          <span className="whitespace-pre-wrap" dir="auto">{order.report.findings}</span>
                        </div>
                      )}
                      {order.report.impression && (
                        <div>
                          <span className="text-muted-foreground">{tPrint('radiologyOrder.impression')}: </span>
                          <span className="whitespace-pre-wrap" dir="auto">{order.report.impression}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {!order.report && order.notes && (
                    <p className="mt-1 text-xs text-muted-foreground" dir="auto">{order.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
