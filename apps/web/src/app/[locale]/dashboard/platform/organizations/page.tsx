'use client';

import { useEffect } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth';
import { PLATFORM_ACCESS_ROLES } from '@/lib/permissions';
import { useOrganizations } from '@/hooks/use-organizations';

export default function PlatformOrganizationsPage() {
  const t = useTranslations('platform.organizations');
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && !PLATFORM_ACCESS_ROLES.has(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const { data: organizations, isLoading, isError } = useOrganizations();

  if (!user || !PLATFORM_ACCESS_ROLES.has(user.role)) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      )}

      {isError && (
        <p className="text-sm text-destructive">{t('error')}</p>
      )}

      {!isLoading && !isError && organizations?.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      )}

      {!isLoading && !isError && organizations && organizations.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t('columns.name')}
                </th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t('columns.type')}
                </th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t('columns.contact')}
                </th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t('columns.status')}
                </th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t('columns.createdAt')}
                </th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {organizations.map((org) => (
                <tr key={org.id} className="bg-background">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{org.name}</p>
                    {org.nameAr && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{org.nameAr}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                      {org.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {org.phone && <p>{org.phone}</p>}
                    {org.email && <p>{org.email}</p>}
                    {!org.phone && !org.email && '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        org.isActive
                          ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {org.isActive ? t('status.active') : t('status.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/platform/organizations/${org.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {t('columns.view')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
