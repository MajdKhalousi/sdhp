'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Activity,
  LayoutDashboard,
  Users,
  Calendar,
  ListOrdered,
  Stethoscope,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard',              icon: LayoutDashboard },
  { href: '/dashboard/patients',     icon: Users           },
  { href: '/dashboard/appointments', icon: Calendar        },
  { href: '/dashboard/queue',        icon: ListOrdered     },
  { href: '/dashboard/doctor',       icon: Stethoscope     },
  { href: '/dashboard/doctor/queue', icon: ClipboardList   },
] as const;

export function Sidebar() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const navItemLabels = {
    '/dashboard':              t('items.dashboard'),
    '/dashboard/patients':     t('items.patients'),
    '/dashboard/appointments': t('items.appointments'),
    '/dashboard/queue':        t('items.queue'),
    '/dashboard/doctor':       t('items.doctorWorkspace'),
    '/dashboard/doctor/queue': t('items.doctorQueue'),
  } as const;

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-sidebar">
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
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : item.href === '/dashboard/doctor'
                ? pathname === '/dashboard/doctor' ||
                  (pathname.startsWith('/dashboard/doctor/') && !pathname.startsWith('/dashboard/doctor/queue'))
                : pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
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
