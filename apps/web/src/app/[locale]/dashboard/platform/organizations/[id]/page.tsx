'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth';
import { PLATFORM_ACCESS_ROLES } from '@/lib/permissions';
import { useOrganization, useUpdateOrganization, useToggleOrganizationStatus } from '@/hooks/use-organizations';
import { useBranches } from '@/hooks/use-branches';
import { useStaff } from '@/hooks/use-staff';
import type { OrganizationType } from '@/types/organization';

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

const ORG_TYPES: OrganizationType[] = ['HOSPITAL', 'CLINIC', 'POLYCLINIC'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EditFormState {
  name: string;
  nameAr: string;
  type: OrganizationType;
  phone: string;
  email: string;
  address: string;
}

interface EditFormErrors {
  name?: string;
  email?: string;
}

function trimmedOrUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export default function PlatformOrganizationDetailPage() {
  const t = useTranslations('platform.organizationDetail');
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && !PLATFORM_ACCESS_ROLES.has(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const isSuperAdmin = !!user && PLATFORM_ACCESS_ROLES.has(user.role);

  const {
    data: org,
    isLoading: orgLoading,
    isError: orgError,
  } = useOrganization(id);

  const { data: allBranches = [], isLoading: branchesLoading } = useBranches();
  const { data: allUsers = [], isLoading: usersLoading } = useStaff(true);

  const updateOrganization = useUpdateOrganization();
  const toggleStatus = useToggleOrganizationStatus();

  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<EditFormState>({
    name: '',
    nameAr: '',
    type: 'CLINIC',
    phone: '',
    email: '',
    address: '',
  });
  const [editErrors, setEditErrors] = useState<EditFormErrors>({});
  const [editSubmitError, setEditSubmitError] = useState<string | null>(null);

  const [confirmingSuspend, setConfirmingSuspend] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  if (!user || !isSuperAdmin) return null;

  function startEdit() {
    if (!org) return;
    setEditValues({
      name: org.name,
      nameAr: org.nameAr ?? '',
      type: org.type,
      phone: org.phone ?? '',
      email: org.email ?? '',
      address: org.address ?? '',
    });
    setEditErrors({});
    setEditSubmitError(null);
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditErrors({});
    setEditSubmitError(null);
  }

  function setEditField(field: keyof EditFormState, value: string) {
    setEditValues((prev) => ({ ...prev, [field]: value }));
    setEditErrors((prev) => ({ ...prev, [field]: undefined }) as EditFormErrors);
    setEditSubmitError(null);
  }

  function validateEdit(): EditFormErrors {
    const errs: EditFormErrors = {};
    if (!editValues.name.trim()) errs.name = t('edit.validation.nameRequired');
    if (editValues.email.trim() && !EMAIL_RE.test(editValues.email.trim())) {
      errs.email = t('edit.validation.emailFormat');
    }
    return errs;
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateEdit();
    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }
    setEditSubmitError(null);
    try {
      await updateOrganization.mutateAsync({
        id,
        dto: {
          name: editValues.name.trim(),
          nameAr: trimmedOrUndefined(editValues.nameAr),
          type: editValues.type,
          phone: trimmedOrUndefined(editValues.phone),
          email: trimmedOrUndefined(editValues.email),
          address: trimmedOrUndefined(editValues.address),
        },
      });
      setIsEditing(false);
    } catch (err) {
      setEditSubmitError(err instanceof Error ? err.message : t('edit.error.generic'));
    }
  }

  async function handleSuspendConfirm() {
    setStatusError(null);
    try {
      await toggleStatus.mutateAsync({ id, isActive: false });
      setConfirmingSuspend(false);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : t('status.error.generic'));
    }
  }

  async function handleActivate() {
    setStatusError(null);
    try {
      await toggleStatus.mutateAsync({ id, isActive: true });
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : t('status.error.generic'));
    }
  }

  const branches = allBranches.filter((b) => b.organizationId === id);
  const orgUsers = allUsers.filter((u) => u.organizationId === id);
  const orgAdmins = orgUsers.filter((u) => u.role === 'ORG_ADMIN');
  const staffUsers = orgUsers.filter(
    (u) => u.role !== 'ORG_ADMIN' && u.role !== 'SUPER_ADMIN',
  );
  const activeStaffCount = staffUsers.filter(
    (u) => u.isActive && !u.deletedAt,
  ).length;

  const dataLoading = orgLoading || branchesLoading || usersLoading;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/dashboard/platform/organizations"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('back')}
        </Link>
      </div>

      {dataLoading && !orgError && (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      )}

      {orgError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{t('notFound')}</p>
        </div>
      )}

      {!orgLoading && !orgError && org && (
        <>
          {/* Header */}
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-foreground">{org.name}</h1>
              {org.nameAr && (
                <p className="mt-0.5 text-base text-muted-foreground">{org.nameAr}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                {org.type}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  org.isActive
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {org.isActive ? t('status.active') : t('status.inactive')}
              </span>
            </div>
          </div>

          {/* Profile card */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">{t('sections.profile')}</h2>
              {!isEditing && (
                <button
                  onClick={startEdit}
                  className="h-7 rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-accent"
                >
                  {t('edit.editButton')}
                </button>
              )}
            </div>

            {!isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('fields.name')}: </span>
                  <span className="text-foreground">{org.name}</span>
                </div>
                {org.nameAr && (
                  <div>
                    <span className="text-muted-foreground">{t('fields.nameAr')}: </span>
                    <span className="text-foreground">{org.nameAr}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">{t('fields.type')}: </span>
                  <span className="text-foreground">{org.type}</span>
                </div>
                {org.phone && (
                  <div>
                    <span className="text-muted-foreground">{t('fields.phone')}: </span>
                    <span className="text-foreground">{org.phone}</span>
                  </div>
                )}
                {org.email && (
                  <div>
                    <span className="text-muted-foreground">{t('fields.email')}: </span>
                    <span className="text-foreground">{org.email}</span>
                  </div>
                )}
                {org.address && (
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">{t('fields.address')}: </span>
                    <span className="text-foreground">{org.address}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">{t('fields.registered')}: </span>
                  <span className="text-foreground">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEditSubmit} noValidate className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel required>{t('edit.fields.name')}</FieldLabel>
                    <input
                      type="text"
                      value={editValues.name}
                      onChange={(e) => setEditField('name', e.target.value)}
                      className={inputClass(!!editErrors.name)}
                      disabled={updateOrganization.isPending}
                    />
                    <FieldError message={editErrors.name} />
                  </div>
                  <div>
                    <FieldLabel>{t('edit.fields.nameAr')}</FieldLabel>
                    <input
                      type="text"
                      value={editValues.nameAr}
                      onChange={(e) => setEditField('nameAr', e.target.value)}
                      className={inputClass()}
                      disabled={updateOrganization.isPending}
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <FieldLabel required>{t('edit.fields.type')}</FieldLabel>
                    <select
                      value={editValues.type}
                      onChange={(e) => setEditField('type', e.target.value)}
                      className={inputClass()}
                      disabled={updateOrganization.isPending}
                    >
                      {ORG_TYPES.map((ty) => (
                        <option key={ty} value={ty}>
                          {t(`edit.types.${ty}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>{t('edit.fields.phone')}</FieldLabel>
                    <input
                      type="tel"
                      value={editValues.phone}
                      onChange={(e) => setEditField('phone', e.target.value)}
                      className={inputClass()}
                      disabled={updateOrganization.isPending}
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <FieldLabel>{t('edit.fields.email')}</FieldLabel>
                    <input
                      type="email"
                      value={editValues.email}
                      onChange={(e) => setEditField('email', e.target.value)}
                      className={inputClass(!!editErrors.email)}
                      disabled={updateOrganization.isPending}
                      dir="ltr"
                    />
                    <FieldError message={editErrors.email} />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>{t('edit.fields.address')}</FieldLabel>
                    <input
                      type="text"
                      value={editValues.address}
                      onChange={(e) => setEditField('address', e.target.value)}
                      className={inputClass()}
                      disabled={updateOrganization.isPending}
                    />
                  </div>
                </div>

                {editSubmitError && <p className="text-sm text-destructive">{editSubmitError}</p>}

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={updateOrganization.isPending}
                    className="h-8 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {updateOrganization.isPending ? t('edit.saving') : t('edit.save')}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={updateOrganization.isPending}
                    className="h-8 rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    {t('edit.cancel')}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Status control */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">{t('status.sectionTitle')}</h2>
            <p className="text-sm text-muted-foreground">
              {org.isActive ? t('status.currentlyActive') : t('status.currentlyInactive')}
            </p>

            {statusError && <p className="text-sm text-destructive">{statusError}</p>}

            {org.isActive ? (
              !confirmingSuspend ? (
                <button
                  onClick={() => setConfirmingSuspend(true)}
                  className="h-8 rounded-md border border-destructive/40 bg-destructive/10 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
                >
                  {t('status.suspendButton')}
                </button>
              ) : (
                <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm text-foreground">{t('status.suspendWarning')}</p>
                  <p className="text-sm font-medium text-destructive">{t('status.confirmSuspendPrompt')}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSuspendConfirm}
                      disabled={toggleStatus.isPending}
                      className="h-7 rounded-md border border-destructive/40 bg-destructive/10 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                    >
                      {toggleStatus.isPending ? t('status.suspending') : t('status.confirmSuspend')}
                    </button>
                    <button
                      onClick={() => {
                        setConfirmingSuspend(false);
                        setStatusError(null);
                      }}
                      disabled={toggleStatus.isPending}
                      className="h-7 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                    >
                      {t('status.cancel')}
                    </button>
                  </div>
                </div>
              )
            ) : (
              <button
                onClick={handleActivate}
                disabled={toggleStatus.isPending}
                className="h-8 rounded-md border border-primary/40 bg-primary/10 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
              >
                {toggleStatus.isPending ? t('status.activating') : t('status.activateButton')}
              </button>
            )}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t('stats.branches'), value: branches.length },
              { label: t('stats.totalUsers'), value: orgUsers.length },
              { label: t('stats.orgAdmins'), value: orgAdmins.length },
              { label: t('stats.activeStaff'), value: activeStaffCount },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-lg border border-border bg-card p-3 text-center"
              >
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {/* Branches table */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">{t('sections.branches')}</h2>
            {branches.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noBranches')}</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('branchColumns.name')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('branchColumns.phone')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('branchColumns.address')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('branchColumns.status')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('branchColumns.createdAt')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {branches.map((branch) => (
                      <tr key={branch.id} className="bg-background">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{branch.name}</p>
                          {branch.nameAr && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{branch.nameAr}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {branch.phone ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {branch.address ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              branch.isActive
                                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}
                          >
                            {branch.isActive ? t('status.active') : t('status.inactive')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(branch.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Org admins table */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">{t('sections.admins')}</h2>
            {orgAdmins.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noAdmins')}</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('userColumns.name')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('userColumns.phone')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('userColumns.email')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('userColumns.status')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('userColumns.lastLogin')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orgAdmins.map((admin) => (
                      <tr key={admin.id} className={`bg-background ${admin.deletedAt ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">
                            {admin.firstName} {admin.lastName}
                          </p>
                          {(admin.firstNameAr || admin.lastNameAr) && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {admin.firstNameAr} {admin.lastNameAr}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{admin.phone}</td>
                        <td className="px-4 py-3 text-muted-foreground">{admin.email ?? '—'}</td>
                        <td className="px-4 py-3">
                          {admin.deletedAt ? (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                              {t('userStatus.deactivated')}
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                admin.isActive
                                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                              }`}
                            >
                              {admin.isActive ? t('status.active') : t('status.inactive')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {admin.lastLoginAt
                            ? new Date(admin.lastLoginAt).toLocaleDateString()
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Staff table */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">{t('sections.staff')}</h2>
            {staffUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noStaff')}</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('userColumns.name')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('userColumns.role')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('userColumns.phone')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('userColumns.status')}</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('userColumns.lastLogin')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {staffUsers.map((staff) => (
                      <tr key={staff.id} className={`bg-background ${staff.deletedAt ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">
                            {staff.firstName} {staff.lastName}
                          </p>
                          {(staff.firstNameAr || staff.lastNameAr) && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {staff.firstNameAr} {staff.lastNameAr}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                            {staff.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{staff.phone}</td>
                        <td className="px-4 py-3">
                          {staff.deletedAt ? (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                              {t('userStatus.deactivated')}
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                staff.isActive
                                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                              }`}
                            >
                              {staff.isActive ? t('status.active') : t('status.inactive')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {staff.lastLoginAt
                            ? new Date(staff.lastLoginAt).toLocaleDateString()
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Limit note */}
          <p className="text-xs text-muted-foreground">{t('limitNote')}</p>
        </>
      )}
    </div>
  );
}
