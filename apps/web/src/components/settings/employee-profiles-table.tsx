'use client';

import { useState, useEffect, Fragment } from 'react';
import { Plus, Pencil, UserX, Users, RotateCcw, Eye } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useRestoreEmployee,
} from '@/hooks/use-employees';
import { useStaff } from '@/hooks/use-staff';
import { useBranches } from '@/hooks/use-branches';
import { useDepartments } from '@/hooks/use-departments';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatAmount } from '@/lib/format-currency';
import {
  EMPLOYMENT_STATUSES,
  EMPLOYEE_GENDERS,
  type EmployeeProfile,
  type CreateEmployeeDto,
  type UpdateEmployeeDto,
  type EmploymentStatus,
  type EmployeeGender,
} from '@/types/employee';

// ─── Field helpers — mirrors the established settings table form styling ──────

function inputClass(hasError?: boolean): string {
  const base =
    'w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2';
  return hasError
    ? `${base} border-destructive focus:ring-destructive/50`
    : `${base} border-input focus:ring-ring`;
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1 block text-sm font-medium text-foreground">
      {children}
      {required && <span className="ms-1 text-destructive">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Employee Profile Form ─────────────────────────────────────────────────────

interface FormState {
  firstName: string;
  lastName: string;
  firstNameAr: string;
  lastNameAr: string;
  phone: string;
  email: string;
  nationalId: string;
  dateOfBirth: string;
  gender: '' | EmployeeGender;
  address: string;
  jobTitle: string;
  departmentFreeText: string;
  branchId: string;
  departmentId: string;
  hireDate: string;
  contractStartAt: string;
  contractEndAt: string;
  employmentStatus: EmploymentStatus;
  baseSalary: string;
  currency: string;
  notes: string;
  userId: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  baseSalary?: string;
}

function toDateInputValue(value: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function initialFormState(initial?: EmployeeProfile): FormState {
  return {
    firstName: initial?.firstName ?? '',
    lastName: initial?.lastName ?? '',
    firstNameAr: initial?.firstNameAr ?? '',
    lastNameAr: initial?.lastNameAr ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    nationalId: initial?.nationalId ?? '',
    dateOfBirth: toDateInputValue(initial?.dateOfBirth ?? null),
    gender: initial?.gender ?? '',
    address: initial?.address ?? '',
    jobTitle: initial?.jobTitle ?? '',
    departmentFreeText: initial?.departmentFreeText ?? '',
    branchId: initial?.branchId ?? '',
    departmentId: initial?.departmentId ?? '',
    hireDate: toDateInputValue(initial?.hireDate ?? null),
    contractStartAt: toDateInputValue(initial?.contractStartAt ?? null),
    contractEndAt: toDateInputValue(initial?.contractEndAt ?? null),
    employmentStatus: initial?.employmentStatus ?? 'ACTIVE',
    baseSalary: initial?.baseSalary ?? '',
    currency: initial?.currency ?? 'SYP',
    notes: initial?.notes ?? '',
    userId: initial?.userId ?? '',
  };
}

interface EmployeeFormProps {
  mode: 'create' | 'edit';
  initial?: EmployeeProfile;
  onDone: () => void;
}

function EmployeeForm({ mode, initial, onDone }: EmployeeFormProps) {
  const t = useTranslations('settings.employees');
  const tCommon = useTranslations('common');
  const create = useCreateEmployee();
  const update = useUpdateEmployee();
  const { data: staff } = useStaff(false);
  const { data: branches } = useBranches();
  const { data: departments } = useDepartments();

  const [values, setValues] = useState<FormState>(initialFormState(initial));
  const [errors, setErrors] = useState<FormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  function set(field: keyof FormState, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSaveError(null);
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!values.firstName.trim()) errs.firstName = t('form.validation.firstNameRequired');
    if (!values.lastName.trim()) errs.lastName = t('form.validation.lastNameRequired');
    if (values.email.trim() && !EMAIL_RE.test(values.email.trim())) {
      errs.email = t('form.validation.emailFormat');
    }
    if (values.baseSalary.trim() && (isNaN(Number(values.baseSalary)) || Number(values.baseSalary) < 0)) {
      errs.baseSalary = t('form.validation.baseSalaryFormat');
    }
    return errs;
  }

  function buildDto(): CreateEmployeeDto | UpdateEmployeeDto {
    const dto: CreateEmployeeDto = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      firstNameAr: values.firstNameAr.trim() || undefined,
      lastNameAr: values.lastNameAr.trim() || undefined,
      phone: values.phone.trim() || undefined,
      email: values.email.trim() || undefined,
      nationalId: values.nationalId.trim() || undefined,
      dateOfBirth: values.dateOfBirth || undefined,
      gender: values.gender || undefined,
      address: values.address.trim() || undefined,
      jobTitle: values.jobTitle.trim() || undefined,
      departmentFreeText: values.departmentFreeText.trim() || undefined,
      branchId: values.branchId || undefined,
      departmentId: values.departmentId || undefined,
      hireDate: values.hireDate || undefined,
      contractStartAt: values.contractStartAt || undefined,
      contractEndAt: values.contractEndAt || undefined,
      employmentStatus: values.employmentStatus || undefined,
      baseSalary: values.baseSalary.trim() ? Number(values.baseSalary) : undefined,
      currency: values.currency.trim() || undefined,
      notes: values.notes.trim() || undefined,
    };

    if (mode === 'create') {
      if (values.userId) dto.userId = values.userId;
    } else {
      dto.userId = values.userId || null;
    }

    return dto;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaveError(null);
    try {
      const dto = buildDto();
      if (mode === 'create') {
        await create.mutateAsync(dto as CreateEmployeeDto);
      } else if (initial) {
        await update.mutateAsync({ id: initial.id, dto });
      }
      onDone();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('error.saveFailed'));
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <FieldLabel required>{t('form.fields.firstName')}</FieldLabel>
          <input type="text" value={values.firstName} onChange={(e) => set('firstName', e.target.value)}
            className={inputClass(!!errors.firstName)} disabled={isPending} />
          <FieldError message={errors.firstName} />
        </div>
        <div>
          <FieldLabel required>{t('form.fields.lastName')}</FieldLabel>
          <input type="text" value={values.lastName} onChange={(e) => set('lastName', e.target.value)}
            className={inputClass(!!errors.lastName)} disabled={isPending} />
          <FieldError message={errors.lastName} />
        </div>
        <div>
          <FieldLabel>{t('form.fields.firstNameAr')}</FieldLabel>
          <input type="text" value={values.firstNameAr} onChange={(e) => set('firstNameAr', e.target.value)}
            className={inputClass()} disabled={isPending} dir="rtl" />
        </div>
        <div>
          <FieldLabel>{t('form.fields.lastNameAr')}</FieldLabel>
          <input type="text" value={values.lastNameAr} onChange={(e) => set('lastNameAr', e.target.value)}
            className={inputClass()} disabled={isPending} dir="rtl" />
        </div>

        <div>
          <FieldLabel>{t('form.fields.phone')}</FieldLabel>
          <input type="tel" value={values.phone} onChange={(e) => set('phone', e.target.value)}
            className={inputClass()} disabled={isPending} dir="ltr" />
        </div>
        <div>
          <FieldLabel>{t('form.fields.email')}</FieldLabel>
          <input type="email" value={values.email} onChange={(e) => set('email', e.target.value)}
            className={inputClass(!!errors.email)} disabled={isPending} dir="ltr" />
          <FieldError message={errors.email} />
        </div>
        <div>
          <FieldLabel>{t('form.fields.nationalId')}</FieldLabel>
          <input type="text" value={values.nationalId} onChange={(e) => set('nationalId', e.target.value)}
            className={inputClass()} disabled={isPending} dir="ltr" />
        </div>
        <div>
          <FieldLabel>{t('form.fields.dateOfBirth')}</FieldLabel>
          <input type="date" value={values.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)}
            className={inputClass()} disabled={isPending} dir="ltr" />
        </div>

        <div>
          <FieldLabel>{t('form.fields.gender')}</FieldLabel>
          <select value={values.gender} onChange={(e) => set('gender', e.target.value)}
            className={inputClass()} disabled={isPending}>
            <option value="">—</option>
            {EMPLOYEE_GENDERS.map((g) => (
              <option key={g} value={g}>{t(`form.genderOptions.${g}`)}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <FieldLabel>{t('form.fields.address')}</FieldLabel>
          <input type="text" value={values.address} onChange={(e) => set('address', e.target.value)}
            className={inputClass()} disabled={isPending} />
        </div>

        <div>
          <FieldLabel>{t('form.fields.jobTitle')}</FieldLabel>
          <input type="text" value={values.jobTitle} onChange={(e) => set('jobTitle', e.target.value)}
            className={inputClass()} disabled={isPending} />
        </div>
        <div>
          <FieldLabel>{t('form.fields.departmentFreeText')}</FieldLabel>
          <input type="text" value={values.departmentFreeText} onChange={(e) => set('departmentFreeText', e.target.value)}
            className={inputClass()} disabled={isPending} placeholder={t('form.placeholders.departmentFreeText')} />
        </div>
        <div>
          <FieldLabel>{t('form.fields.branchId')}</FieldLabel>
          <select value={values.branchId} onChange={(e) => set('branchId', e.target.value)}
            className={inputClass()} disabled={isPending}>
            <option value="">—</option>
            {(branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>{t('form.fields.departmentId')}</FieldLabel>
          <select value={values.departmentId} onChange={(e) => set('departmentId', e.target.value)}
            className={inputClass()} disabled={isPending}>
            <option value="">—</option>
            {(departments ?? []).map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>{t('form.fields.hireDate')}</FieldLabel>
          <input type="date" value={values.hireDate} onChange={(e) => set('hireDate', e.target.value)}
            className={inputClass()} disabled={isPending} dir="ltr" />
        </div>
        <div>
          <FieldLabel>{t('form.fields.contractStartAt')}</FieldLabel>
          <input type="date" value={values.contractStartAt} onChange={(e) => set('contractStartAt', e.target.value)}
            className={inputClass()} disabled={isPending} dir="ltr" />
        </div>
        <div>
          <FieldLabel>{t('form.fields.contractEndAt')}</FieldLabel>
          <input type="date" value={values.contractEndAt} onChange={(e) => set('contractEndAt', e.target.value)}
            className={inputClass()} disabled={isPending} dir="ltr" />
        </div>
        <div>
          <FieldLabel>{t('form.fields.employmentStatus')}</FieldLabel>
          <select value={values.employmentStatus} onChange={(e) => set('employmentStatus', e.target.value)}
            className={inputClass()} disabled={isPending}>
            {EMPLOYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>{t(`form.employmentStatusOptions.${s}`)}</option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>{t('form.fields.baseSalary')}</FieldLabel>
          <input type="number" min={0} step="any" value={values.baseSalary} onChange={(e) => set('baseSalary', e.target.value)}
            className={inputClass(!!errors.baseSalary)} disabled={isPending} dir="ltr" />
          <FieldError message={errors.baseSalary} />
        </div>
        <div>
          <FieldLabel>{t('form.fields.currency')}</FieldLabel>
          <input type="text" value={values.currency} onChange={(e) => set('currency', e.target.value)}
            className={inputClass()} disabled={isPending} dir="ltr" />
        </div>

        <div className="sm:col-span-2 lg:col-span-4">
          <FieldLabel>{t('form.fields.userId')}</FieldLabel>
          <select value={values.userId} onChange={(e) => set('userId', e.target.value)}
            className={inputClass()} disabled={isPending}>
            <option value="">{t('form.noLoginAccount')}</option>
            {(staff ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName} ({u.phone}){!u.isActive ? ` — ${t('form.inactiveSuffix')}` : ''}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">{t('form.userIdHelp')}</p>
        </div>

        <div className="sm:col-span-2 lg:col-span-4">
          <FieldLabel>{t('form.fields.notes')}</FieldLabel>
          <textarea rows={2} value={values.notes} onChange={(e) => set('notes', e.target.value)}
            className={inputClass()} disabled={isPending} />
        </div>
      </div>

      {saveError && <p className="text-sm text-destructive">{saveError}</p>}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={isPending}
          className="h-8 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50">
          {isPending
            ? (mode === 'create' ? t('form.actions.creating') : t('form.actions.saving'))
            : (mode === 'create' ? t('form.actions.create') : t('form.actions.save'))}
        </button>
        <button type="button" onClick={onDone} disabled={isPending}
          className="h-8 rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50">
          {tCommon('actions.cancel')}
        </button>
      </div>
    </form>
  );
}

// ─── Badges ─────────────────────────────────────────────────────────────────

function EmploymentStatusBadge({ status, t }: { status: EmploymentStatus; t: (key: string) => string }) {
  const variant = status === 'ACTIVE' ? 'success' : status === 'ON_LEAVE' ? 'warning' : 'outline';
  return <Badge variant={variant}>{t(`form.employmentStatusOptions.${status}`)}</Badge>;
}

// ─── Employee Profiles Table ────────────────────────────────────────────────

const COL_COUNT = 6;

export function EmployeeProfilesTable() {
  const t = useTranslations('settings.employees');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const [showInactive, setShowInactive] = useState(false);
  const [expandedId, setExpandedId] = useState<string | 'new' | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!restoreSuccessMsg) return;
    const id = setTimeout(() => setRestoreSuccessMsg(null), 5_000);
    return () => clearTimeout(id);
  }, [restoreSuccessMsg]);

  const { data: allEmployees, isLoading, isError, error, refetch } = useEmployees(showInactive);
  const deleteEmployee = useDeleteEmployee();
  const restoreEmployee = useRestoreEmployee();

  async function handleDeactivate(id: string) {
    setDeleteError(null);
    try {
      await deleteEmployee.mutateAsync(id);
      setDeletingId(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('error.deleteFailed'));
    }
  }

  async function handleRestore(id: string) {
    setRestoreError(null);
    try {
      await restoreEmployee.mutateAsync(id);
      setRestoringId(null);
      setRestoreSuccessMsg(t('restoreSuccess'));
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : t('error.restoreFailed'));
    }
  }

  const items = showInactive
    ? (allEmployees ?? [])
    : (allEmployees ?? []).filter((e) => !e.deletedAt);

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)}
          className="h-4 w-4 rounded border-input accent-primary" />
        {t('showDeactivated')}
      </label>
      <button
        onClick={() => { setExpandedId('new'); setDeletingId(null); setRestoringId(null); }}
        disabled={expandedId === 'new'}
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        {t('newEmployee')}
      </button>
    </div>
  );

  const restoreSuccessBanner = restoreSuccessMsg ? (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm">
      <p className="text-green-700 dark:text-green-400">{restoreSuccessMsg}</p>
      <button
        onClick={() => setRestoreSuccessMsg(null)}
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      >
        ✕
      </button>
    </div>
  ) : null;

  const thead = (
    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
      <tr>
        <th className="px-4 py-3 text-start font-medium">{t('columns.name')}</th>
        <th className="px-4 py-3 text-start font-medium">{t('columns.jobTitle')}</th>
        <th className="px-4 py-3 text-start font-medium">{t('columns.employmentStatus')}</th>
        <th className="px-4 py-3 text-start font-medium">{t('columns.linkedAccount')}</th>
        <th className="px-4 py-3 text-start font-medium">{t('columns.baseSalary')}</th>
        <th className="px-4 py-3 text-start font-medium">{t('columns.actions')}</th>
      </tr>
    </thead>
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {restoreSuccessBanner}
        {toolbar}
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              {thead}
              <tbody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    {Array.from({ length: COL_COUNT }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3">
        {restoreSuccessBanner}
        {toolbar}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
          <p className="text-sm font-medium text-destructive">{t('error.loadFailed')}</p>
          <p className="text-xs text-muted-foreground">
            {error instanceof Error ? error.message : tCommon('states.error')}
          </p>
          <button onClick={() => refetch()} className="mt-1 h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent">
            {tCommon('actions.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0 && expandedId !== 'new') {
    return (
      <div className="space-y-3">
        {restoreSuccessBanner}
        {toolbar}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
          <Users className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">{t('empty.heading')}</p>
          <p className="text-xs text-muted-foreground">{t('empty.subtext')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {restoreSuccessBanner}
      {toolbar}

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            {thead}
            <tbody>
              {expandedId === 'new' && (
                <tr className="border-t border-border bg-muted/10">
                  <td colSpan={COL_COUNT} className="p-4">
                    <p className="mb-3 text-sm font-semibold">{t('form.createTitle')}</p>
                    <EmployeeForm mode="create" onDone={() => setExpandedId(null)} />
                  </td>
                </tr>
              )}

              {items.map((emp) => {
                const isDeactivated = !!emp.deletedAt;
                const fullName = `${emp.firstName} ${emp.lastName}`;
                const fullNameAr = [emp.firstNameAr, emp.lastNameAr].filter(Boolean).join(' ');

                return (
                  <Fragment key={emp.id}>
                    <tr className={`border-t border-border transition-colors hover:bg-muted/20 ${isDeactivated ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{fullName}</p>
                        {fullNameAr && <p className="text-xs text-muted-foreground" dir="rtl">{fullNameAr}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{emp.jobTitle || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <EmploymentStatusBadge status={emp.employmentStatus} t={t} />
                          {isDeactivated && <Badge variant="danger">{t('status.deactivated')}</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {emp.user ? (
                          <span className="text-sm" dir="ltr">{emp.user.firstName} {emp.user.lastName} ({emp.user.phone})</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{t('noLinkedAccount')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm" dir="ltr">
                          {emp.baseSalary ? formatAmount(parseFloat(emp.baseSalary), locale) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {!isDeactivated ? (
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/dashboard/hr/employees/${emp.id}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border transition-colors hover:bg-accent"
                              aria-label="View"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              onClick={() => { setExpandedId(expandedId === emp.id ? null : emp.id); setDeletingId(null); setRestoringId(null); }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border transition-colors hover:bg-accent"
                              aria-label="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => { setDeletingId(deletingId === emp.id ? null : emp.id); setExpandedId(null); setRestoringId(null); setDeleteError(null); }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-destructive/30 text-destructive transition-colors hover:bg-destructive/10"
                              aria-label="Deactivate"
                            >
                              <UserX className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/dashboard/hr/employees/${emp.id}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border transition-colors hover:bg-accent"
                              aria-label="View"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              onClick={() => {
                                setRestoringId(restoringId === emp.id ? null : emp.id);
                                setExpandedId(null);
                                setDeletingId(null);
                                setRestoreError(null);
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 text-primary transition-colors hover:bg-primary/10"
                              aria-label="Restore"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>

                    {expandedId === emp.id && !isDeactivated && (
                      <tr className="border-t border-border bg-muted/10">
                        <td colSpan={COL_COUNT} className="p-4">
                          <p className="mb-3 text-sm font-semibold">{t('form.editTitle')}</p>
                          <EmployeeForm mode="edit" initial={emp} onDone={() => setExpandedId(null)} />
                        </td>
                      </tr>
                    )}

                    {deletingId === emp.id && !isDeactivated && (
                      <tr className="border-t border-border bg-destructive/5">
                        <td colSpan={COL_COUNT} className="px-4 py-2.5">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-sm text-destructive">{t('deactivateConfirm')}</p>
                            {deleteError && deletingId === emp.id && (
                              <p className="text-xs text-destructive">{deleteError}</p>
                            )}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDeactivate(emp.id)}
                                disabled={deleteEmployee.isPending}
                                className="h-7 rounded-md border border-destructive/40 bg-destructive/10 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                              >
                                {deleteEmployee.isPending ? t('deactivating') : t('deactivate')}
                              </button>
                              <button
                                onClick={() => { setDeletingId(null); setDeleteError(null); }}
                                disabled={deleteEmployee.isPending}
                                className="h-7 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                              >
                                {tCommon('actions.cancel')}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {restoringId === emp.id && isDeactivated && (
                      <tr className="border-t border-border bg-primary/5">
                        <td colSpan={COL_COUNT} className="px-4 py-2.5">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-sm text-foreground">{t('restoreConfirm')}</p>
                            {restoreError && restoringId === emp.id && (
                              <p className="text-xs text-destructive">{restoreError}</p>
                            )}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRestore(emp.id)}
                                disabled={restoreEmployee.isPending}
                                className="h-7 rounded-md border border-primary/40 bg-primary/10 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                              >
                                {restoreEmployee.isPending ? t('restoring') : t('restore')}
                              </button>
                              <button
                                onClick={() => { setRestoringId(null); setRestoreError(null); }}
                                disabled={restoreEmployee.isPending}
                                className="h-7 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                              >
                                {tCommon('actions.cancel')}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
