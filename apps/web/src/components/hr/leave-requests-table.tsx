'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useEmployees } from '@/hooks/use-employees';
import {
  useLeaveQueue,
  useCreateLeaveRequest,
  useUpdateLeaveRequest,
  useApproveLeaveRequest,
  useRejectLeaveRequest,
  useCancelLeaveRequest,
} from '@/hooks/use-leave-requests';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateDisplay } from '@/lib/format-date';
import {
  LEAVE_TYPES,
  type LeaveType,
  type LeaveStatus,
  type LeaveQueueRecord,
} from '@/types/leave';

function inputClass(): string {
  return 'w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring';
}

const STATUS_BADGE_VARIANT: Record<LeaveStatus, 'success' | 'danger' | 'warning' | 'outline'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'outline',
};

interface CreateFormState {
  employeeProfileId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

const DEFAULT_CREATE_FORM: CreateFormState = {
  employeeProfileId: '',
  type: 'ANNUAL',
  startDate: '',
  endDate: '',
  reason: '',
};

interface EditFormState {
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

type DecisionAction = 'approve' | 'reject' | 'cancel';

const NEUTRAL_BUTTON_CLASS = 'h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent';
const APPROVE_BUTTON_CLASS =
  'h-8 rounded-md border border-green-600/40 px-3 text-sm font-medium text-green-700 transition-colors hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30';
const REJECT_BUTTON_CLASS =
  'h-8 rounded-md border border-destructive/40 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10';
const CONFIRM_BUTTON_CLASS: Record<DecisionAction, string> = {
  approve: 'h-8 rounded-md bg-green-600 px-3 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50',
  reject:
    'h-8 rounded-md bg-destructive px-3 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50',
  cancel: 'h-8 rounded-md bg-primary px-3 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50',
};

export function LeaveRequestsTable() {
  const t = useTranslations('hr.leave');

  const [createForm, setCreateForm] = useState<CreateFormState>(DEFAULT_CREATE_FORM);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' });

  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decidingAction, setDecidingAction] = useState<DecisionAction | null>(null);
  const [decisionNote, setDecisionNote] = useState('');

  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  const { data: employees } = useEmployees(false);

  const {
    data: pendingQueue,
    isLoading: pendingLoading,
    isError: pendingError,
    error: pendingErrorObj,
    refetch: refetchPending,
  } = useLeaveQueue({ status: 'PENDING' });

  const {
    data: allQueue,
    isLoading: historyLoading,
    isError: historyError,
    error: historyErrorObj,
    refetch: refetchHistory,
  } = useLeaveQueue({});

  const createMutation = useCreateLeaveRequest();
  const updateMutation = useUpdateLeaveRequest();
  const approveMutation = useApproveLeaveRequest();
  const rejectMutation = useRejectLeaveRequest();
  const cancelMutation = useCancelLeaveRequest();

  const pendingRecords = pendingQueue?.data ?? [];
  // Client-side filter so the same PENDING rows aren't shown twice — the
  // history section is for requests that have already been decided.
  const historyRecords = (allQueue?.data ?? []).filter((r) => r.status !== 'PENDING');

  function resetActionState() {
    setEditingId(null);
    setDecidingId(null);
    setDecidingAction(null);
    setDecisionNote('');
    setRowError(null);
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (createForm.endDate < createForm.startDate) {
      setCreateError(t('errors.invalidDateRange'));
      return;
    }
    try {
      await createMutation.mutateAsync({
        employeeProfileId: createForm.employeeProfileId,
        payload: {
          type: createForm.type,
          startDate: createForm.startDate,
          endDate: createForm.endDate,
          ...(createForm.reason ? { reason: createForm.reason } : {}),
        },
      });
      setCreateForm(DEFAULT_CREATE_FORM);
    } catch (err) {
      const isConflict = err instanceof Error && err.name === 'ConflictError';
      setCreateError(isConflict ? t('errors.conflict') : t('errors.saveFailed'));
    }
  }

  function startEdit(record: LeaveQueueRecord) {
    resetActionState();
    setEditingId(record.id);
    setEditForm({
      type: record.type,
      startDate: record.startDate.slice(0, 10),
      endDate: record.endDate.slice(0, 10),
      reason: record.reason ?? '',
    });
  }

  async function handleEditSave(record: LeaveQueueRecord) {
    if (editForm.endDate < editForm.startDate) {
      setRowError({ id: record.id, message: t('errors.invalidDateRange') });
      return;
    }
    try {
      await updateMutation.mutateAsync({
        employeeProfileId: record.employeeProfileId,
        requestId: record.id,
        payload: {
          type: editForm.type,
          startDate: editForm.startDate,
          endDate: editForm.endDate,
          reason: editForm.reason,
        },
      });
      setEditingId(null);
      setRowError(null);
    } catch (err) {
      const isConflict = err instanceof Error && err.name === 'ConflictError';
      setRowError({ id: record.id, message: isConflict ? t('errors.conflict') : t('errors.saveFailed') });
    }
  }

  function startDecision(record: LeaveQueueRecord, action: DecisionAction) {
    resetActionState();
    setDecidingId(record.id);
    setDecidingAction(action);
  }

  async function confirmDecision(record: LeaveQueueRecord) {
    if (!decidingAction) return;
    const mutation =
      decidingAction === 'approve' ? approveMutation : decidingAction === 'reject' ? rejectMutation : cancelMutation;
    try {
      await mutation.mutateAsync({
        employeeProfileId: record.employeeProfileId,
        requestId: record.id,
        payload: decisionNote ? { decisionNote } : {},
      });
      setDecidingId(null);
      setDecidingAction(null);
      setDecisionNote('');
      setRowError(null);
    } catch {
      setRowError({ id: record.id, message: t('errors.saveFailed') });
    }
  }

  function employeeName(employeeProfile: LeaveQueueRecord['employeeProfile']) {
    const fullName = `${employeeProfile.firstName} ${employeeProfile.lastName}`;
    const fullNameAr = [employeeProfile.firstNameAr, employeeProfile.lastNameAr].filter(Boolean).join(' ');
    return { fullName, fullNameAr };
  }

  function renderRow(record: LeaveQueueRecord) {
    const isEditing = editingId === record.id;
    const isDeciding = decidingId === record.id;
    const { fullName, fullNameAr } = employeeName(record.employeeProfile);
    const error = rowError?.id === record.id ? rowError.message : null;
    const saving =
      updateMutation.isPending || approveMutation.isPending || rejectMutation.isPending || cancelMutation.isPending;

    return (
      <tr key={record.id} className="border-b last:border-0 align-top">
        <td className="px-4 py-3">
          <p className="font-medium">{fullName}</p>
          {fullNameAr && (
            <p className="text-xs text-muted-foreground" dir="rtl">
              {fullNameAr}
            </p>
          )}
        </td>

        {isEditing ? (
          <>
            <td className="px-4 py-3">
              <select
                value={editForm.type}
                onChange={(e) => setEditForm((s) => ({ ...s, type: e.target.value as LeaveType }))}
                className={inputClass()}
              >
                {LEAVE_TYPES.map((tp) => (
                  <option key={tp} value={tp}>
                    {t(`types.${tp}`)}
                  </option>
                ))}
              </select>
            </td>
            <td className="px-4 py-3">
              <div className="flex flex-col gap-1">
                <input
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm((s) => ({ ...s, startDate: e.target.value }))}
                  className={inputClass()}
                />
                <input
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm((s) => ({ ...s, endDate: e.target.value }))}
                  className={inputClass()}
                />
              </div>
            </td>
            <td className="px-4 py-3">
              <input
                type="text"
                value={editForm.reason}
                onChange={(e) => setEditForm((s) => ({ ...s, reason: e.target.value }))}
                className={inputClass()}
              />
            </td>
            <td className="px-4 py-3">
              <Badge variant={STATUS_BADGE_VARIANT[record.status]}>{t(`statuses.${record.status}`)}</Badge>
            </td>
            <td className="px-4 py-3">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditSave(record)}
                    disabled={saving}
                    className="h-8 rounded-md bg-primary px-3 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {t('save')}
                  </button>
                  <button
                    onClick={resetActionState}
                    disabled={saving}
                    className="h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    {t('cancel')}
                  </button>
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>
            </td>
          </>
        ) : (
          <>
            <td className="px-4 py-3">{t(`types.${record.type}`)}</td>
            <td className="px-4 py-3 text-muted-foreground">
              {formatDateDisplay(record.startDate)} — {formatDateDisplay(record.endDate)}
            </td>
            <td className="px-4 py-3 text-muted-foreground">
              <p>{record.reason ?? '—'}</p>
              {record.decisionNote && (
                <p className="mt-1 text-xs italic">
                  <span className="font-medium not-italic text-foreground">{t('decisionNoteLabel')}:</span>{' '}
                  {record.decisionNote}
                </p>
              )}
            </td>
            <td className="px-4 py-3">
              <Badge variant={STATUS_BADGE_VARIANT[record.status]}>{t(`statuses.${record.status}`)}</Badge>
            </td>
            <td className="px-4 py-3">
              {isDeciding ? (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder={t('decisionNote')}
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                    className={inputClass()}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => confirmDecision(record)}
                      disabled={saving}
                      className={CONFIRM_BUTTON_CLASS[decidingAction!]}
                    >
                      {t(decidingAction === 'approve' ? 'approve' : decidingAction === 'reject' ? 'reject' : 'cancelRequest')}
                    </button>
                    <button onClick={resetActionState} disabled={saving} className={NEUTRAL_BUTTON_CLASS + ' disabled:opacity-50'}>
                      {t('cancel')}
                    </button>
                  </div>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {record.status === 'PENDING' && (
                    <>
                      <button onClick={() => startEdit(record)} className={NEUTRAL_BUTTON_CLASS}>
                        {t('edit')}
                      </button>
                      <button onClick={() => startDecision(record, 'approve')} className={APPROVE_BUTTON_CLASS}>
                        {t('approve')}
                      </button>
                      <button onClick={() => startDecision(record, 'reject')} className={REJECT_BUTTON_CLASS}>
                        {t('reject')}
                      </button>
                    </>
                  )}
                  {(record.status === 'PENDING' || record.status === 'APPROVED') && (
                    <button onClick={() => startDecision(record, 'cancel')} className={NEUTRAL_BUTTON_CLASS}>
                      {t('cancelRequest')}
                    </button>
                  )}
                  {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
              )}
            </td>
          </>
        )}
      </tr>
    );
  }

  function renderTable(records: LeaveQueueRecord[]) {
    if (records.length === 0) {
      return (
        <div className="flex flex-col items-center gap-1 rounded-xl border bg-card py-10 text-center">
          <p className="text-sm font-medium">{t('empty.heading')}</p>
          <p className="text-xs text-muted-foreground">{t('empty.subtext')}</p>
        </div>
      );
    }
    return (
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">{t('employee')}</th>
              <th className="px-4 py-3">{t('type')}</th>
              <th className="px-4 py-3">{t('startDate')}</th>
              <th className="px-4 py-3">{t('reason')}</th>
              <th className="px-4 py-3">{t('status')}</th>
              <th className="px-4 py-3">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>{records.map((r) => renderRow(r))}</tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">{t('newRequest')}</h2>
        <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select
            required
            value={createForm.employeeProfileId}
            onChange={(e) => setCreateForm((s) => ({ ...s, employeeProfileId: e.target.value }))}
            className={inputClass()}
          >
            <option value="" disabled>
              {t('employee')}
            </option>
            {(employees ?? []).map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </option>
            ))}
          </select>
          <select
            value={createForm.type}
            onChange={(e) => setCreateForm((s) => ({ ...s, type: e.target.value as LeaveType }))}
            className={inputClass()}
          >
            {LEAVE_TYPES.map((tp) => (
              <option key={tp} value={tp}>
                {t(`types.${tp}`)}
              </option>
            ))}
          </select>
          <input
            required
            type="date"
            value={createForm.startDate}
            onChange={(e) => setCreateForm((s) => ({ ...s, startDate: e.target.value }))}
            className={inputClass()}
          />
          <input
            required
            type="date"
            value={createForm.endDate}
            onChange={(e) => setCreateForm((s) => ({ ...s, endDate: e.target.value }))}
            className={inputClass()}
          />
          <input
            type="text"
            placeholder={t('reason')}
            value={createForm.reason}
            onChange={(e) => setCreateForm((s) => ({ ...s, reason: e.target.value }))}
            className={inputClass()}
          />
          <div className="sm:col-span-2 lg:col-span-5">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {t('create')}
            </button>
            {createError && <p className="mt-2 text-xs text-destructive">{createError}</p>}
          </div>
        </form>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">{t('pendingRequests')}</h2>
        {pendingLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : pendingError ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-8 text-center">
            <p className="text-sm font-medium text-destructive">{t('errors.loadFailed')}</p>
            <p className="text-xs text-muted-foreground">{pendingErrorObj instanceof Error ? pendingErrorObj.message : ''}</p>
            <button onClick={() => refetchPending()} className="h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent">
              {t('errors.tryAgain')}
            </button>
          </div>
        ) : (
          renderTable(pendingRecords)
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">{t('recentRequests')}</h2>
        {historyLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : historyError ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-8 text-center">
            <p className="text-sm font-medium text-destructive">{t('errors.loadFailed')}</p>
            <p className="text-xs text-muted-foreground">{historyErrorObj instanceof Error ? historyErrorObj.message : ''}</p>
            <button onClick={() => refetchHistory()} className="h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent">
              {t('errors.tryAgain')}
            </button>
          </div>
        ) : (
          renderTable(historyRecords)
        )}
      </div>
    </div>
  );
}
