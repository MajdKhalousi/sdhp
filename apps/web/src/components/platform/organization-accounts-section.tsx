'use client';

import { useState, useEffect, Fragment } from 'react';
import { Plus, Pencil, UserX, Users, RotateCcw, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  useStaff,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
  useRestoreStaff,
} from '@/hooks/use-staff';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { STAFF_ROLES } from '@/types/staff';
import type { StaffUser, CreateStaffDto, UpdateStaffDto, StaffRole } from '@/types/staff';

// ─── Field helpers — mirrors the established settings/staff form styling ──────

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

// ─── Account Form ───────────────────────────────────────────────────────────
// organizationId is always the prop passed in from the org detail page — there
// is no organization picker, and the backend's UpdateUserDto structurally
// omits organizationId on edit (users cannot be moved between organizations).

interface FormState {
  firstName: string;
  lastName: string;
  firstNameAr: string;
  lastNameAr: string;
  phone: string;
  email: string;
  password: string;
  role: string;
  temporaryPassword: string;
  confirmTemporaryPassword: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  phone?: string;
  password?: string;
  role?: string;
  email?: string;
  temporaryPassword?: string;
  confirmTemporaryPassword?: string;
}

interface AccountFormProps {
  mode: 'create' | 'edit';
  initial?: StaffUser;
  onDone: () => void;
  organizationId: string;
  roleOptions: readonly string[];
}

function AccountForm({ mode, initial, onDone, organizationId, roleOptions }: AccountFormProps) {
  const t = useTranslations('platform.organizationDetail.accounts');
  const tCommon = useTranslations('common');
  const create = useCreateStaff();
  const update = useUpdateStaff();

  const [values, setValues] = useState<FormState>({
    firstName: initial?.firstName ?? '',
    lastName: initial?.lastName ?? '',
    firstNameAr: initial?.firstNameAr ?? '',
    lastNameAr: initial?.lastNameAr ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    password: '',
    role: initial?.role ?? '',
    temporaryPassword: '',
    confirmTemporaryPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  function set(field: keyof FormState, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSaveError(null);
    setSaveSuccess(null);
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!values.firstName.trim()) errs.firstName = t('validation.firstNameRequired');
    if (!values.lastName.trim()) errs.lastName = t('validation.lastNameRequired');
    if (!values.phone.trim()) errs.phone = t('validation.phoneRequired');
    if (!values.role) errs.role = t('validation.roleRequired');
    if (mode === 'create') {
      if (values.password.length < 10) {
        errs.password = t('validation.passwordRequired');
      } else if (!/(?=.*[A-Za-z])/.test(values.password) || !/(?=.*\d)/.test(values.password)) {
        errs.password = t('validation.passwordFormat');
      }
    }
    if (mode === 'edit') {
      const tp = values.temporaryPassword;
      const ctp = values.confirmTemporaryPassword;
      if (tp || ctp) {
        if (!tp) {
          errs.temporaryPassword = t('validation.tempPasswordRequired');
        } else if (!ctp) {
          errs.confirmTemporaryPassword = t('validation.tempPasswordRequired');
        } else if (tp !== ctp) {
          errs.confirmTemporaryPassword = t('validation.passwordMismatch');
        } else if (tp.length < 10 || !/(?=.*[A-Za-z])/.test(tp) || !/(?=.*\d)/.test(tp)) {
          errs.temporaryPassword = t('validation.tempPasswordFormat');
        }
      }
    }
    if (values.email.trim() && !EMAIL_RE.test(values.email.trim())) {
      errs.email = t('validation.emailFormat');
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSaveError(null);
    setSaveSuccess(null);
    try {
      if (mode === 'create') {
        const dto: CreateStaffDto = {
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          firstNameAr: values.firstNameAr.trim() || undefined,
          lastNameAr: values.lastNameAr.trim() || undefined,
          phone: values.phone.trim(),
          email: values.email.trim() || undefined,
          password: values.password,
          role: values.role,
          organizationId,
        };
        await create.mutateAsync(dto);
        onDone();
      } else if (initial) {
        const hasPassword = values.temporaryPassword.trim().length > 0;
        const dto: UpdateStaffDto = {
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          firstNameAr: values.firstNameAr.trim() || undefined,
          lastNameAr: values.lastNameAr.trim() || undefined,
          phone: values.phone.trim(),
          email: values.email.trim() || undefined,
          role: values.role,
        };
        if (hasPassword) {
          dto.password = values.temporaryPassword;
        }
        await update.mutateAsync({ id: initial.id, dto });
        if (hasPassword) {
          setSaveSuccess(t('success.passwordReset'));
          setValues((prev) => ({ ...prev, temporaryPassword: '', confirmTemporaryPassword: '' }));
        } else {
          onDone();
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'ConflictError') {
        setSaveError(t('error.phoneConflict'));
      } else {
        setSaveError(err instanceof Error ? err.message : t('error.saveFailed'));
      }
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <FieldLabel required>{t('form.fields.firstName')}</FieldLabel>
          <input
            type="text"
            value={values.firstName}
            onChange={(e) => set('firstName', e.target.value)}
            className={inputClass(!!errors.firstName)}
            disabled={isPending}
          />
          <FieldError message={errors.firstName} />
        </div>

        <div>
          <FieldLabel required>{t('form.fields.lastName')}</FieldLabel>
          <input
            type="text"
            value={values.lastName}
            onChange={(e) => set('lastName', e.target.value)}
            className={inputClass(!!errors.lastName)}
            disabled={isPending}
          />
          <FieldError message={errors.lastName} />
        </div>

        <div>
          <FieldLabel>{t('form.fields.firstNameAr')}</FieldLabel>
          <input
            type="text"
            value={values.firstNameAr}
            onChange={(e) => set('firstNameAr', e.target.value)}
            className={inputClass()}
            disabled={isPending}
            dir="rtl"
          />
        </div>

        <div>
          <FieldLabel>{t('form.fields.lastNameAr')}</FieldLabel>
          <input
            type="text"
            value={values.lastNameAr}
            onChange={(e) => set('lastNameAr', e.target.value)}
            className={inputClass()}
            disabled={isPending}
            dir="rtl"
          />
        </div>

        <div>
          <FieldLabel required>{t('form.fields.phone')}</FieldLabel>
          <input
            type="tel"
            value={values.phone}
            onChange={(e) => set('phone', e.target.value)}
            className={inputClass(!!errors.phone)}
            placeholder={t('form.placeholders.phone')}
            disabled={isPending}
            dir="ltr"
          />
          <FieldError message={errors.phone} />
        </div>

        <div>
          <FieldLabel>{t('form.fields.email')}</FieldLabel>
          <input
            type="email"
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
            className={inputClass(!!errors.email)}
            placeholder={t('form.placeholders.email')}
            disabled={isPending}
            dir="ltr"
          />
          <FieldError message={errors.email} />
        </div>

        <div>
          <FieldLabel required>{t('form.fields.role')}</FieldLabel>
          <select
            value={values.role}
            onChange={(e) => set('role', e.target.value)}
            className={inputClass(!!errors.role)}
            disabled={isPending}
          >
            <option value="">—</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}` as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
          <FieldError message={errors.role} />
        </div>

        {mode === 'create' && (
          <div>
            <FieldLabel required>{t('form.fields.password')}</FieldLabel>
            <input
              type="password"
              value={values.password}
              onChange={(e) => set('password', e.target.value)}
              className={inputClass(!!errors.password)}
              placeholder={t('form.placeholders.password')}
              disabled={isPending}
              autoComplete="new-password"
            />
            <FieldError message={errors.password} />
          </div>
        )}
      </div>

      {mode === 'edit' && (
        <div className="border-t border-border pt-4">
          <p className="mb-3 text-sm font-semibold text-foreground">
            {t('form.fields.temporaryPasswordSection')}
          </p>
          <p className="mb-3 text-xs text-muted-foreground">{t('form.fields.temporaryPasswordHelp')}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>{t('form.fields.temporaryPassword')}</FieldLabel>
              <input
                type="password"
                value={values.temporaryPassword}
                onChange={(e) => set('temporaryPassword', e.target.value)}
                className={inputClass(!!errors.temporaryPassword)}
                disabled={isPending}
                autoComplete="new-password"
                dir="ltr"
              />
              <FieldError message={errors.temporaryPassword} />
            </div>
            <div>
              <FieldLabel>{t('form.fields.confirmTemporaryPassword')}</FieldLabel>
              <input
                type="password"
                value={values.confirmTemporaryPassword}
                onChange={(e) => set('confirmTemporaryPassword', e.target.value)}
                className={inputClass(!!errors.confirmTemporaryPassword)}
                disabled={isPending}
                autoComplete="new-password"
                dir="ltr"
              />
              <FieldError message={errors.confirmTemporaryPassword} />
            </div>
          </div>
        </div>
      )}

      {saveError && <p className="text-sm text-destructive">{saveError}</p>}
      {saveSuccess && <p className="text-sm text-green-700 dark:text-green-400">{saveSuccess}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="h-8 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {isPending
            ? mode === 'create' ? t('form.actions.creating') : t('form.actions.saving')
            : mode === 'create' ? t('form.actions.create') : t('form.actions.save')}
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={isPending}
          className="h-8 rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          {tCommon('actions.cancel')}
        </button>
      </div>
    </form>
  );
}

// ─── Organization Accounts Section ──────────────────────────────────────────

const COL_COUNT = 7;

interface OrganizationAccountsSectionProps {
  organizationId: string;
}

export function OrganizationAccountsSection({ organizationId }: OrganizationAccountsSectionProps) {
  const t = useTranslations('platform.organizationDetail.accounts');
  const tCommon = useTranslations('common');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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

  // Reuses the same query the org detail page already fetches for its stats
  // cards — TanStack Query dedupes the identical ['staff', true] key, so this
  // is not a new network call. The shared useCreateStaff/useUpdateStaff/
  // useDeleteStaff/useRestoreStaff hooks already invalidate ['staff'] on
  // success, so no manual cache invalidation is needed here.
  const { data: allStaff, isLoading, isError, refetch } = useStaff(true);
  const deleteStaff = useDeleteStaff();
  const restoreStaff = useRestoreStaff();

  // Organization accounts: everyone in this org except SUPER_ADMIN. SUPER_ADMIN
  // rows are managed exclusively from the Platform Accounts page and must never
  // appear here, even if a SUPER_ADMIN's home organization happens to be this one.
  const orgAccounts = (allStaff ?? []).filter(
    (u) => u.organizationId === organizationId && u.role !== 'SUPER_ADMIN',
  );

  const activeOrgAdminCount = orgAccounts.filter(
    (u) => u.role === 'ORG_ADMIN' && u.isActive && !u.deletedAt,
  ).length;

  // BRANCH_ADMIN is not a creatable/assignable role here (no deliberate
  // platform meaning today — see 141B), but an existing BRANCH_ADMIN row must
  // still display and remain editable without the role select silently
  // mismatching its current value.
  function roleOptionsFor(member?: StaffUser): readonly string[] {
    if (member && !STAFF_ROLES.includes(member.role as StaffRole)) {
      return [member.role, ...STAFF_ROLES];
    }
    return STAFF_ROLES;
  }

  const items = orgAccounts.filter((member) => {
    if (statusFilter === 'active' && !member.isActive) return false;
    if (statusFilter === 'inactive' && member.isActive) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      const haystack = [
        member.firstName,
        member.lastName,
        member.firstNameAr ?? '',
        member.lastNameAr ?? '',
        member.phone,
        member.email ?? '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  async function handleDeactivate(id: string) {
    setDeleteError(null);
    try {
      await deleteStaff.mutateAsync(id);
      setDeletingId(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('error.deactivateFailed'));
    }
  }

  async function handleRestore(id: string) {
    setRestoreError(null);
    try {
      await restoreStaff.mutateAsync(id);
      setRestoringId(null);
      setRestoreSuccessMsg(t('success.restored'));
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : t('error.restoreFailed'));
    }
  }

  const header = (
    <div>
      <h2 className="text-sm font-semibold text-foreground">{t('sectionTitle')}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{t('subtitle')}</p>
    </div>
  );

  const toolbar = (
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative w-64">
        <Search className="absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-9 w-full rounded-md border bg-background ps-8 pe-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
        />
      </div>

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="h-9 rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
      >
        <option value="">{t('filters.allStatuses')}</option>
        <option value="active">{t('status.active')}</option>
        <option value="inactive">{t('status.inactive')}</option>
      </select>

      <button
        onClick={() => {
          setExpandedId('new');
          setDeletingId(null);
          setRestoringId(null);
        }}
        disabled={expandedId === 'new'}
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        {t('actions.create')}
      </button>
    </div>
  );

  const thead = (
    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
      <tr>
        <th className="px-4 py-3 text-start font-medium">{t('columns.name')}</th>
        <th className="px-4 py-3 text-start font-medium">{t('columns.phone')}</th>
        <th className="px-4 py-3 text-start font-medium">{t('columns.email')}</th>
        <th className="px-4 py-3 text-start font-medium">{t('columns.role')}</th>
        <th className="px-4 py-3 text-start font-medium">{t('columns.status')}</th>
        <th className="px-4 py-3 text-start font-medium">{t('columns.lastLogin')}</th>
        <th className="px-4 py-3 text-start font-medium">{t('columns.actions')}</th>
      </tr>
    </thead>
  );

  if (isLoading) {
    return (
      <section className="space-y-3">
        {header}
        {toolbar}
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              {thead}
              <tbody>
                {Array.from({ length: 2 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    {Array.from({ length: COL_COUNT }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="space-y-3">
        {header}
        {toolbar}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
          <p className="text-sm font-medium text-destructive">{t('loadError')}</p>
          <button
            onClick={() => refetch()}
            className="mt-1 h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
          >
            {tCommon('actions.tryAgain')}
          </button>
        </div>
      </section>
    );
  }

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

  if (items.length === 0 && expandedId !== 'new') {
    return (
      <section className="space-y-3">
        {header}
        {restoreSuccessBanner}
        {toolbar}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
          <Users className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">{t('empty')}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {header}
      {restoreSuccessBanner}
      {toolbar}
      <p className="text-sm text-muted-foreground">{t('count', { count: items.length })}</p>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            {thead}
            <tbody>
              {expandedId === 'new' && (
                <tr className="border-t border-border bg-muted/10">
                  <td colSpan={COL_COUNT} className="p-4">
                    <p className="mb-3 text-sm font-semibold">{t('form.createTitle')}</p>
                    <AccountForm
                      mode="create"
                      onDone={() => setExpandedId(null)}
                      organizationId={organizationId}
                      roleOptions={STAFF_ROLES}
                    />
                  </td>
                </tr>
              )}

              {items.map((member) => {
                const isDeactivated = !!member.deletedAt;
                const isLastOrgAdmin =
                  member.role === 'ORG_ADMIN' &&
                  member.isActive &&
                  !member.deletedAt &&
                  activeOrgAdminCount === 1;

                const statusBadge = isDeactivated ? (
                  <Badge variant="danger">{t('status.deactivated')}</Badge>
                ) : member.isActive ? (
                  <Badge variant="success">{t('status.active')}</Badge>
                ) : (
                  <Badge variant="outline">{t('status.inactive')}</Badge>
                );

                return (
                  <Fragment key={member.id}>
                    <tr className={`border-t border-border transition-colors hover:bg-muted/20 ${!member.isActive ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">
                          {member.firstName} {member.lastName}
                        </p>
                        {(member.firstNameAr || member.lastNameAr) && (
                          <p className="text-xs text-muted-foreground" dir="rtl">
                            {[member.firstNameAr, member.lastNameAr].filter(Boolean).join(' ')}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm" dir="ltr">{member.phone}</span>
                      </td>
                      <td className="px-4 py-3">
                        {member.email ? (
                          <span className="text-sm" dir="ltr">{member.email}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{t(`roles.${member.role}` as Parameters<typeof t>[0])}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {statusBadge}
                          {isLastOrgAdmin && <Badge variant="warning">{t('lastOrgAdmin')}</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground" dir="ltr">
                        {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {isDeactivated ? (
                          <button
                            onClick={() => {
                              setRestoringId(restoringId === member.id ? null : member.id);
                              setExpandedId(null);
                              setDeletingId(null);
                              setRestoreError(null);
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 text-primary transition-colors hover:bg-primary/10"
                            aria-label="Restore"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setExpandedId(expandedId === member.id ? null : member.id);
                                setDeletingId(null);
                                setRestoringId(null);
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border transition-colors hover:bg-accent"
                              aria-label="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (isLastOrgAdmin) return;
                                setDeletingId(deletingId === member.id ? null : member.id);
                                setExpandedId(null);
                                setRestoringId(null);
                                setDeleteError(null);
                              }}
                              disabled={isLastOrgAdmin}
                              title={isLastOrgAdmin ? t('lastOrgAdminTooltip') : undefined}
                              className={
                                isLastOrgAdmin
                                  ? 'inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground opacity-40 cursor-not-allowed'
                                  : 'inline-flex h-7 w-7 items-center justify-center rounded-md border border-destructive/30 text-destructive transition-colors hover:bg-destructive/10'
                              }
                              aria-label="Deactivate"
                            >
                              <UserX className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>

                    {expandedId === member.id && !isDeactivated && (
                      <tr className="border-t border-border bg-muted/10">
                        <td colSpan={COL_COUNT} className="p-4">
                          <p className="mb-3 text-sm font-semibold">{t('form.editTitle')}</p>
                          <AccountForm
                            mode="edit"
                            initial={member}
                            onDone={() => setExpandedId(null)}
                            organizationId={organizationId}
                            roleOptions={roleOptionsFor(member)}
                          />
                        </td>
                      </tr>
                    )}

                    {deletingId === member.id && !isDeactivated && !isLastOrgAdmin && (
                      <tr className="border-t border-border bg-destructive/5">
                        <td colSpan={COL_COUNT} className="px-4 py-2.5">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-sm text-destructive">{t('actions.confirmDeactivate')}</p>
                            {deleteError && deletingId === member.id && (
                              <p className="text-xs text-destructive">{deleteError}</p>
                            )}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDeactivate(member.id)}
                                disabled={deleteStaff.isPending}
                                className="h-7 rounded-md border border-destructive/40 bg-destructive/10 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                              >
                                {deleteStaff.isPending ? t('actions.deactivating') : t('actions.deactivate')}
                              </button>
                              <button
                                onClick={() => {
                                  setDeletingId(null);
                                  setDeleteError(null);
                                }}
                                disabled={deleteStaff.isPending}
                                className="h-7 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                              >
                                {tCommon('actions.cancel')}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {restoringId === member.id && isDeactivated && (
                      <tr className="border-t border-border bg-primary/5">
                        <td colSpan={COL_COUNT} className="px-4 py-2.5">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-sm text-foreground">{t('actions.confirmRestore')}</p>
                            {restoreError && restoringId === member.id && (
                              <p className="text-xs text-destructive">{restoreError}</p>
                            )}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRestore(member.id)}
                                disabled={restoreStaff.isPending}
                                className="h-7 rounded-md border border-primary/40 bg-primary/10 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                              >
                                {restoreStaff.isPending ? t('actions.restoring') : t('actions.restore')}
                              </button>
                              <button
                                onClick={() => {
                                  setRestoringId(null);
                                  setRestoreError(null);
                                }}
                                disabled={restoreStaff.isPending}
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
    </section>
  );
}
