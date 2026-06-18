'use client';

import { useState, useEffect, Fragment } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, UserX, Users as UsersIcon, RotateCcw, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
  useRestoreStaff,
  usePlatformUsers,
} from '@/hooks/use-staff';
import { useOrganizations } from '@/hooks/use-organizations';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { STAFF_ROLES } from '@/types/staff';
import type { StaffUser, CreateStaffDto, UpdateStaffDto, StaffRole } from '@/types/staff';
import { useAuthStore } from '@/store/auth';
import type { AuthUser } from '@/store/auth';

const LIMIT = 50;

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

// ─── Platform User Form ────────────────────────────────────────────────────────

interface FormState {
  firstName: string;
  lastName: string;
  firstNameAr: string;
  lastNameAr: string;
  phone: string;
  email: string;
  password: string;
  role: string;
  organizationId: string;
  temporaryPassword: string;
  confirmTemporaryPassword: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  phone?: string;
  password?: string;
  role?: string;
  organizationId?: string;
  email?: string;
  temporaryPassword?: string;
  confirmTemporaryPassword?: string;
}

interface PlatformUserFormProps {
  mode: 'create' | 'edit';
  initial?: StaffUser;
  onDone: () => void;
  onCreated?: (role: string) => void;
  organizations: { id: string; name: string }[];
}

function PlatformUserForm({ mode, initial, onDone, onCreated, organizations }: PlatformUserFormProps) {
  const t = useTranslations('platform.users');
  const tCommon = useTranslations('common');
  const qc = useQueryClient();
  const create = useCreateStaff();
  const update = useUpdateStaff();

  // The edit role dropdown must always include the row's current role even
  // when it isn't normally assignable (e.g. an existing SUPER_ADMIN row),
  // otherwise the <select> would silently mismatch — but new values can
  // only ever be chosen from STAFF_ROLES, so promoting INTO SUPER_ADMIN or
  // BRANCH_ADMIN from this page is never possible.
  const roleOptions: string[] =
    initial && !STAFF_ROLES.includes(initial.role as StaffRole)
      ? [initial.role, ...STAFF_ROLES]
      : STAFF_ROLES;

  const [values, setValues] = useState<FormState>({
    firstName: initial?.firstName ?? '',
    lastName: initial?.lastName ?? '',
    firstNameAr: initial?.firstNameAr ?? '',
    lastNameAr: initial?.lastNameAr ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    password: '',
    role: initial?.role ?? '',
    organizationId: initial?.organizationId ?? '',
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
      if (!values.organizationId) errs.organizationId = t('validation.organizationRequired');
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
          organizationId: values.organizationId,
        };
        await create.mutateAsync(dto);
        await qc.invalidateQueries({ queryKey: ['platform-users'] });
        onCreated?.(values.role);
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
        await qc.invalidateQueries({ queryKey: ['platform-users'] });
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

        {mode === 'create' ? (
          <div>
            <FieldLabel required>{t('form.fields.organization')}</FieldLabel>
            <select
              value={values.organizationId}
              onChange={(e) => set('organizationId', e.target.value)}
              className={inputClass(!!errors.organizationId)}
              disabled={isPending}
            >
              <option value="">—</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            <FieldError message={errors.organizationId} />
          </div>
        ) : (
          <div>
            <FieldLabel>{t('form.fields.organization')}</FieldLabel>
            <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              {organizations.find((o) => o.id === values.organizationId)?.name ?? values.organizationId}
            </p>
          </div>
        )}

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

      {values.role === 'DOCTOR' && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">{t('doctorProfileHint.title')}</p>
          <p className="mt-0.5 text-muted-foreground">{t('doctorProfileHint.body')}</p>
        </div>
      )}

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

// ─── Platform Users Table ──────────────────────────────────────────────────────

const COL_COUNT = 9;

function canManageRow(member: StaffUser, currentUser: AuthUser | null): boolean {
  if (!currentUser) return false;
  return member.id !== currentUser.id;
}

export function PlatformUsersTable() {
  const t = useTranslations('platform.users');
  const tCommon = useTranslations('common');
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [orgFilter, setOrgFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | 'new' | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);
  const [doctorHint, setDoctorHint] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, roleFilter, orgFilter, statusFilter]);

  useEffect(() => {
    if (!doctorHint) return;
    const id = setTimeout(() => setDoctorHint(false), 10_000);
    return () => clearTimeout(id);
  }, [doctorHint]);

  useEffect(() => {
    if (!restoreSuccessMsg) return;
    const id = setTimeout(() => setRestoreSuccessMsg(null), 5_000);
    return () => clearTimeout(id);
  }, [restoreSuccessMsg]);

  const { data: organizations = [] } = useOrganizations();
  const orgMap = new Map(organizations.map((o) => [o.id, o.name]));

  const { data: result, isLoading, isError, refetch } = usePlatformUsers({ page, limit: LIMIT, includeDeleted: true });
  const deleteStaff = useDeleteStaff();
  const restoreStaff = useRestoreStaff();

  const allRows = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  // Last-active-admin protection is computed only over the currently
  // fetched page — the backend's transaction-guarded count check (per
  // SUPER_ADMIN platform-wide, per ORG_ADMIN within its organization)
  // remains the real authority regardless of pagination boundaries.
  const activeSuperAdminCount = allRows.filter((u) => u.role === 'SUPER_ADMIN' && u.isActive && !u.deletedAt).length;
  const activeOrgAdminCountByOrg = new Map<string, number>();
  for (const u of allRows) {
    if (u.role === 'ORG_ADMIN' && u.isActive && !u.deletedAt) {
      activeOrgAdminCountByOrg.set(u.organizationId, (activeOrgAdminCountByOrg.get(u.organizationId) ?? 0) + 1);
    }
  }

  function organizationName(member: StaffUser): string {
    return orgMap.get(member.organizationId) ?? member.organizationId;
  }

  const items = allRows.filter((member) => {
    if (roleFilter && member.role !== roleFilter) return false;
    if (orgFilter && member.organizationId !== orgFilter) return false;
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
      await qc.invalidateQueries({ queryKey: ['platform-users'] });
      setDeletingId(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('error.deactivateFailed'));
    }
  }

  async function handleRestore(id: string) {
    setRestoreError(null);
    try {
      await restoreStaff.mutateAsync(id);
      await qc.invalidateQueries({ queryKey: ['platform-users'] });
      setRestoringId(null);
      setRestoreSuccessMsg(t('success.restored'));
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : t('error.restoreFailed'));
    }
  }

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
        value={roleFilter}
        onChange={(e) => setRoleFilter(e.target.value)}
        className="h-9 rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
      >
        <option value="">{t('filters.allRoles')}</option>
        {[...STAFF_ROLES, 'SUPER_ADMIN', 'BRANCH_ADMIN'].map((r) => (
          <option key={r} value={r}>
            {t(`roles.${r}` as Parameters<typeof t>[0])}
          </option>
        ))}
      </select>

      <select
        value={orgFilter}
        onChange={(e) => setOrgFilter(e.target.value)}
        className="h-9 rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
      >
        <option value="">{t('filters.allOrganizations')}</option>
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>

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
        <th className="px-4 py-3 text-start font-medium">{t('columns.organization')}</th>
        <th className="px-4 py-3 text-start font-medium">{t('columns.status')}</th>
        <th className="px-4 py-3 text-start font-medium">{t('columns.lastLogin')}</th>
        <th className="px-4 py-3 text-start font-medium">{t('columns.createdAt')}</th>
        <th className="px-4 py-3 text-start font-medium">{t('columns.actions')}</th>
      </tr>
    </thead>
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {toolbar}
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px]">
              {thead}
              <tbody>
                {Array.from({ length: 3 }).map((_, i) => (
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
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3">
        {toolbar}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
          <p className="text-sm font-medium text-destructive">{t('error')}</p>
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

  const doctorHintBanner = doctorHint ? (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
      <p className="text-foreground">{t('doctorProfileHint.body')}</p>
      <button
        onClick={() => setDoctorHint(false)}
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        aria-label="dismiss"
      >
        ✕
      </button>
    </div>
  ) : null;

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

  const pagination = (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">{t('pagination.pageInfo', { page, totalPages, total })}</p>
      <div className="flex gap-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('pagination.previous')}
        </button>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={page * LIMIT >= total}
          className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('pagination.next')}
        </button>
      </div>
    </div>
  );

  if (items.length === 0 && expandedId !== 'new') {
    return (
      <div className="space-y-3">
        {doctorHintBanner}
        {restoreSuccessBanner}
        {toolbar}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
          <UsersIcon className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">{t('empty')}</p>
        </div>
        {pagination}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {doctorHintBanner}
      {restoreSuccessBanner}
      {toolbar}

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            {thead}
            <tbody>
              {expandedId === 'new' && (
                <tr className="border-t border-border bg-muted/10">
                  <td colSpan={COL_COUNT} className="p-4">
                    <p className="mb-3 text-sm font-semibold">{t('form.createTitle')}</p>
                    <PlatformUserForm
                      mode="create"
                      onDone={() => setExpandedId(null)}
                      onCreated={(role) => setDoctorHint(role === 'DOCTOR')}
                      organizations={organizations}
                    />
                  </td>
                </tr>
              )}

              {items.map((member) => {
                const isDeactivated = !!member.deletedAt;
                const isLastSuperAdmin =
                  member.role === 'SUPER_ADMIN' && member.isActive && !member.deletedAt && activeSuperAdminCount === 1;
                const isLastOrgAdmin =
                  member.role === 'ORG_ADMIN' &&
                  member.isActive &&
                  !member.deletedAt &&
                  (activeOrgAdminCountByOrg.get(member.organizationId) ?? 0) === 1;
                const isLastActiveAdmin = isLastSuperAdmin || isLastOrgAdmin;
                const isSelf = !!user && member.id === user.id;
                const canManage = canManageRow(member, user);

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
                        <span className="text-sm">{t(`roles.${member.role}` as Parameters<typeof t>[0])}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/platform/organizations/${member.organizationId}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {organizationName(member)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {statusBadge}
                          {isSelf && <Badge variant="outline">{t('yourAccount')}</Badge>}
                          {isLastSuperAdmin && <Badge variant="warning">{t('lastSuperAdmin')}</Badge>}
                          {isLastOrgAdmin && <Badge variant="warning">{t('lastOrgAdmin')}</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground" dir="ltr">
                        {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground" dir="ltr">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {!canManage ? (
                          <span className="text-xs text-muted-foreground" title={t('selfProtection')}>
                            {t('selfProtection')}
                          </span>
                        ) : isDeactivated ? (
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
                                if (isLastActiveAdmin) return;
                                setDeletingId(deletingId === member.id ? null : member.id);
                                setExpandedId(null);
                                setRestoringId(null);
                                setDeleteError(null);
                              }}
                              disabled={isLastActiveAdmin}
                              title={
                                isLastSuperAdmin
                                  ? t('lastSuperAdminTooltip')
                                  : isLastOrgAdmin
                                  ? t('lastOrgAdminTooltip')
                                  : undefined
                              }
                              className={
                                isLastActiveAdmin
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

                    {expandedId === member.id && canManage && !isDeactivated && (
                      <tr className="border-t border-border bg-muted/10">
                        <td colSpan={COL_COUNT} className="p-4">
                          <p className="mb-3 text-sm font-semibold">{t('form.editTitle')}</p>
                          <PlatformUserForm
                            mode="edit"
                            initial={member}
                            onDone={() => setExpandedId(null)}
                            organizations={organizations}
                          />
                        </td>
                      </tr>
                    )}

                    {deletingId === member.id && canManage && !isDeactivated && !isLastActiveAdmin && (
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

                    {restoringId === member.id && canManage && isDeactivated && (
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

      {pagination}
    </div>
  );
}
