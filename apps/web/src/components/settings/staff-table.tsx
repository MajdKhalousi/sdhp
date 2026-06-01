'use client';

import { useState, Fragment } from 'react';
import { Plus, Pencil, UserX, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  useStaff,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
} from '@/hooks/use-staff';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { STAFF_ROLES } from '@/types/staff';
import type { StaffUser, CreateStaffDto, UpdateStaffDto } from '@/types/staff';

// ─── Field helpers ────────────────────────────────────────────────────────────

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

// ─── Staff Form ───────────────────────────────────────────────────────────────

interface StaffFormState {
  firstName: string;
  lastName: string;
  firstNameAr: string;
  lastNameAr: string;
  phone: string;
  email: string;
  password: string;
  role: string;
  isActive: boolean;
}

interface StaffFormErrors {
  firstName?: string;
  lastName?: string;
  phone?: string;
  password?: string;
  role?: string;
  email?: string;
}

interface StaffFormProps {
  mode: 'create' | 'edit';
  initial?: StaffUser;
  onDone: () => void;
}

function StaffForm({ mode, initial, onDone }: StaffFormProps) {
  const t       = useTranslations('settings.staff');
  const tCommon = useTranslations('common');
  const create  = useCreateStaff();
  const update  = useUpdateStaff();

  const [values, setValues] = useState<StaffFormState>({
    firstName:   initial?.firstName   ?? '',
    lastName:    initial?.lastName    ?? '',
    firstNameAr: initial?.firstNameAr ?? '',
    lastNameAr:  initial?.lastNameAr  ?? '',
    phone:       initial?.phone       ?? '',
    email:       initial?.email       ?? '',
    password:    '',
    role:        initial?.role        ?? '',
    isActive:    initial?.isActive    ?? true,
  });
  const [errors, setErrors]       = useState<StaffFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  function set(field: keyof StaffFormState, value: string | boolean) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSaveError(null);
  }

  function validate(): StaffFormErrors {
    const errs: StaffFormErrors = {};
    if (!values.firstName.trim()) errs.firstName = t('form.validation.firstNameRequired');
    if (!values.lastName.trim())  errs.lastName  = t('form.validation.lastNameRequired');
    if (!values.phone.trim())     errs.phone     = t('form.validation.phoneRequired');
    if (!values.role)             errs.role      = t('form.validation.roleRequired');
    if (mode === 'create' && values.password.length < 8)
      errs.password = t('form.validation.passwordRequired');
    if (values.email.trim() && !EMAIL_RE.test(values.email.trim()))
      errs.email = t('form.validation.emailFormat');
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaveError(null);
    try {
      if (mode === 'create') {
        const dto: CreateStaffDto = {
          firstName:   values.firstName.trim(),
          lastName:    values.lastName.trim(),
          firstNameAr: values.firstNameAr.trim() || undefined,
          lastNameAr:  values.lastNameAr.trim()  || undefined,
          phone:       values.phone.trim(),
          email:       values.email.trim()        || undefined,
          password:    values.password,
          role:        values.role,
          isActive:    true,
        };
        await create.mutateAsync(dto);
      } else if (initial) {
        const dto: UpdateStaffDto = {
          firstName:   values.firstName.trim(),
          lastName:    values.lastName.trim(),
          firstNameAr: values.firstNameAr.trim() || undefined,
          lastNameAr:  values.lastNameAr.trim()  || undefined,
          phone:       values.phone.trim(),
          email:       values.email.trim()        || undefined,
          role:        values.role,
          isActive:    values.isActive,
        };
        await update.mutateAsync({ id: initial.id, dto });
      }
      onDone();
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

        {mode === 'create' ? (
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
        ) : (
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="staff-isActive"
              checked={values.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
              disabled={isPending}
              className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
            />
            <label htmlFor="staff-isActive" className="cursor-pointer text-sm font-medium">
              {t('form.fields.isActive')}
            </label>
          </div>
        )}

        <div>
          <FieldLabel required>{t('form.fields.role')}</FieldLabel>
          <select
            value={values.role}
            onChange={(e) => set('role', e.target.value)}
            className={inputClass(!!errors.role)}
            disabled={isPending}
          >
            <option value="">—</option>
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}`)}
              </option>
            ))}
          </select>
          <FieldError message={errors.role} />
        </div>

      </div>

      {saveError && (
        <p className="text-sm text-destructive">{saveError}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="h-8 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {isPending
            ? (mode === 'create' ? t('form.actions.creating') : t('form.actions.saving'))
            : (mode === 'create' ? t('form.actions.create')   : t('form.actions.save'))}
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

// ─── Role display helper ──────────────────────────────────────────────────────

const KNOWN_ROLES = new Set<string>(STAFF_ROLES);

function RoleLabel({ role, t }: { role: string; t: ReturnType<typeof useTranslations<'settings.staff'>> }) {
  if (KNOWN_ROLES.has(role)) return <>{t(`roles.${role as (typeof STAFF_ROLES)[number]}`)}</>;
  return <>{role}</>;
}

// ─── Staff Table ──────────────────────────────────────────────────────────────

const COL_COUNT = 6;

export function StaffTable() {
  const t       = useTranslations('settings.staff');
  const tCommon = useTranslations('common');

  const [showInactive, setShowInactive] = useState(false);
  const [expandedId, setExpandedId]     = useState<string | 'new' | null>(null);
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [deleteError, setDeleteError]   = useState<string | null>(null);

  const { data: allStaff, isLoading, isError, error, refetch } = useStaff();
  const deleteStaff = useDeleteStaff();

  async function handleDeactivate(id: string) {
    setDeleteError(null);
    try {
      await deleteStaff.mutateAsync(id);
      setDeletingId(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('error.deleteFailed'));
    }
  }

  const items = (allStaff ?? []).filter((u) => showInactive || u.isActive);

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
          className="h-4 w-4 rounded border-input accent-primary"
        />
        {t('showInactive')}
      </label>
      <button
        onClick={() => { setExpandedId('new'); setDeletingId(null); }}
        disabled={expandedId === 'new'}
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        {t('newStaff')}
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
            <table className="w-full min-w-[640px]">
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
        {toolbar}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
          <p className="text-sm font-medium text-destructive">{t('error.loadFailed')}</p>
          <p className="text-xs text-muted-foreground">
            {error instanceof Error ? error.message : tCommon('states.error')}
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

  if (items.length === 0 && expandedId !== 'new') {
    return (
      <div className="space-y-3">
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
      {toolbar}

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            {thead}
            <tbody>

              {expandedId === 'new' && (
                <tr className="border-t border-border bg-muted/10">
                  <td colSpan={COL_COUNT} className="p-4">
                    <p className="mb-3 text-sm font-semibold">{t('form.createTitle')}</p>
                    <StaffForm mode="create" onDone={() => setExpandedId(null)} />
                  </td>
                </tr>
              )}

              {items.map((member) => (
                <Fragment key={member.id}>
                  <tr className={`border-t border-border transition-colors hover:bg-muted/20 ${!member.isActive ? 'opacity-50' : ''}`}>

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
                      <span className="text-sm">
                        <RoleLabel role={member.role} t={t} />
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <Badge variant={member.isActive ? 'success' : 'outline'}>
                        {member.isActive ? t('status.active') : t('status.inactive')}
                      </Badge>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setExpandedId(expandedId === member.id ? null : member.id);
                            setDeletingId(null);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border transition-colors hover:bg-accent"
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingId(deletingId === member.id ? null : member.id);
                            setExpandedId(null);
                            setDeleteError(null);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-destructive/30 text-destructive transition-colors hover:bg-destructive/10"
                          aria-label="Deactivate"
                        >
                          <UserX className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>

                  {expandedId === member.id && (
                    <tr className="border-t border-border bg-muted/10">
                      <td colSpan={COL_COUNT} className="p-4">
                        <p className="mb-3 text-sm font-semibold">{t('form.editTitle')}</p>
                        <StaffForm
                          mode="edit"
                          initial={member}
                          onDone={() => setExpandedId(null)}
                        />
                      </td>
                    </tr>
                  )}

                  {deletingId === member.id && (
                    <tr className="border-t border-border bg-destructive/5">
                      <td colSpan={COL_COUNT} className="px-4 py-2.5">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-sm text-destructive">{t('deactivateConfirm')}</p>
                          {deleteError && deletingId === member.id && (
                            <p className="text-xs text-destructive">{deleteError}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDeactivate(member.id)}
                              disabled={deleteStaff.isPending}
                              className="h-7 rounded-md border border-destructive/40 bg-destructive/10 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                            >
                              {deleteStaff.isPending ? t('deactivating') : t('deactivate')}
                            </button>
                            <button
                              onClick={() => { setDeletingId(null); setDeleteError(null); }}
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

                </Fragment>
              ))}

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
