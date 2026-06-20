'use client';

import { useMemo } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import type { LucideIcon } from 'lucide-react';
import {
  Users, UserCheck, UserMinus, UserX, Link2, Unlink, Wallet, CalendarClock, Briefcase,
} from 'lucide-react';
import { useEmployees } from '@/hooks/use-employees';
import { formatAmount } from '@/lib/format-currency';
import { formatDateDisplay } from '@/lib/format-date';
import { Skeleton } from '@/components/ui/skeleton';

const CONTRACT_ENDING_SOON_DAYS = 30;
const RECENT_COUNT = 5;

interface StatCard {
  key: string;
  label: string;
  value: string | number;
  sub: string;
  icon: LucideIcon;
  href?: string;
}

export default function HrDashboardPage() {
  const t = useTranslations('hr.dashboard');
  const locale = useLocale();
  const { data: employees, isLoading, isError, error, refetch } = useEmployees(false);

  const stats = useMemo(() => {
    const items = employees ?? [];
    const now = Date.now();
    const soonCutoff = now + CONTRACT_ENDING_SOON_DAYS * 24 * 60 * 60 * 1000;

    const active = items.filter((e) => e.employmentStatus === 'ACTIVE').length;
    const onLeave = items.filter((e) => e.employmentStatus === 'ON_LEAVE').length;
    const terminated = items.filter((e) => e.employmentStatus === 'TERMINATED').length;
    const withAccount = items.filter((e) => !!e.userId).length;
    const withoutAccount = items.filter((e) => !e.userId).length;
    const totalBaseSalary = items.reduce((sum, e) => sum + (e.baseSalary ? parseFloat(e.baseSalary) : 0), 0);
    const contractsEndingSoon = items.filter((e) => {
      if (!e.contractEndAt) return false;
      const t = new Date(e.contractEndAt).getTime();
      return t >= now && t <= soonCutoff;
    }).length;

    const recent = [...items]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, RECENT_COUNT);

    return {
      total: items.length,
      active,
      onLeave,
      terminated,
      withAccount,
      withoutAccount,
      totalBaseSalary,
      contractsEndingSoon,
      recent,
    };
  }, [employees]);

  const cards: StatCard[] = [
    { key: 'total', label: t('cards.totalEmployees'), value: stats.total, sub: t('cards.totalEmployeesSub'), icon: Users, href: '/dashboard/hr/employees' },
    { key: 'active', label: t('cards.active'), value: stats.active, sub: t('cards.activeSub'), icon: UserCheck },
    { key: 'onLeave', label: t('cards.onLeave'), value: stats.onLeave, sub: t('cards.onLeaveSub'), icon: UserMinus },
    { key: 'terminated', label: t('cards.terminated'), value: stats.terminated, sub: t('cards.terminatedSub'), icon: UserX },
    { key: 'withAccount', label: t('cards.withAccount'), value: stats.withAccount, sub: t('cards.withAccountSub'), icon: Link2 },
    { key: 'withoutAccount', label: t('cards.withoutAccount'), value: stats.withoutAccount, sub: t('cards.withoutAccountSub'), icon: Unlink },
    { key: 'totalBaseSalary', label: t('cards.totalBaseSalary'), value: formatAmount(stats.totalBaseSalary, locale), sub: t('cards.totalBaseSalarySub'), icon: Wallet },
    { key: 'contractsEndingSoon', label: t('cards.contractsEndingSoon'), value: stats.contractsEndingSoon, sub: t('cards.contractsEndingSoonSub'), icon: CalendarClock, href: '/dashboard/hr/employees' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 shadow-sm">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
          <p className="text-sm font-medium text-destructive">{t('errors.loadFailed')}</p>
          <p className="text-xs text-muted-foreground">{error instanceof Error ? error.message : ''}</p>
          <button onClick={() => refetch()} className="mt-1 h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent">
            {t('errors.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {stats.total === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
          <Briefcase className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">{t('empty.heading')}</p>
          <p className="text-xs text-muted-foreground">{t('empty.subtext')}</p>
          <Link href="/dashboard/hr/employees" className="mt-1 text-xs text-primary hover:underline">
            {t('empty.action')}
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon;
              const body = (
                <>
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                  </div>
                  <p className="mt-2 text-3xl font-bold tabular-nums">{card.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
                </>
              );
              const cardClass = 'rounded-xl border bg-card p-6 shadow-sm transition-colors';
              return card.href ? (
                <Link key={card.key} href={card.href} className={`${cardClass} hover:border-primary/40`}>
                  {body}
                </Link>
              ) : (
                <div key={card.key} className={cardClass}>{body}</div>
              );
            })}
          </div>

          <div className="rounded-xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base font-semibold">{t('recent.title')}</h2>
              <Link href="/dashboard/hr/employees" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                {t('recent.viewAll')}
              </Link>
            </div>
            {stats.recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-sm text-muted-foreground">{t('recent.empty')}</p>
              </div>
            ) : (
              <ul className="divide-y">
                {stats.recent.map((emp) => (
                  <li key={emp.id} className="flex items-center justify-between px-6 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-muted-foreground">{emp.jobTitle || '—'}</p>
                    </div>
                    <p className="text-xs text-muted-foreground" dir="ltr">{formatDateDisplay(emp.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
