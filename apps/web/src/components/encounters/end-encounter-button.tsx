'use client';

import { useState } from 'react';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useUpdateEncounter } from '@/hooks/use-encounters';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompletionChecklist } from '@/hooks/use-completion-checklist';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-messages';
import type { ChecklistItem } from '@/hooks/use-completion-checklist';

export interface CompletionContext {
  chiefComplaint: string;
  historyOfPresentIllness: string;
  notes: string;
  diagnosis: string;
  treatmentPlan: string;
  patientInstructions: string;
  followUpDate: string;
  vitalsEmpty: boolean;
  hasUnpaidInvoice: boolean;
}

interface EndEncounterButtonProps {
  encounterId: string;
  patientId: string;
  alreadyEnded: boolean;
  disabled?: boolean;
  disabledReason?: string;
  completionContext: CompletionContext;
  confirmOpen?: boolean;
  onConfirmClose?: () => void;
}

export function EndEncounterButton({
  encounterId,
  patientId,
  alreadyEnded,
  disabled = false,
  disabledReason,
  completionContext,
  confirmOpen,
  onConfirmClose,
}: EndEncounterButtonProps) {
  const t = useTranslations('encounter');
  const tCommon = useTranslations('common');
  const tRoot = useTranslations();
  const router = useRouter();
  const [internalConfirming, setInternalConfirming] = useState(false);
  const confirming = !!confirmOpen || internalConfirming;
  const [error, setError] = useState('');
  const { mutate, isPending } = useUpdateEncounter();

  const checklist = useCompletionChecklist({
    encounterId,
    patientId,
    ...completionContext,
    enabled: confirming,
  });

  // Resolved at render time — static calls satisfy next-intl's typed t().
  function getLabel(item: ChecklistItem): string {
    switch (item.key) {
      case 'chiefComplaintMissing':      return t('completion.checks.chiefComplaintMissing');
      case 'diagnosisMissing':           return t('completion.checks.diagnosisMissing');
      case 'vitalsMissing':              return t('completion.checks.vitalsMissing');
      case 'hpiMissing':                 return t('completion.checks.hpiMissing');
      case 'notesMissing':               return t('completion.checks.notesMissing');
      case 'treatmentPlanMissing':       return t('completion.checks.treatmentPlanMissing');
      case 'patientInstructionsMissing': return t('completion.checks.patientInstructionsMissing');
      case 'followUpMissing':            return t('completion.checks.followUpMissing');
      case 'prescriptionsMissing':       return t('completion.checks.prescriptionsMissing');
      case 'labsPending':                return t('completion.checks.labsPending', { count: item.count ?? 0 });
      case 'radiologyPending':           return t('completion.checks.radiologyPending', { count: item.count ?? 0 });
      case 'reportMissing':              return t('completion.checks.reportMissing');
      case 'unpaidInvoice':              return t('completion.checks.unpaidInvoice');
      default:                           return item.key;
    }
  }

  function handleConfirm() {
    setError('');
    mutate(
      { id: encounterId, payload: { endedAt: new Date().toISOString() } },
      {
        onSuccess: () => router.push('/dashboard/doctor/queue'),
        onError: (e) => {
          setInternalConfirming(false);
          onConfirmClose?.();
          setError(getFriendlyApiErrorMessage(e, tRoot));
        },
      },
    );
  }

  function handleCancelConfirm() {
    setInternalConfirming(false);
    onConfirmClose?.();
  }

  if (alreadyEnded) {
    return <span className="text-xs text-muted-foreground">{t('close.alreadyEnded')}</span>;
  }

  // ── Confirmation modal ────────────────────────────────────────────────────
  if (confirming) {
    const clinicalItems = checklist.items.filter((i) => i.section === 'clinical');
    const orderItems    = checklist.items.filter((i) => i.section === 'orders');
    const billingItems  = checklist.items.filter((i) => i.section === 'billing');

    // All clear: orders loaded, zero checklist items.
    const allClear = !checklist.ordersLoading && checklist.items.length === 0;

    // While orders load and no clinical/billing issues, show a compact loading state.
    const onlyOrdersLoading =
      checklist.ordersLoading && clinicalItems.length === 0 && billingItems.length === 0;

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60"
          onClick={isPending ? undefined : handleCancelConfirm}
        />

        {/* Panel — slide up on mobile, centered on sm+ */}
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl">

            {/* Header */}
            <div className="border-b border-border px-5 py-4">
              <p className="text-base font-semibold text-foreground">
                {t('completion.modalHeading')}
              </p>
            </div>

            {/* Checklist body */}
            <div className="max-h-[52vh] overflow-y-auto px-5 py-4">
              {allClear ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <p className="text-sm font-medium">{t('completion.looksComplete')}</p>
                </div>
              ) : onlyOrdersLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-2/3 rounded" />
                  <Skeleton className="h-5 w-1/2 rounded" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Clinical */}
                  {clinicalItems.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('completion.sectionClinical')}
                      </p>
                      <div className="space-y-1.5">
                        {clinicalItems.map((item) => (
                          <ChecklistRow key={item.key} item={item} label={getLabel(item)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Orders */}
                  {(checklist.ordersLoading || orderItems.length > 0) && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('completion.sectionOrders')}
                      </p>
                      {checklist.ordersLoading ? (
                        <div className="space-y-1.5">
                          <Skeleton className="h-5 w-3/4 rounded" />
                          <Skeleton className="h-5 w-1/2 rounded" />
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {orderItems.map((item) => (
                            <ChecklistRow key={item.key} item={item} label={getLabel(item)} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Billing */}
                  {billingItems.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('completion.sectionBilling')}
                      </p>
                      <div className="space-y-1.5">
                        {billingItems.map((item) => (
                          <ChecklistRow key={item.key} item={item} label={getLabel(item)} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mutation error */}
            {error && <p className="px-5 pb-1 text-xs text-destructive">{error}</p>}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-4">
              <button
                onClick={handleCancelConfirm}
                disabled={isPending}
                className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
              >
                {t('completion.reviewFirst')}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="inline-flex h-9 items-center rounded-md bg-green-600 px-4 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-green-700 dark:hover:bg-green-600"
              >
                {isPending ? t('actions.closing') : t('completion.completeVisit')}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Disabled trigger ──────────────────────────────────────────────────────
  if (disabled) {
    return (
      <div className="flex flex-col gap-1">
        <button
          disabled
          className="inline-flex h-9 items-center rounded-md border border-green-600/40 px-4 text-sm font-medium text-green-700 opacity-60 dark:text-green-400"
        >
          {t('actions.closeVisit')}
        </button>
        {disabledReason && <p className="text-xs text-muted-foreground">{disabledReason}</p>}
      </div>
    );
  }

  // ── Default trigger ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => setInternalConfirming(true)}
        className="inline-flex h-9 items-center rounded-md border border-green-600/40 px-4 text-sm font-medium text-green-700 transition-colors hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30"
      >
        {t('actions.closeVisit')}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── Checklist row ─────────────────────────────────────────────────────────────

function ChecklistRow({ item, label }: { item: ChecklistItem; label: string }) {
  if (item.status === 'warn') {
    return (
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
        <span className="text-sm text-amber-700 dark:text-amber-400">{label}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
