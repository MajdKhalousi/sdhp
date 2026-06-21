'use client';

import { useMemo } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import type { LucideIcon } from 'lucide-react';
import {
  Users, UserCheck, UserMinus, UserX, Link2, Unlink, Wallet, CalendarClock, Briefcase,
  CheckCircle2, XCircle, Clock, HelpCircle, CalendarOff, Hourglass, AlertTriangle,
} from 'lucide-react';
import { useEmployees } from '@/hooks/use-employees';
import { useDailyAttendance } from '@/hooks/use-attendance';
import { useLeaveQueue } from '@/hooks/use-leave-requests';
import { formatAmount } from '@/lib/format-currency';
import { formatDateDisplay } from '@/lib/format-date';
import { Skeleton } from '@/components/ui/skeleton';

const CONTRACT_ENDING_SOON_DAYS = 30;
const RECENT_COUNT = 5;
const APPROVED_LEAVE_FETCH_LIMIT = 100;

// Browser-local calendar date as YYYY-MM-DD — same intent as the Attendance
// page's own helper, deliberately duplicated here rather than shared/exported
// (each HR sub-page keeps its own tiny date helper, see attendance-table.tsx).
function getLocalDateInputValue(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
  const today = useMemo(() => getLocalDateInputValue(), []);

  const { data: employees, isLoading, isError, error, refetch } = useEmployees(false);

  const {
    data: todayAttendance,
    isLoading: attendanceLoading,
    isError: attendanceError,
  } = useDailyAttendance(today);

  const {
    data: pendingLeaveQueue,
    isLoading: pendingLeaveLoading,
    isError: pendingLeaveError,
  } = useLeaveQueue({ status: 'PENDING', limit: 1 });

  const {
    data: approvedLeaveQueue,
    isLoading: approvedLeaveLoading,
    isError: approvedLeaveError,
  } = useLeaveQueue({ status: 'APPROVED', limit: APPROVED_LEAVE_FETCH_LIMIT });

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

  // Today's attendance snapshot — missing a record must read as "not
  // recorded", never folded into "absent" (only an explicit ABSENT status
  // counts). Records are cross-referenced against the active roster
  // (useEmployees(false), unfiltered by employmentStatus, same set the
  // Attendance page itself iterates over) before counting, so a record
  // belonging to a since-deactivated employee — orphaned, never shown on
  // the Attendance page either — can't inflate these counts or push
  // "not recorded" below zero.
  const todayStats = useMemo(() => {
    const activeIds = new Set((employees ?? []).map((e) => e.id));
    const records = (todayAttendance ?? []).filter((r) => activeIds.has(r.employeeProfileId));
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const late = records.filter((r) => r.status === 'LATE').length;
    const notRecorded = Math.max(0, activeIds.size - records.length);
    return { present, absent, late, notRecorded };
  }, [todayAttendance, employees]);

  // On-leave-today is bound by APPROVED_LEAVE_FETCH_LIMIT — an org with more
  // approved requests than that limit would undercount here. Acceptable for
  // this MVP; not worth building real aggregation for. Also cross-referenced
  // against the active roster, same reasoning as todayStats above.
  const onLeaveToday = useMemo(() => {
    const activeIds = new Set((employees ?? []).map((e) => e.id));
    const records = approvedLeaveQueue?.data ?? [];
    return records.filter(
      (r) =>
        activeIds.has(r.employeeProfileId) &&
        r.startDate <= `${today}T23:59:59.999Z` &&
        r.endDate >= `${today}T00:00:00.000Z`,
    ).length;
  }, [approvedLeaveQueue, employees, today]);

  const pendingLeaveCount = pendingLeaveQueue?.total ?? 0;

  function todayCardValue(loading: boolean, errored: boolean, value: number): string | number {
    if (errored) return '—';
    if (loading) return '…';
    return value;
  }

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

  const todayCards: StatCard[] = [
    {
      key: 'presentToday',
      label: t('cards.presentToday'),
      value: todayCardValue(attendanceLoading, attendanceError, todayStats.present),
      sub: t('cards.presentTodaySub'),
      icon: CheckCircle2,
      href: '/dashboard/hr/attendance',
    },
    {
      key: 'absentToday',
      label: t('cards.absentToday'),
      value: todayCardValue(attendanceLoading, attendanceError, todayStats.absent),
      sub: t('cards.absentTodaySub'),
      icon: XCircle,
      href: '/dashboard/hr/attendance',
    },
    {
      key: 'lateToday',
      label: t('cards.lateToday'),
      value: todayCardValue(attendanceLoading, attendanceError, todayStats.late),
      sub: t('cards.lateTodaySub'),
      icon: Clock,
      href: '/dashboard/hr/attendance',
    },
    {
      key: 'notRecordedToday',
      label: t('cards.notRecordedToday'),
      value: todayCardValue(attendanceLoading, attendanceError, todayStats.notRecorded),
      sub: t('cards.notRecordedTodaySub'),
      icon: HelpCircle,
      href: '/dashboard/hr/attendance',
    },
    {
      key: 'onLeaveToday',
      label: t('cards.onLeaveToday'),
      value: todayCardValue(approvedLeaveLoading, approvedLeaveError, onLeaveToday),
      sub: t('cards.onLeaveTodaySub'),
      icon: CalendarOff,
      href: '/dashboard/hr/leave',
    },
    {
      key: 'pendingLeaveRequests',
      label: t('cards.pendingLeaveRequests'),
      value: todayCardValue(pendingLeaveLoading, pendingLeaveError, pendingLeaveCount),
      sub: t('cards.pendingLeaveRequestsSub'),
      icon: Hourglass,
      href: '/dashboard/hr/leave',
    },
  ];

  const needsAttention = [
    !pendingLeaveError && pendingLeaveCount > 0
      ? { key: 'pendingLeave', text: t('needsAttention.pendingLeave', { count: pendingLeaveCount }), href: '/dashboard/hr/leave' }
      : null,
    !attendanceError && todayStats.notRecorded > 0
      ? { key: 'notRecorded', text: t('needsAttention.notRecorded', { count: todayStats.notRecorded }), href: '/dashboard/hr/attendance' }
      : null,
    stats.contractsEndingSoon > 0
      ? { key: 'contractsEndingSoon', text: t('needsAttention.contractsEndingSoon', { count: stats.contractsEndingSoon }), href: '/dashboard/hr/employees' }
      : null,
  ].filter((x): x is { key: string; text: string; href: string } => x !== null);

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

  function renderCardGrid(items: StatCard[]) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((card) => {
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
          {renderCardGrid(cards)}

          {renderCardGrid(todayCards)}

          <div className="rounded-xl border bg-card shadow-sm">
            <div className="border-b px-6 py-4">
              <h2 className="text-base font-semibold">{t('needsAttention.title')}</h2>
            </div>
            {needsAttention.length === 0 ? (
              <div className="flex items-center gap-2 px-6 py-4 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {t('needsAttention.empty')}
              </div>
            ) : (
              <ul className="divide-y">
                {needsAttention.map((item) => (
                  <li key={item.key}>
                    <Link href={item.href} className="flex items-center justify-between gap-2 px-6 py-3 text-sm transition-colors hover:bg-accent">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        {item.text}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
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
