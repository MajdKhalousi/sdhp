'use client';

import { useState } from 'react';
import { RefreshCw, ClipboardList, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuthStore } from '@/store/auth';
import {
  useMedicalServiceRequestsWorklist,
  useExecuteMedicalServiceRequest,
  useCancelMedicalServiceRequest,
  type MedicalServiceRequest,
  type ServiceExecutionStatus,
} from '@/hooks/use-medical-service-requests';
import { useServicesList } from '@/hooks/use-invoices';
import { useDoctorsList } from '@/hooks/use-appointments';
import { useBranches } from '@/hooks/use-branches';
import { useOrganizations } from '@/hooks/use-organizations';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTimeDisplay } from '@/lib/format-date';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-messages';

type ViewMode = 'active' | 'completed' | 'cancelled';

const ACTIVE_STATUSES: ServiceExecutionStatus[] = ['REQUESTED', 'IN_PROGRESS'];

const EXECUTE_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR', 'NURSE', 'TECHNICIAN']);
const CANCEL_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR', 'SECRETARY']);
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

// Damascus-aware today string — returns YYYY-MM-DD in Asia/Damascus timezone
function todayDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Damascus' });
}

interface RowProps {
  request: MedicalServiceRequest;
  canExecute: boolean;
  canCancel: boolean;
}

function MedicalServiceRequestRow({ request, canExecute, canCancel }: RowProps) {
  const t = useTranslations('medicalServicesQueue');
  const tRoot = useTranslations();

  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionError, setActionError] = useState('');

  const { mutate: execute, isPending: executing } = useExecuteMedicalServiceRequest();
  const { mutate: cancel, isPending: cancelling } = useCancelMedicalServiceRequest();

  const isTransitionable = TRANSITIONABLE_STATUSES.has(request.executionStatus);
  const showExecute = canExecute && isTransitionable;
  const showCancel = canCancel && isTransitionable;

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
        onSuccess: () => { setIsCancelling(false); setCancelReason(''); },
        onError: (e) => setActionError(getFriendlyApiErrorMessage(e, tRoot)),
      },
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm text-foreground">{request.requestedServiceName}</p>
          <Link
            href={`/dashboard/patients/${request.patientId}?tab=medical-services`}
            className="mt-0.5 inline-block text-xs text-primary hover:underline"
          >
            {request.patient.firstName} {request.patient.lastName}
            <span className="ms-1 font-mono text-muted-foreground" dir="ltr">{request.patient.mrn}</span>
          </Link>
        </div>
        <span className="text-xs text-muted-foreground" dir="ltr">
          {formatDateTimeDisplay(request.createdAt)}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge variant={EXECUTION_STATUS_VARIANT[request.executionStatus]}>
          {t(`executionStatus.${request.executionStatus}` as Parameters<typeof t>[0])}
        </Badge>
        <PaymentStatusBadge status={request.paymentStatus} />
      </div>

      <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
        <p>{t('requestedBy')}: {requestedByName}</p>
        {doctorName && <p>{t('doctor')}: {doctorName}</p>}
        {request.cancelReason && (
          <p className="text-destructive">{t('cancelReasonLabel')}: {request.cancelReason}</p>
        )}
      </div>

      {actionError && <p className="mt-2 text-xs text-destructive">{actionError}</p>}

      {(showExecute || showCancel) && !isCancelling && (
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

export function MedicalServicesQueuePanel() {
  const t = useTranslations('medicalServicesQueue');
  const tCommon = useTranslations('common');
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [from, setFrom] = useState(todayDateString);
  const [to, setTo] = useState(todayDateString);
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [patientSearch, setPatientSearch] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [page, setPage] = useState(1);

  const todayStr = todayDateString();
  const fromIso = from ? new Date(from + 'T00:00:00').toISOString() : undefined;
  const toIso = to ? new Date(to + 'T23:59:59').toISOString() : undefined;

  const { data: servicesData } = useServicesList();
  const { data: doctorsData } = useDoctorsList();
  const { data: branchesData } = useBranches();
  const { data: organizationsData } = useOrganizations();

  const { data, isLoading, isError, error, refetch, isFetching } = useMedicalServiceRequestsWorklist({
    ...(fromIso ? { from: fromIso } : {}),
    ...(toIso ? { to: toIso } : {}),
    ...(serviceId ? { serviceId } : {}),
    ...(doctorId ? { doctorId } : {}),
    ...(branchId ? { branchId } : {}),
    ...(isSuperAdmin && organizationId ? { organizationId } : {}),
    page,
    limit: 100,
  });

  const allRequests = data?.data ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 100;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const canExecute = !!user && EXECUTE_ROLES.has(user.role);
  const canCancel = !!user && CANCEL_ROLES.has(user.role);

  // Patient search (case-insensitive, firstName + lastName + MRN)
  const searchLower = patientSearch.toLowerCase();
  const searchFiltered = patientSearch
    ? allRequests.filter((r) =>
        r.patient.firstName.toLowerCase().includes(searchLower) ||
        r.patient.lastName.toLowerCase().includes(searchLower) ||
        r.patient.mrn.toLowerCase().includes(searchLower),
      )
    : allRequests;

  const activeStatuses: readonly ServiceExecutionStatus[] =
    viewMode === 'active' ? ACTIVE_STATUSES : viewMode === 'completed' ? ['COMPLETED'] : ['CANCELLED'];
  const visibleRequests = searchFiltered.filter((r) => activeStatuses.includes(r.executionStatus));

  const statusCounts = {
    REQUESTED: allRequests.filter((r) => r.executionStatus === 'REQUESTED').length,
    IN_PROGRESS: allRequests.filter((r) => r.executionStatus === 'IN_PROGRESS').length,
    COMPLETED: allRequests.filter((r) => r.executionStatus === 'COMPLETED').length,
    CANCELLED: allRequests.filter((r) => r.executionStatus === 'CANCELLED').length,
  };

  function resetPageAnd<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setPage(1); };
  }

  const header = (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-sm font-semibold">{t('panelTitle')}</h2>
        <p className="text-xs text-muted-foreground">{t('autoRefresh')}</p>
      </div>
      <button
        onClick={() => refetch()}
        disabled={isFetching}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent disabled:opacity-40"
        aria-label={t('refreshLabel')}
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );

  const filterRow = (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border bg-muted/30 p-0.5">
          {(['active', 'completed', 'cancelled'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => { setViewMode(mode); setPage(1); }}
              className={`h-7 rounded-md px-3 text-xs font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(`filter.${mode}`)}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[160px]">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            placeholder={t('filter.searchPlaceholder')}
            className="h-7 w-full rounded-md border bg-background ps-7 pe-3 text-xs outline-none transition-colors focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="whitespace-nowrap text-xs text-muted-foreground">{t('filter.from')}</span>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            dir="ltr"
            className="h-8 w-36 rounded-md border bg-background px-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="whitespace-nowrap text-xs text-muted-foreground">{t('filter.to')}</span>
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            dir="ltr"
            className="h-8 w-36 rounded-md border bg-background px-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
          />
        </div>
        {(from !== todayStr || to !== todayStr) && (
          <button
            onClick={() => { setFrom(todayStr); setTo(todayStr); setPage(1); }}
            className="h-8 rounded-md border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {t('filter.today')}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={serviceId}
          onChange={(e) => resetPageAnd(setServiceId)(e.target.value)}
          className="h-8 rounded-md border bg-background px-2 text-xs outline-none transition-colors focus:ring-2 focus:ring-ring"
        >
          <option value="">{t('filter.allServices')}</option>
          {(servicesData ?? []).filter((s) => s.isActive).map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select
          value={doctorId}
          onChange={(e) => resetPageAnd(setDoctorId)(e.target.value)}
          className="h-8 rounded-md border bg-background px-2 text-xs outline-none transition-colors focus:ring-2 focus:ring-ring"
        >
          <option value="">{t('filter.allDoctors')}</option>
          {(doctorsData?.data ?? []).filter((d) => d.isActive !== false).map((d) => (
            <option key={d.id} value={d.id}>{d.user.firstName} {d.user.lastName}</option>
          ))}
        </select>

        <select
          value={branchId}
          onChange={(e) => resetPageAnd(setBranchId)(e.target.value)}
          className="h-8 rounded-md border bg-background px-2 text-xs outline-none transition-colors focus:ring-2 focus:ring-ring"
        >
          <option value="">{t('filter.allBranches')}</option>
          {(branchesData ?? []).map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        {isSuperAdmin && (
          <select
            value={organizationId}
            onChange={(e) => resetPageAnd(setOrganizationId)(e.target.value)}
            className="h-8 rounded-md border bg-background px-2 text-xs outline-none transition-colors focus:ring-2 focus:ring-ring"
          >
            <option value="">{t('filter.allOrganizations')}</option>
            {(organizationsData ?? []).map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );

  const countItems = [
    { key: 'requested', count: statusCounts.REQUESTED, label: t('statusCounts.requested', { count: statusCounts.REQUESTED }) },
    { key: 'inProgress', count: statusCounts.IN_PROGRESS, label: t('statusCounts.inProgress', { count: statusCounts.IN_PROGRESS }) },
    { key: 'completed', count: statusCounts.COMPLETED, label: t('statusCounts.completed', { count: statusCounts.COMPLETED }) },
    { key: 'cancelled', count: statusCounts.CANCELLED, label: t('statusCounts.cancelled', { count: statusCounts.CANCELLED }) },
  ].filter((item) => item.count > 0);

  const countRow = !isLoading && !isError && countItems.length > 0 ? (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-muted/40 px-3 py-2">
      {countItems.map((item, idx) => (
        <span key={item.key} className="flex items-center gap-3">
          {idx > 0 && <span className="text-xs text-muted-foreground/40">·</span>}
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </span>
      ))}
    </div>
  ) : null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {header}
        {filterRow}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        {header}
        {filterRow}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
          <p className="text-sm font-medium text-destructive">{t('error.loadFailed')}</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            {error instanceof Error ? error.message : t('error.occurred')}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-1 h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
          >
            {tCommon('actions.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  if (visibleRequests.length === 0) {
    return (
      <div className="space-y-4">
        {header}
        {filterRow}
        {countRow}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">{t('empty.title')}</p>
          <p className="text-xs text-muted-foreground">{t('empty.subtitle')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}
      {filterRow}
      {countRow}
      <div className="space-y-3">
        {visibleRequests.map((request) => (
          <MedicalServiceRequestRow
            key={request.id}
            request={request}
            canExecute={canExecute}
            canCancel={canCancel}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{t('counter', { count: visibleRequests.length })}</p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-7 rounded-md border px-2 text-xs transition-colors hover:bg-accent disabled:opacity-40"
            >
              {t('pagination.prev')}
            </button>
            <span className="text-xs text-muted-foreground">{t('pagination.pageOf', { page, totalPages })}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-7 rounded-md border px-2 text-xs transition-colors hover:bg-accent disabled:opacity-40"
            >
              {t('pagination.next')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
