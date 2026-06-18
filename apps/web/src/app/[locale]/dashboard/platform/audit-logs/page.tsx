'use client';

import { Fragment, useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Search } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store/auth';
import { PLATFORM_ACCESS_ROLES } from '@/lib/permissions';
import { useOrganizations } from '@/hooks/use-organizations';
import { useAuditLogs } from '@/hooks/use-audit-logs';
import type { AuditLog } from '@/types/audit-log';

const LIMIT = 50;

// Duplicated locally rather than imported from Overview (136E), consistent
// with this codebase's per-page-duplication convention for small helpers.
function shortenId(id: string | null): string {
  if (!id) return '—';
  if (id.length <= 14) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

function formatAuditDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    numberingSystem: 'latn',
  }).format(new Date(value));
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function hasChanges(log: AuditLog): boolean {
  return log.oldData != null || log.newData != null;
}

export default function PlatformAuditLogsPage() {
  const t = useTranslations('platform.auditLogs');
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuthStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [hasChangesOnly, setHasChangesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user && !PLATFORM_ACCESS_ROLES.has(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const isSuperAdmin = !!user && PLATFORM_ACCESS_ROLES.has(user.role);

  // Reset to page 1 whenever a server-side filter changes — a stale page
  // number from a previous, larger result set could land past the end.
  useEffect(() => {
    setPage(1);
  }, [actionFilter, resourceFilter, dateFrom, dateTo]);

  const { data: organizations = [] } = useOrganizations();
  const orgMap = new Map(organizations.map((o) => [o.id, o.name]));

  const from = dateFrom ? `${dateFrom}T00:00:00.000Z` : undefined;
  const to = dateTo ? `${dateTo}T23:59:59.999Z` : undefined;

  const { data: result, isLoading, isError } = useAuditLogs({
    action: actionFilter || undefined,
    resource: resourceFilter || undefined,
    from,
    to,
    page,
    limit: LIMIT,
  });

  if (!user || !isSuperAdmin) return null;

  const rows = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  function organizationName(log: AuditLog): string {
    if (!log.organizationId) return '—';
    return orgMap.get(log.organizationId) ?? shortenId(log.organizationId);
  }

  function actorName(log: AuditLog): string {
    if (log.user) return `${log.user.firstName} ${log.user.lastName}`;
    return shortenId(log.userId);
  }

  const filteredRows = rows.filter((log) => {
    if (hasChangesOnly && !hasChanges(log)) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    const haystack = [log.action, log.resource, log.resourceId ?? '', organizationName(log), actorName(log)]
      .join(' ')
      .toLowerCase();
    return haystack.includes(term);
  });

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/platform/overview"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {t('title')}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">{t('loading')}</p>}

      {isError && <p className="text-sm text-destructive">{t('error')}</p>}

      {!isLoading && !isError && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative w-64">
              <Search className="absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('filters.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full rounded-md border bg-background ps-8 pe-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
              />
            </div>

            <input
              type="text"
              placeholder={t('filters.actionAll')}
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-9 w-44 rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
            />

            <input
              type="text"
              placeholder={t('filters.resourceAll')}
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              className="h-9 w-44 rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
            />

            <div className="flex items-center gap-1.5">
              <label className="text-sm text-muted-foreground">{t('filters.dateFrom')}</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 rounded-md border bg-background px-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-sm text-muted-foreground">{t('filters.dateTo')}</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 rounded-md border bg-background px-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
              />
            </div>

            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={hasChangesOnly}
                onChange={(e) => setHasChangesOnly(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              {t('filters.hasChanges')}
            </label>
          </div>

          {filteredRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('empty')}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.time')}</th>
                    <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.action')}</th>
                    <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.resource')}</th>
                    <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.resourceId')}</th>
                    <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.actor')}</th>
                    <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.organization')}</th>
                    <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.details')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRows.map((log) => {
                    const expanded = expandedIds.has(log.id);
                    return (
                      <Fragment key={log.id}>
                        <tr className="bg-background">
                          <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                            {formatAuditDate(log.createdAt, locale)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{log.action}</td>
                          <td className="px-4 py-3 text-muted-foreground">{log.resource}</td>
                          <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                            <span title={log.resourceId ?? undefined}>{shortenId(log.resourceId)}</span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground" title={log.userId ?? undefined}>
                            {actorName(log)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground" title={log.organizationId ?? undefined}>
                            {organizationName(log)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleExpanded(log.id)}
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              {expanded ? t('details.hideLabel') : t('details.viewLabel')}
                            </button>
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="bg-muted/30">
                            <td colSpan={7} className="px-4 py-3">
                              {!hasChanges(log) ? (
                                <p className="text-sm text-muted-foreground">{t('details.noDetails')}</p>
                              ) : (
                                <div className="grid gap-3 sm:grid-cols-2">
                                  {log.oldData != null && (
                                    <div>
                                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                                        {t('details.oldData')}
                                      </p>
                                      <pre className="max-h-64 overflow-auto rounded-md border bg-background p-2 text-xs" dir="ltr">
                                        {stringifyJson(log.oldData)}
                                      </pre>
                                    </div>
                                  )}
                                  {log.newData != null && (
                                    <div>
                                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                                        {t('details.newData')}
                                      </p>
                                      <pre className="max-h-64 overflow-auto rounded-md border bg-background p-2 text-xs" dir="ltr">
                                        {stringifyJson(log.newData)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {t('pagination.pageInfo', { page, totalPages, total })}
            </p>
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
        </>
      )}
    </div>
  );
}
