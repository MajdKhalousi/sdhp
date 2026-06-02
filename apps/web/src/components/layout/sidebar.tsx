'use client';

import { useEffect, useRef } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
  Activity,
  LayoutDashboard,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

type NavItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
};

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR', 'NURSE', 'SECRETARY', 'ACCOUNTANT', 'TECHNICIAN'],
  },
  {
    href: '/dashboard/patients',
    icon: Users,
    roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR', 'NURSE', 'SECRETARY', 'ACCOUNTANT'],
  },
  {
    href: '/dashboard/appointments',
    icon: Calendar,
    roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR', 'NURSE', 'SECRETARY'],
  },
  {
    href: '/dashboard/queue',
    icon: ListOrdered,
    roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'NURSE', 'SECRETARY'],
  },
  {
    href: '/dashboard/doctor',
    icon: Stethoscope,
    roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR'],
  },
  {
    href: '/dashboard/doctor/queue',
    icon: ClipboardList,
    roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR'],
  },
  {
    href: '/dashboard/my-follow-ups',
    icon: BookMarked,
    roles: ['DOCTOR'],
  },
  {
    href: '/dashboard/technician/labs',
    icon: FlaskConical,
    roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'TECHNICIAN'],
  },
  {
    href: '/dashboard/technician/radiology',
    icon: ScanLine,
    roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'TECHNICIAN'],
  },
  {
    href: '/dashboard/follow-ups',
    icon: CalendarClock,
    roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'BRANCH_ADMIN', 'NURSE', 'SECRETARY'],
  },
  {
    href: '/dashboard/cashier',
    icon: CreditCard,
    roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'ACCOUNTANT', 'SECRETARY'],
  },
  {
    href: '/dashboard/invoices',
    icon: Receipt,
    roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'ACCOUNTANT', 'SECRETARY'],
  },
  {
    href: '/dashboard/reports/billing',
    icon: BarChart2,
    roles: ['SUPER_ADMIN', 'ORG_ADMIN', 'ACCOUNTANT'],
  },
  {
    href: '/dashboard/doctors',
    icon: UserCog,
    roles: ['SUPER_ADMIN', 'ORG_ADMIN'],
  },
  {
    href: '/dashboard/settings/clinic',
    icon: Settings,
    roles: ['SUPER_ADMIN', 'ORG_ADMIN'],
  },
];

interface SidebarProps {
  isMobileDrawer?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isMobileDrawer = false, onClose }: SidebarProps = {}) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const locale = useLocale();
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
    '/dashboard/settings/clinic':      t('items.settings'),
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
