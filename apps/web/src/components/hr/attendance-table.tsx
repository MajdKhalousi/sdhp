'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useEmployees } from '@/hooks/use-employees';
import { useDailyAttendance, useCreateAttendance, useUpdateAttendance } from '@/hooks/use-attendance';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
  type DailyAttendanceRecord,
  type CreateAttendancePayload,
  type UpdateAttendancePayload,
} from '@/types/attendance';

// Browser-local calendar date as YYYY-MM-DD — deliberately not
// new Date().toISOString().slice(0,10), which reads UTC and would show
// the wrong day for any timezone ahead/behind UTC near midnight.
function getLocalDateInputValue(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Native <input type="time"> yields "HH:mm" with no date/timezone context —
// combine with the selected calendar date as a local moment, then convert
// to the UTC ISO string the backend expects.
function combineDateAndTimeToIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

// Inverse of combineDateAndTimeToIso, for prefilling the edit form from an
// existing record's ISO timestamp — uses local getters so the round trip
// matches what the admin typed, not the UTC-stored value.
function isoToLocalTimeInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const STATUS_BADGE_VARIANT: Record<AttendanceStatus, 'success' | 'danger' | 'warning' | 'outline'> = {
  PRESENT: 'success',
  ABSENT: 'danger',
  LATE: 'warning',
  HALF_DAY: 'warning',
  ON_LEAVE: 'outline',
  HOLIDAY: 'outline',
};

interface RowFormState {
  status: AttendanceStatus;
  checkInTime: string;
  checkOutTime: string;
  notes: string;
}

const DEFAULT_FORM_STATE: RowFormState = {
  status: 'PRESENT',
  checkInTime: '',
  checkOutTime: '',
  notes: '',
};

function inputClass(): string {
  return 'w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring';
}

export function AttendanceTable() {
  const t = useTranslations('hr.attendance');
  const [date, setDate] = useState(() => getLocalDateInputValue());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<RowFormState>(DEFAULT_FORM_STATE);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  const {
    data: employees,
    isLoading: employeesLoading,
    isError: employeesError,
    error: employeesErrorObj,
    refetch: refetchEmployees,
  } = useEmployees(false);

  const {
    data: records,
    isLoading: recordsLoading,
    isError: recordsError,
    error: recordsErrorObj,
    refetch: refetchRecords,
  } = useDailyAttendance(date);

  const createMutation = useCreateAttendance();
  const updateMutation = useUpdateAttendance();

  const recordsByEmployeeId = new Map<string, DailyAttendanceRecord>();
  (records ?? []).forEach((r) => recordsByEmployeeId.set(r.employeeProfileId, r));

  function startRecording(employeeProfileId: string) {
    setEditingId(employeeProfileId);
    setFormState(DEFAULT_FORM_STATE);
    setRowError(null);
  }

  function startEditing(employeeProfileId: string, record: DailyAttendanceRecord) {
    setEditingId(employeeProfileId);
    setFormState({
      status: record.status,
      checkInTime: isoToLocalTimeInputValue(record.checkInAt),
      checkOutTime: isoToLocalTimeInputValue(record.checkOutAt),
      notes: record.notes ?? '',
    });
    setRowError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setRowError(null);
  }

  async function handleSave(employeeProfileId: string) {
    const existing = recordsByEmployeeId.get(employeeProfileId);

    try {
      if (existing) {
        // checkInAt/checkOutAt: send null (not omit) when a previously-set
        // time is cleared in the form, so the backend actually clears it —
        // omitting an unset-and-still-empty field is left as a no-op.
        const payload: UpdateAttendancePayload = {
          status: formState.status,
          notes: formState.notes,
          ...(formState.checkInTime
            ? { checkInAt: combineDateAndTimeToIso(date, formState.checkInTime) }
            : existing.checkInAt
            ? { checkInAt: null }
            : {}),
          ...(formState.checkOutTime
            ? { checkOutAt: combineDateAndTimeToIso(date, formState.checkOutTime) }
            : existing.checkOutAt
            ? { checkOutAt: null }
            : {}),
        };
        await updateMutation.mutateAsync({ employeeProfileId, recordId: existing.id, payload });
      } else {
        const payload: CreateAttendancePayload = {
          date,
          status: formState.status,
          notes: formState.notes,
          ...(formState.checkInTime ? { checkInAt: combineDateAndTimeToIso(date, formState.checkInTime) } : {}),
          ...(formState.checkOutTime ? { checkOutAt: combineDateAndTimeToIso(date, formState.checkOutTime) } : {}),
        };
        await createMutation.mutateAsync({ employeeProfileId, payload });
      }
      setEditingId(null);
      setRowError(null);
    } catch (e) {
      const isConflict = e instanceof Error && e.name === 'ConflictError';
      setRowError({ id: employeeProfileId, message: isConflict ? t('errors.conflict') : t('errors.saveFailed') });
      if (isConflict) refetchRecords();
    }
  }

  if (employeesLoading || recordsLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (employeesError || recordsError) {
    const err = employeesErrorObj ?? recordsErrorObj;
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
        <p className="text-sm font-medium text-destructive">{t('errors.loadFailed')}</p>
        <p className="text-xs text-muted-foreground">{err instanceof Error ? err.message : ''}</p>
        <button
          onClick={() => {
            refetchEmployees();
            refetchRecords();
          }}
          className="mt-1 h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
        >
          {t('errors.tryAgain')}
        </button>
      </div>
    );
  }

  const activeEmployees = employees ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-foreground" htmlFor="attendance-date">
          {t('dateLabel')}
        </label>
        <input
          id="attendance-date"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setEditingId(null);
            setRowError(null);
          }}
          className={inputClass() + ' w-auto'}
        />
        <button
          onClick={() => setDate(getLocalDateInputValue())}
          className="h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
        >
          {t('today')}
        </button>
      </div>

      {activeEmployees.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-xl border bg-card py-12 text-center">
          <p className="text-sm font-medium">{t('empty.heading')}</p>
          <p className="text-xs text-muted-foreground">{t('empty.subtext')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">{t('columns.employee')}</th>
                <th className="px-4 py-3">{t('columns.jobTitle')}</th>
                <th className="px-4 py-3">{t('columns.status')}</th>
                <th className="px-4 py-3">{t('columns.checkIn')}</th>
                <th className="px-4 py-3">{t('columns.checkOut')}</th>
                <th className="px-4 py-3">{t('columns.notes')}</th>
                <th className="px-4 py-3">{t('columns.action')}</th>
              </tr>
            </thead>
            <tbody>
              {activeEmployees.map((emp) => {
                const record = recordsByEmployeeId.get(emp.id);
                const isEditing = editingId === emp.id;
                const fullName = `${emp.firstName} ${emp.lastName}`;
                const fullNameAr = [emp.firstNameAr, emp.lastNameAr].filter(Boolean).join(' ');
                const error = rowError?.id === emp.id ? rowError.message : null;
                const saving = createMutation.isPending || updateMutation.isPending;

                return (
                  <tr key={emp.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{fullName}</p>
                      {fullNameAr && (
                        <p className="text-xs text-muted-foreground" dir="rtl">
                          {fullNameAr}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{emp.jobTitle ?? '—'}</td>

                    {isEditing ? (
                      <>
                        <td className="px-4 py-3">
                          <select
                            value={formState.status}
                            onChange={(e) =>
                              setFormState((s) => ({ ...s, status: e.target.value as AttendanceStatus }))
                            }
                            className={inputClass()}
                          >
                            {ATTENDANCE_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {t(`statuses.${s}`)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="time"
                            value={formState.checkInTime}
                            onChange={(e) => setFormState((s) => ({ ...s, checkInTime: e.target.value }))}
                            className={inputClass()}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="time"
                            value={formState.checkOutTime}
                            onChange={(e) => setFormState((s) => ({ ...s, checkOutTime: e.target.value }))}
                            className={inputClass()}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={formState.notes}
                            onChange={(e) => setFormState((s) => ({ ...s, notes: e.target.value }))}
                            className={inputClass()}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSave(emp.id)}
                                disabled={saving}
                                className="h-8 rounded-md bg-primary px-3 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                              >
                                {t('save')}
                              </button>
                              <button
                                onClick={cancelEditing}
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
                        <td className="px-4 py-3">
                          {record ? (
                            <Badge variant={STATUS_BADGE_VARIANT[record.status]}>
                              {t(`statuses.${record.status}`)}
                            </Badge>
                          ) : (
                            <Badge variant="outline">{t('notRecorded')}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {isoToLocalTimeInputValue(record?.checkInAt ?? null) || '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {isoToLocalTimeInputValue(record?.checkOutAt ?? null) || '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{record?.notes ?? '—'}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => (record ? startEditing(emp.id, record) : startRecording(emp.id))}
                            className="h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
                          >
                            {record ? t('edit') : t('record')}
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
