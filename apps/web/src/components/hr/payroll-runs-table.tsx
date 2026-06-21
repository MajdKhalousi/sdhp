'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  usePayrollRuns,
  usePayrollRun,
  useCreatePayrollRun,
  useUpdatePayrollLine,
  useApprovePayrollRun,
  useMarkPayrollRunPaid,
  useCancelPayrollRun,
} from '@/hooks/use-payroll';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateDisplay } from '@/lib/format-date';
import type { PayrollRun, PayrollRunStatus, PayrollLine } from '@/types/payroll';

function inputClass(): string {
  return 'w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring';
}

const STATUS_BADGE_VARIANT: Record<PayrollRunStatus, 'success' | 'danger' | 'warning' | 'outline'> = {
  DRAFT: 'outline',
  APPROVED: 'warning',
  PAID: 'success',
  CANCELLED: 'danger',
};

// Deliberately local, not the shared formatAmount (format-currency.ts), which
// hardcodes a "SYP" suffix — payroll lines can be snapshotted in any
// currency the employee's profile used at generation time.
function formatMoney(value: string | number, currency: string, locale: string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  return `${new Intl.NumberFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)} ${currency}`;
}

function periodLabel(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

interface LineEditState {
  additions: string;
  deductions: string;
  notes: string;
}

const DEFAULT_LINE_EDIT: LineEditState = { additions: '0', deductions: '0', notes: '' };

const now = new Date();

export function PayrollRunsTable() {
  const t = useTranslations('hr.payroll');
  const locale = useLocale();

  const [genYear, setGenYear] = useState(now.getFullYear());
  const [genMonth, setGenMonth] = useState(now.getMonth() + 1);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [lineEditForm, setLineEditForm] = useState<LineEditState>(DEFAULT_LINE_EDIT);
  const [lineError, setLineError] = useState<string | null>(null);

  const [cancelingRun, setCancelingRun] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [runActionError, setRunActionError] = useState<string | null>(null);

  const {
    data: runsResult,
    isLoading: runsLoading,
    isError: runsError,
    error: runsErrorObj,
    refetch: refetchRuns,
  } = usePayrollRuns();

  const {
    data: selectedRun,
    isLoading: runLoading,
    isError: runError,
    refetch: refetchRun,
  } = usePayrollRun(selectedRunId);

  const createMutation = useCreatePayrollRun();
  const updateLineMutation = useUpdatePayrollLine();
  const approveMutation = useApprovePayrollRun();
  const markPaidMutation = useMarkPayrollRunPaid();
  const cancelMutation = useCancelPayrollRun();

  const runs = runsResult?.data ?? [];

  function resetLineEditState() {
    setEditingLineId(null);
    setLineError(null);
  }

  function resetRunActionState() {
    setCancelingRun(false);
    setCancelReason('');
    setRunActionError(null);
  }

  function selectRun(id: string) {
    setSelectedRunId(id);
    resetLineEditState();
    resetRunActionState();
  }

  async function handleGenerate() {
    setGenerateError(null);
    try {
      const result = await createMutation.mutateAsync({ year: genYear, month: genMonth });
      selectRun(result.id);
    } catch (e) {
      if (e instanceof Error && e.name === 'ConflictError') {
        setGenerateError(t('errors.duplicateMonth'));
      } else if (e instanceof Error && e.message.includes('missing a base salary')) {
        setGenerateError(t('errors.missingBaseSalary'));
      } else {
        setGenerateError(t('errors.generateFailed'));
      }
    }
  }

  function startLineEdit(line: PayrollLine) {
    resetRunActionState();
    setEditingLineId(line.id);
    setLineEditForm({ additions: line.additions, deductions: line.deductions, notes: line.notes ?? '' });
    setLineError(null);
  }

  async function saveLineEdit(runId: string, lineId: string) {
    try {
      await updateLineMutation.mutateAsync({
        runId,
        lineId,
        payload: {
          additions: Number(lineEditForm.additions) || 0,
          deductions: Number(lineEditForm.deductions) || 0,
          notes: lineEditForm.notes,
        },
      });
      resetLineEditState();
    } catch {
      setLineError(t('errors.saveFailed'));
    }
  }

  async function handleApprove(runId: string) {
    setRunActionError(null);
    try {
      await approveMutation.mutateAsync(runId);
    } catch {
      setRunActionError(t('errors.saveFailed'));
    }
  }

  async function handleMarkPaid(runId: string) {
    setRunActionError(null);
    try {
      await markPaidMutation.mutateAsync(runId);
    } catch {
      setRunActionError(t('errors.saveFailed'));
    }
  }

  async function handleCancel(runId: string) {
    try {
      await cancelMutation.mutateAsync({ runId, payload: cancelReason ? { cancelReason } : {} });
      resetRunActionState();
    } catch {
      setRunActionError(t('errors.saveFailed'));
    }
  }

  const lines = selectedRun?.lines ?? [];
  const totalsByCurrency = lines.reduce<Record<string, number>>((acc, line) => {
    acc[line.currencySnapshot] = (acc[line.currencySnapshot] ?? 0) + Number(line.netSalary);
    return acc;
  }, {});

  const runMutating = approveMutation.isPending || markPaidMutation.isPending || cancelMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">{t('generate')}</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('yearLabel')}</label>
            <input
              type="number"
              min={2000}
              max={2100}
              value={genYear}
              onChange={(e) => setGenYear(Number(e.target.value))}
              className={inputClass() + ' w-28'}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('monthLabel')}</label>
            <input
              type="number"
              min={1}
              max={12}
              value={genMonth}
              onChange={(e) => setGenMonth(Number(e.target.value))}
              className={inputClass() + ' w-20'}
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={createMutation.isPending}
            className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {t('generate')}
          </button>
        </div>
        {generateError && <p className="mt-2 text-xs text-destructive">{generateError}</p>}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">{t('runsHeading')}</h2>
        {runsLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : runsError ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-8 text-center">
            <p className="text-sm font-medium text-destructive">{t('errors.loadFailed')}</p>
            <p className="text-xs text-muted-foreground">{runsErrorObj instanceof Error ? runsErrorObj.message : ''}</p>
            <button onClick={() => refetchRuns()} className="h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent">
              {t('errors.tryAgain')}
            </button>
          </div>
        ) : runs.length === 0 ? (
          <div className="flex flex-col items-center gap-1 rounded-xl border bg-card py-10 text-center">
            <p className="text-sm font-medium">{t('empty.heading')}</p>
            <p className="text-xs text-muted-foreground">{t('empty.subtext')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">{t('columns.period')}</th>
                  <th className="px-4 py-3">{t('columns.status')}</th>
                  <th className="px-4 py-3">{t('columns.lineCount')}</th>
                  <th className="px-4 py-3">{t('columns.generatedAt')}</th>
                  <th className="px-4 py-3">{t('columns.action')}</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run: PayrollRun) => (
                  <tr
                    key={run.id}
                    className={`border-b last:border-0 ${selectedRunId === run.id ? 'bg-accent/50' : ''}`}
                  >
                    <td className="px-4 py-3 font-medium">{periodLabel(run.year, run.month)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE_VARIANT[run.status]}>{t(`statuses.${run.status}`)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{run._count?.lines ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                      {formatDateDisplay(run.generatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => selectRun(run.id)}
                        className="h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
                      >
                        {t('view')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRunId && (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              {t('linesHeading')} — {selectedRun ? periodLabel(selectedRun.year, selectedRun.month) : ''}
            </h2>
            {selectedRun && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={STATUS_BADGE_VARIANT[selectedRun.status]}>{t(`statuses.${selectedRun.status}`)}</Badge>
                {selectedRun.status === 'DRAFT' && (
                  <button
                    onClick={() => handleApprove(selectedRun.id)}
                    disabled={runMutating}
                    className="h-8 rounded-md border border-green-600/40 px-3 text-sm font-medium text-green-700 transition-colors hover:bg-green-50 disabled:opacity-50 dark:text-green-400 dark:hover:bg-green-950/30"
                  >
                    {t('approve')}
                  </button>
                )}
                {selectedRun.status === 'APPROVED' && (
                  <button
                    onClick={() => handleMarkPaid(selectedRun.id)}
                    disabled={runMutating}
                    className="h-8 rounded-md border border-green-600/40 px-3 text-sm font-medium text-green-700 transition-colors hover:bg-green-50 disabled:opacity-50 dark:text-green-400 dark:hover:bg-green-950/30"
                  >
                    {t('markPaid')}
                  </button>
                )}
                {(selectedRun.status === 'DRAFT' || selectedRun.status === 'APPROVED') && !cancelingRun && (
                  <button
                    onClick={() => {
                      resetLineEditState();
                      setCancelingRun(true);
                    }}
                    disabled={runMutating}
                    className="h-8 rounded-md border border-destructive/40 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                  >
                    {t('cancelRun')}
                  </button>
                )}
              </div>
            )}
          </div>

          {cancelingRun && selectedRun && (
            <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <input
                type="text"
                placeholder={t('cancelReasonPlaceholder')}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className={inputClass()}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleCancel(selectedRun.id)}
                  disabled={runMutating}
                  className="h-8 rounded-md bg-destructive px-3 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
                >
                  {t('cancelRun')}
                </button>
                <button
                  onClick={resetRunActionState}
                  disabled={runMutating}
                  className="h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          )}
          {runActionError && <p className="text-xs text-destructive">{runActionError}</p>}

          {runLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : runError ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-8 text-center">
              <p className="text-sm font-medium text-destructive">{t('errors.loadFailed')}</p>
              <button onClick={() => refetchRun()} className="h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent">
                {t('errors.tryAgain')}
              </button>
            </div>
          ) : lines.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('linesEmpty')}</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3">{t('lineColumns.employee')}</th>
                      <th className="px-4 py-3">{t('lineColumns.baseSalary')}</th>
                      <th className="px-4 py-3">{t('lineColumns.additions')}</th>
                      <th className="px-4 py-3">{t('lineColumns.deductions')}</th>
                      <th className="px-4 py-3">{t('lineColumns.netSalary')}</th>
                      <th className="px-4 py-3">{t('lineColumns.notes')}</th>
                      <th className="px-4 py-3">{t('lineColumns.action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => {
                      const isEditing = editingLineId === line.id;
                      const fullName = `${line.employeeProfile.firstName} ${line.employeeProfile.lastName}`;
                      const fullNameAr = [line.employeeProfile.firstNameAr, line.employeeProfile.lastNameAr]
                        .filter(Boolean)
                        .join(' ');
                      const canEdit = selectedRun?.status === 'DRAFT';

                      return (
                        <tr key={line.id} className="border-b last:border-0 align-top">
                          <td className="px-4 py-3">
                            <p className="font-medium">{fullName}</p>
                            {fullNameAr && (
                              <p className="text-xs text-muted-foreground" dir="rtl">
                                {fullNameAr}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                            {formatMoney(line.baseSalarySnapshot, line.currencySnapshot, locale)}
                          </td>

                          {isEditing ? (
                            <>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={lineEditForm.additions}
                                  onChange={(e) => setLineEditForm((s) => ({ ...s, additions: e.target.value }))}
                                  className={inputClass()}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={lineEditForm.deductions}
                                  onChange={(e) => setLineEditForm((s) => ({ ...s, deductions: e.target.value }))}
                                  className={inputClass()}
                                />
                              </td>
                              <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                                {formatMoney(line.netSalary, line.currencySnapshot, locale)}
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={lineEditForm.notes}
                                  onChange={(e) => setLineEditForm((s) => ({ ...s, notes: e.target.value }))}
                                  className={inputClass()}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col gap-2">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => saveLineEdit(line.payrollRunId, line.id)}
                                      disabled={updateLineMutation.isPending}
                                      className="h-8 rounded-md bg-primary px-3 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                                    >
                                      {t('save')}
                                    </button>
                                    <button
                                      onClick={resetLineEditState}
                                      disabled={updateLineMutation.isPending}
                                      className="h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent disabled:opacity-50"
                                    >
                                      {t('cancel')}
                                    </button>
                                  </div>
                                  {lineError && <p className="text-xs text-destructive">{lineError}</p>}
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                                {formatMoney(line.additions, line.currencySnapshot, locale)}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                                {formatMoney(line.deductions, line.currencySnapshot, locale)}
                              </td>
                              <td className="px-4 py-3 font-medium" dir="ltr">
                                {formatMoney(line.netSalary, line.currencySnapshot, locale)}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{line.notes ?? '—'}</td>
                              <td className="px-4 py-3">
                                {canEdit ? (
                                  <button
                                    onClick={() => startLineEdit(line)}
                                    className="h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
                                  >
                                    {t('edit')}
                                  </button>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Per-currency totals only — never a single combined sum across
                  different currencySnapshot values (Phase 148A decision). */}
              <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/30 px-4 py-2 text-sm">
                <span className="font-medium">{t('totalsHeading')}:</span>
                {Object.entries(totalsByCurrency).map(([currency, total]) => (
                  <span key={currency} dir="ltr">
                    {formatMoney(total, currency, locale)}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
