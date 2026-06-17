'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth';
import { PLATFORM_ACCESS_ROLES } from '@/lib/permissions';
import { useOrganization } from '@/hooks/use-organizations';
import { useBranches } from '@/hooks/use-branches';
import { useStaff } from '@/hooks/use-staff';

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

  if (!user || !isSuperAdmin) return null;

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
            <h2 className="text-sm font-semibold text-foreground">{t('sections.profile')}</h2>
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
