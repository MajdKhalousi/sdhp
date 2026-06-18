'use client';

import { useEffect, useRef } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useUnsavedGuardStore } from '@/store/unsaved-guard';
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
  NAV_FOLLOW_UPS_ROLES,
  NAV_CASHIER_ROLES,
  NAV_INVOICES_ROLES,
  NAV_BILLING_REPORTS_ROLES,
  NAV_DOCTORS_ROLES,
  NAV_PLATFORM_ROLES,
  NAV_PLATFORM_ORGANIZATIONS_ROLES,
  NAV_PLATFORM_PAYMENTS_ROLES,
  NAV_PLATFORM_AUDIT_LOGS_ROLES,
  NAV_SETTINGS_ROLES,
  NAV_PROFILE_ROLES,
} from '@/lib/permissions';

type NavItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: readonly string[];
};

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',                      icon: LayoutDashboard, roles: NAV_DASHBOARD_ROLES },
  { href: '/dashboard/today',                icon: ListChecks,      roles: NAV_TODAY_ROLES },
  { href: '/dashboard/patients',             icon: Users,           roles: NAV_PATIENTS_ROLES },
  { href: '/dashboard/appointments',         icon: Calendar,        roles: NAV_APPOINTMENTS_ROLES },
  { href: '/dashboard/queue',                icon: ListOrdered,     roles: NAV_QUEUE_ROLES },
  { href: '/dashboard/doctor',               icon: Stethoscope,     roles: NAV_DOCTOR_WORKSPACE_ROLES },
  { href: '/dashboard/doctor/queue',         icon: ClipboardList,   roles: NAV_DOCTOR_QUEUE_ROLES },
  { href: '/dashboard/my-follow-ups',        icon: BookMarked,      roles: NAV_MY_FOLLOW_UPS_ROLES },
  { href: '/dashboard/technician/labs',      icon: FlaskConical,    roles: NAV_TECHNICIAN_LABS_ROLES },
  { href: '/dashboard/technician/radiology', icon: ScanLine,        roles: NAV_TECHNICIAN_RADIOLOGY_ROLES },
  { href: '/dashboard/follow-ups',           icon: CalendarClock,   roles: NAV_FOLLOW_UPS_ROLES },
  { href: '/dashboard/cashier',              icon: CreditCard,      roles: NAV_CASHIER_ROLES },
  { href: '/dashboard/invoices',             icon: Receipt,         roles: NAV_INVOICES_ROLES },
  { href: '/dashboard/reports/billing',      icon: BarChart2,       roles: NAV_BILLING_REPORTS_ROLES },
  { href: '/dashboard/doctors',              icon: UserCog,         roles: NAV_DOCTORS_ROLES },
  { href: '/dashboard/platform/overview',      icon: Building2,     roles: NAV_PLATFORM_ROLES },
  { href: '/dashboard/platform/organizations', icon: List,          roles: NAV_PLATFORM_ORGANIZATIONS_ROLES },
  { href: '/dashboard/platform/payments',      icon: Wallet,        roles: NAV_PLATFORM_PAYMENTS_ROLES },
  { href: '/dashboard/platform/audit-logs',    icon: ScrollText,    roles: NAV_PLATFORM_AUDIT_LOGS_ROLES },
  { href: '/dashboard/settings/clinic',      icon: Settings,        roles: NAV_SETTINGS_ROLES },
  { href: '/dashboard/profile',              icon: CircleUser,      roles: NAV_PROFILE_ROLES },
];

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
    '/dashboard/settings/clinic':      t('items.settings'),
    '/dashboard/profile':              t('items.profile'),
  };

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

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
        <ul className="space-y-0.5 px-3">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : item.href === '/dashboard/doctor'
                ? pathname === '/dashboard/doctor' ||
                  (pathname.startsWith('/dashboard/doctor/') && !pathname.startsWith('/dashboard/doctor/queue'))
                : item.href === '/dashboard/settings/clinic'
                ? pathname.startsWith('/dashboard/settings/')
                : pathname === item.href || pathname.startsWith(item.href + '/');

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
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
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
