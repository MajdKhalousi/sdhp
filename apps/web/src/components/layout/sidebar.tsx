'use client';

import { useEffect, useRef } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useUnsavedGuardStore } from '@/store/unsaved-guard';
import { useSidebarUiStore } from '@/store/sidebar-ui';
import {
  Activity,
  LayoutDashboard,
  ListChecks,
  Users,
  Calendar,
  ListOrdered,
  Stethoscope,
  ClipboardList,
  FlaskConical,
  ScanLine,
  CreditCard,
  Receipt,
  BarChart2,
  Settings,
  UserCog,
  CalendarClock,
  BookMarked,
  CircleUser,
  Building2,
  List,
  Wallet,
  ScrollText,
  Briefcase,
  ListTodo,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import {
  NAV_DASHBOARD_ROLES,
  NAV_TODAY_ROLES,
  NAV_PATIENTS_ROLES,
  NAV_APPOINTMENTS_ROLES,
  NAV_QUEUE_ROLES,
  NAV_DOCTOR_WORKSPACE_ROLES,
  NAV_DOCTOR_QUEUE_ROLES,
  NAV_MY_FOLLOW_UPS_ROLES,
  NAV_TECHNICIAN_LABS_ROLES,
  NAV_TECHNICIAN_RADIOLOGY_ROLES,
  NAV_MEDICAL_SERVICES_QUEUE_ROLES,
  NAV_FOLLOW_UPS_ROLES,
  NAV_CASHIER_ROLES,
  NAV_INVOICES_ROLES,
  NAV_BILLING_REPORTS_ROLES,
  NAV_DOCTORS_ROLES,
  NAV_PLATFORM_ROLES,
  NAV_PLATFORM_ORGANIZATIONS_ROLES,
  NAV_PLATFORM_PAYMENTS_ROLES,
  NAV_PLATFORM_AUDIT_LOGS_ROLES,
  NAV_PLATFORM_USERS_ROLES,
  NAV_SETTINGS_ROLES,
  NAV_HR_ROLES,
  NAV_PROFILE_ROLES,
} from '@/lib/permissions';

// Group keys map 1:1 to nav.groups.* i18n labels. Order here is render order.
type NavGroupKey =
  | 'main'
  | 'patients'
  | 'appointmentsQueue'
  | 'medicalWork'
  | 'billingCashier'
  | 'admin'
  | 'settings'
  | 'platform'
  | 'profile';

type NavItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: readonly string[];
  group: NavGroupKey;
};

const GROUP_ORDER: NavGroupKey[] = [
  'main',
  'patients',
  'appointmentsQueue',
  'medicalWork',
  'billingCashier',
  'admin',
  'settings',
  'platform',
  'profile',
];

// One representative icon per group row — distinct from each item's own
// icon, defined separately here rather than derived from NAV_ITEMS so item
// meaning/data is never touched for a purely presentational concern.
const GROUP_ICONS: Record<NavGroupKey, React.ComponentType<{ className?: string }>> = {
  main: LayoutDashboard,
  patients: Users,
  appointmentsQueue: Calendar,
  medicalWork: Stethoscope,
  billingCashier: CreditCard,
  admin: Briefcase,
  settings: Settings,
  platform: Building2,
  profile: CircleUser,
};

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',                      icon: LayoutDashboard, roles: NAV_DASHBOARD_ROLES,             group: 'main' },
  { href: '/dashboard/today',                icon: ListChecks,      roles: NAV_TODAY_ROLES,                 group: 'main' },
  { href: '/dashboard/patients',             icon: Users,           roles: NAV_PATIENTS_ROLES,              group: 'patients' },
  { href: '/dashboard/follow-ups',           icon: CalendarClock,   roles: NAV_FOLLOW_UPS_ROLES,            group: 'patients' },
  { href: '/dashboard/my-follow-ups',        icon: BookMarked,      roles: NAV_MY_FOLLOW_UPS_ROLES,         group: 'patients' },
  { href: '/dashboard/appointments',         icon: Calendar,        roles: NAV_APPOINTMENTS_ROLES,          group: 'appointmentsQueue' },
  { href: '/dashboard/queue',                icon: ListOrdered,     roles: NAV_QUEUE_ROLES,                 group: 'appointmentsQueue' },
  { href: '/dashboard/doctor/queue',         icon: ClipboardList,   roles: NAV_DOCTOR_QUEUE_ROLES,          group: 'appointmentsQueue' },
  { href: '/dashboard/doctor',               icon: Stethoscope,     roles: NAV_DOCTOR_WORKSPACE_ROLES,      group: 'medicalWork' },
  { href: '/dashboard/technician/labs',      icon: FlaskConical,    roles: NAV_TECHNICIAN_LABS_ROLES,       group: 'medicalWork' },
  { href: '/dashboard/technician/radiology', icon: ScanLine,        roles: NAV_TECHNICIAN_RADIOLOGY_ROLES,  group: 'medicalWork' },
  { href: '/dashboard/medical-services-queue', icon: ListTodo,      roles: NAV_MEDICAL_SERVICES_QUEUE_ROLES, group: 'medicalWork' },
  { href: '/dashboard/cashier',              icon: CreditCard,      roles: NAV_CASHIER_ROLES,               group: 'billingCashier' },
  { href: '/dashboard/invoices',             icon: Receipt,         roles: NAV_INVOICES_ROLES,              group: 'billingCashier' },
  { href: '/dashboard/reports/billing',      icon: BarChart2,       roles: NAV_BILLING_REPORTS_ROLES,       group: 'billingCashier' },
  { href: '/dashboard/doctors',              icon: UserCog,         roles: NAV_DOCTORS_ROLES,               group: 'admin' },
  { href: '/dashboard/hr',                   icon: Briefcase,       roles: NAV_HR_ROLES,                    group: 'admin' },
  { href: '/dashboard/settings/clinic',      icon: Settings,        roles: NAV_SETTINGS_ROLES,              group: 'settings' },
  { href: '/dashboard/platform/overview',      icon: Building2,     roles: NAV_PLATFORM_ROLES,              group: 'platform' },
  { href: '/dashboard/platform/organizations', icon: List,          roles: NAV_PLATFORM_ORGANIZATIONS_ROLES, group: 'platform' },
  { href: '/dashboard/platform/payments',      icon: Wallet,        roles: NAV_PLATFORM_PAYMENTS_ROLES,     group: 'platform' },
  { href: '/dashboard/platform/audit-logs',    icon: ScrollText,    roles: NAV_PLATFORM_AUDIT_LOGS_ROLES,   group: 'platform' },
  { href: '/dashboard/platform/users',         icon: Users,         roles: NAV_PLATFORM_USERS_ROLES,        group: 'platform' },
  { href: '/dashboard/profile',              icon: CircleUser,      roles: NAV_PROFILE_ROLES,               group: 'profile' },
];

// Shared by both the per-item highlight and the active-group lookup below —
// must stay byte-for-byte the same logic in both places, so it's extracted
// once instead of duplicated.
function isNavItemActive(href: string, pathname: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  if (href === '/dashboard/doctor') {
    return (
      pathname === '/dashboard/doctor' ||
      (pathname.startsWith('/dashboard/doctor/') && !pathname.startsWith('/dashboard/doctor/queue'))
    );
  }
  if (href === '/dashboard/settings/clinic') {
    return pathname.startsWith('/dashboard/settings/');
  }
  return pathname === href || pathname.startsWith(href + '/');
}

interface SidebarProps {
  isMobileDrawer?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isMobileDrawer = false, onClose }: SidebarProps = {}) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();
  const guard = useUnsavedGuardStore();
  const { user } = useAuthStore();
  const role = user?.role ?? '';
  const openGroup = useSidebarUiStore((s) => s.openGroup);
  const toggleGroup = useSidebarUiStore((s) => s.toggleGroup);

  // Close drawer on Escape key
  useEffect(() => {
    if (!isMobileDrawer || !onClose) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isMobileDrawer, onClose]);

  // Close drawer when the user navigates to a new route.
  // mountedPathRef captures the path at the moment the drawer opens; any
  // subsequent pathname change means navigation has occurred.
  const mountedPathRef = useRef(pathname);
  useEffect(() => {
    if (!isMobileDrawer || !onClose) return;
    if (pathname !== mountedPathRef.current) {
      onClose();
    }
  }, [pathname, isMobileDrawer, onClose]);

  const navItemLabels: Record<string, string> = {
    '/dashboard':                      t('items.dashboard'),
    '/dashboard/today':                t('items.today'),
    '/dashboard/patients':             t('items.patients'),
    '/dashboard/appointments':         t('items.appointments'),
    '/dashboard/queue':                t('items.queue'),
    '/dashboard/doctor':               t('items.doctorWorkspace'),
    '/dashboard/doctor/queue':         t('items.doctorQueue'),
    '/dashboard/technician/labs':      t('items.technicianLabs'),
    '/dashboard/technician/radiology': t('items.technicianRadiology'),
    '/dashboard/medical-services-queue': t('items.medicalServicesQueue'),
    '/dashboard/my-follow-ups':         t('items.myFollowUps'),
    '/dashboard/follow-ups':            t('items.followUps'),
    '/dashboard/cashier':              t('items.cashier'),
    '/dashboard/invoices':             t('items.invoices'),
    '/dashboard/reports/billing':      t('items.billingReports'),
    '/dashboard/doctors':               t('items.doctors'),
    '/dashboard/platform/overview':    t('items.platform'),
    '/dashboard/platform/organizations': t('items.organizations'),
    '/dashboard/platform/payments':    t('items.payments'),
    '/dashboard/platform/audit-logs':  t('items.auditLogs'),
    '/dashboard/platform/users':       t('items.users'),
    '/dashboard/settings/clinic':      t('items.settings'),
    '/dashboard/hr':                   t('items.hr'),
    '/dashboard/profile':              t('items.profile'),
  };

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  // Group visible items in GROUP_ORDER order; groups with zero visible
  // items are omitted entirely so a role never sees an empty section header.
  const visibleGroups = GROUP_ORDER
    .map((groupKey) => ({
      groupKey,
      items: visibleItems.filter((item) => item.group === groupKey),
    }))
    .filter((group) => group.items.length > 0);

  // Recomputed from the live pathname on every render — the active route's
  // group must always be open, even if it was previously closed/never
  // opened in persisted state.
  const activeGroupKey = visibleGroups.find((group) =>
    group.items.some((item) => isNavItemActive(item.href, pathname)),
  )?.groupKey;

  const asideClass = isMobileDrawer
    ? `fixed inset-y-0 z-50 flex w-64 flex-col border-r bg-sidebar ${locale === 'ar' ? 'right-0' : 'left-0'}`
    : 'flex h-screen w-64 flex-col border-r bg-sidebar';

  return (
    <aside className={asideClass}>
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Activity className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-bold text-sidebar-foreground leading-none">
            {t('brand')}
          </p>
          <p className="text-xs text-sidebar-foreground/60 mt-0.5">
            {t('brandSubtitle')}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-auto py-4">
        <div className="space-y-1 px-3">
          {visibleGroups.map(({ groupKey, items }) => {
            const GroupIcon = GROUP_ICONS[groupKey];

            // Single-item groups (Settings, Profile) render as plain
            // direct-navigation rows — an accordion that only ever reveals
            // one child is pure overhead, and it's also what caused the
            // group label vs. item label duplication for these two groups.
            if (items.length === 1) {
              const item = items[0];
              const isActive = isNavItemActive(item.href, pathname);

              return (
                <Link
                  key={groupKey}
                  href={item.href}
                  locale={locale}
                  onClick={(e) => {
                    if (guard.enabled) {
                      e.preventDefault();
                      guard.requestNavigate(() => router.push(item.href));
                    }
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                >
                  <GroupIcon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-start">{t(`groups.${groupKey}`)}</span>
                </Link>
              );
            }

            // Active group is force-open regardless of persisted/manual
            // state — see the activeGroupKey comment above. At most two
            // groups can ever be open: the active one + the single
            // manually-open one (single-open accordion).
            const isActiveGroup = groupKey === activeGroupKey;
            const isOpen = groupKey === openGroup || isActiveGroup;
            const panelId = `nav-group-panel-${groupKey}`;

            return (
              <div key={groupKey}>
                <button
                  type="button"
                  onClick={() => toggleGroup(groupKey)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border-s-2 px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    isActiveGroup
                      ? 'border-primary bg-sidebar-accent/30 text-sidebar-foreground'
                      : 'border-transparent text-sidebar-foreground/70',
                  )}
                >
                  <GroupIcon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-start">{t(`groups.${groupKey}`)}</span>
                  <ChevronDown
                    className={cn('h-4 w-4 shrink-0 transition-transform', isOpen && 'rotate-180')}
                  />
                </button>
                {isOpen && (
                  <ul id={panelId} className="mt-1 space-y-0.5 ps-7">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const isActive = isNavItemActive(item.href, pathname);

                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            locale={locale}
                            onClick={(e) => {
                              if (guard.enabled) {
                                e.preventDefault();
                                guard.requestNavigate(() => router.push(item.href));
                              }
                            }}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-normal transition-colors',
                              isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            {navItemLabels[item.href]}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <p className="text-center text-xs text-sidebar-foreground/40">
          {t('footer')}
        </p>
      </div>
    </aside>
  );
}
