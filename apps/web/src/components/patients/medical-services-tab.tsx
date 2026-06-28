'use client';

import { useState } from 'react';
import { Plus, ClipboardList } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth';
import {
  usePatientMedicalServiceRequests,
  useExecuteMedicalServiceRequest,
  useCancelMedicalServiceRequest,
  type MedicalServiceRequest,
  type ServiceExecutionStatus,
} from '@/hooks/use-medical-service-requests';
import { formatDateDisplay } from '@/lib/format-date';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-messages';
import { MedicalServiceRequestForm } from './medical-service-request-form';
import { BillMedicalServiceRequestDialog } from './bill-medical-service-request-dialog';

const CREATE_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR', 'SECRETARY']);
const EXECUTE_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR', 'NURSE', 'TECHNICIAN']);
const CANCEL_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR', 'SECRETARY']);
const BILL_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'ACCOUNTANT']);

const TRANSITIONABLE_STATUSES = new Set<ServiceExecutionStatus>(['REQUESTED', 'IN_PROGRESS']);

const EXECUTION_STATUS_VARIANT: Record<ServiceExecutionStatus, BadgeProps['variant']> = {
  REQUESTED: 'outline',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

const PAYMENT_STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
  UNBILLED: 'outline',
  DRAFT: 'outline',
  ISSUED: 'default',
  PARTIALLY_PAID: 'warning',
  PAID: 'success',
  CANCELLED: 'danger',
};

function PaymentStatusBadge({ status }: { status: string }) {
  const t = useTranslations('medicalServiceRequests.paymentStatus');
  const variant = PAYMENT_STATUS_VARIANT[status] ?? 'outline';
  const label = t(status as Parameters<typeof t>[0]);
  return <Badge variant={variant} className="whitespace-nowrap">{label}</Badge>;
}

interface CardProps {
  request: MedicalServiceRequest;
  canExecute: boolean;
  canCancel: boolean;
  canBill: boolean;
  onBill: (id: string) => void;
}

function MedicalServiceRequestCard({ request, canExecute, canCancel, canBill, onBill }: CardProps) {
  const t = useTranslations('medicalServiceRequests');
  const tRoot = useTranslations();

  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionError, setActionError] = useState('');

  const { mutate: execute, isPending: executing } = useExecuteMedicalServiceRequest();
  const { mutate: cancel, isPending: cancelling } = useCancelMedicalServiceRequest();

  const isTransitionable = TRANSITIONABLE_STATUSES.has(request.executionStatus);
  const showExecute = canExecute && isTransitionable;
  const showCancel = canCancel && isTransitionable;
  const showBill =
    canBill && request.executionStatus !== 'CANCELLED' && request.invoiceItemId === null;

  const doctorName = request.doctor
    ? `${request.doctor.user.firstName} ${request.doctor.user.lastName}`
    : null;
  const requestedByName = `${request.requestedBy.firstName} ${request.requestedBy.lastName}`;

  function handleExecute() {
    setActionError('');
    execute(
      { id: request.id, patientId: request.patientId },
      { onError: (e) => setActionError(getFriendlyApiErrorMessage(e, tRoot)) },
    );
  }

  function handleCancelSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActionError('');
    const reason = cancelReason.trim();
    if (!reason) {
      setActionError(t('validation.cancelReasonRequired'));
      return;
    }
    cancel(
      { id: request.id, patientId: request.patientId, payload: { cancelReason: reason } },
      {
        onSuccess: () => {
          setIsCancelling(false);
          setCancelReason('');
        },
        onError: (e) => setActionError(getFriendlyApiErrorMessage(e, tRoot)),
      },
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm border-s-4 border-s-indigo-400">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
          {t('cardLabel')}
        </span>
        <span className="text-xs text-muted-foreground" dir="ltr">
          {formatDateDisplay(request.createdAt)}
        </span>
      </div>

      <p className="font-medium text-sm text-foreground">{request.requestedServiceName}</p>

      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <Badge variant={EXECUTION_STATUS_VARIANT[request.executionStatus]}>
          {t(`executionStatus.${request.executionStatus}` as Parameters<typeof t>[0])}
        </Badge>
        <PaymentStatusBadge status={request.paymentStatus} />
        {request.quantity > 1 && (
          <span className="text-xs text-muted-foreground">
            {t('quantityPrefix')} {request.quantity}
          </span>
        )}
      </div>

      <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
        <p>{t('requestedBy')}: {requestedByName}</p>
        {doctorName && <p>{t('doctor')}: {doctorName}</p>}
        {request.notes && <p>{t('notes')}: {request.notes}</p>}
        {request.cancelReason && (
          <p className="text-destructive">{t('cancelReasonLabel')}: {request.cancelReason}</p>
        )}
      </div>

      {actionError && <p className="mt-2 text-xs text-destructive">{actionError}</p>}

      {(showExecute || showCancel || showBill) && !isCancelling && (
        <div className="mt-3 flex items-center gap-2">
          {showExecute && (
            <button
              onClick={handleExecute}
              disabled={executing}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-green-400 px-3 text-xs font-medium text-green-700 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950/30"
            >
              {executing ? t('actions.executing') : t('actions.execute')}
            </button>
          )}
          {showCancel && (
            <button
              onClick={() => setIsCancelling(true)}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-destructive/40 px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              {t('actions.cancel')}
            </button>
          )}
          {showBill && (
            <button
              onClick={() => onBill(request.id)}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-input px-3 text-xs font-medium transition-colors hover:bg-accent"
            >
              {t('actions.bill')}
            </button>
          )}
        </div>
      )}

      {isCancelling && (
        <form onSubmit={handleCancelSubmit} className="mt-3 space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <label className="text-xs font-medium text-foreground" htmlFor={`cancel-reason-${request.id}`}>
            {t('cancelReasonPromptLabel')} <span className="text-destructive">*</span>
          </label>
          <input
            id={`cancel-reason-${request.id}`}
            type="text"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            disabled={cancelling}
            placeholder={t('cancelReasonPlaceholder')}
            className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={cancelling}
              className="inline-flex h-7 items-center rounded-md bg-destructive px-3 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelling ? t('actions.cancelling') : t('actions.confirmCancel')}
            </button>
            <button
              type="button"
              onClick={() => { setIsCancelling(false); setCancelReason(''); setActionError(''); }}
              disabled={cancelling}
              className="h-7 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-60"
            >
              {tRoot('common.actions.cancel')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

interface Props {
  patientId: string;
}

export function MedicalServicesTab({ patientId }: Props) {
  const t = useTranslations('medicalServiceRequests');
  const tError = useTranslations('patient.detail.error');
  const tCommon = useTranslations('common');
  const { user } = useAuthStore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [billingRequestId, setBillingRequestId] = useState<string | null>(null);

  const canCreate = !!user && CREATE_ROLES.has(user.role);
  const canExecute = !!user && EXECUTE_ROLES.has(user.role);
  const canCancel = !!user && CANCEL_ROLES.has(user.role);
  const canBill = !!user && BILL_ROLES.has(user.role);

  const { data, isLoading, isError, error, refetch } = usePatientMedicalServiceRequests(patientId);
  const requests = data?.data ?? [];

  const requestBtn = canCreate && (
    <div className="flex justify-end">
      <button
        onClick={() => setIsFormOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Plus className="h-3.5 w-3.5" />
        {t('actions.request')}
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
        <p className="text-sm font-medium text-destructive">{tError('loadFailed')}</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          {error instanceof Error ? error.message : tError('occurred')}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-1 h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
        >
          {tCommon('actions.tryAgain')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requestBtn}

      {requests.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <MedicalServiceRequestCard
              key={request.id}
              request={request}
              canExecute={canExecute}
              canCancel={canCancel}
              canBill={canBill}
              onBill={setBillingRequestId}
            />
          ))}
        </div>
      )}

      {isFormOpen && (
        <MedicalServiceRequestForm patientId={patientId} onClose={() => setIsFormOpen(false)} />
      )}

      {billingRequestId && (
        <BillMedicalServiceRequestDialog
          patientId={patientId}
          requestId={billingRequestId}
          onClose={() => setBillingRequestId(null)}
        />
      )}
    </div>
  );
}
