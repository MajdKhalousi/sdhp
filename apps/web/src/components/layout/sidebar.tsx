'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  LayoutDashboard,
  Users,
  Calendar,
  ListOrdered,
  Stethoscope,
  Building2,
  UserCog,
  ClipboardList,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    labelAr: 'لوحة التحكم',
    icon: LayoutDashboard,
  },
  {
    href: '/dashboard/patients',
    label: 'Patients',
    labelAr: 'المرضى',
    icon: Users,
  },
  {
    href: '/dashboard/appointments',
    label: 'Appointments',
    labelAr: 'المواعيد',
    icon: Calendar,
  },
  {
    href: '/dashboard/queue',
    label: 'Queue',
    labelAr: 'الطابور',
    icon: ListOrdered,
  },
  {
    href: '/dashboard/encounters',
    label: 'Encounters',
    labelAr: 'الزيارات',
    icon: ClipboardList,
  },
  {
    href: '/dashboard/doctors',
    label: 'Doctors',
    labelAr: 'الأطباء',
    icon: Stethoscope,
  },
  {
    href: '/dashboard/departments',
    label: 'Departments',
    labelAr: 'الأقسام',
    icon: Building2,
  },
  {
    href: '/dashboard/staff',
    label: 'Staff',
    labelAr: 'الكوادر',
    icon: UserCog,
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    labelAr: 'الإعدادات',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Activity className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-bold text-sidebar-foreground leading-none">
            SDHP
          </p>
          <p className="text-xs text-sidebar-foreground/60 mt-0.5">
            Health Platform
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-auto py-4">
        <ul className="space-y-0.5 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
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
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <p className="text-center text-xs text-sidebar-foreground/40">
          Syrian Digital Health Platform
        </p>
      </div>
    </aside>
  );
}
