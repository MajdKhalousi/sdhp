'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store/auth';
import { SUPER_ADMIN_ALLOWED_PATH_PREFIXES } from '@/lib/permissions';

// usePathname() from '@/i18n/navigation' (next-intl) already strips the
// locale segment — '/en/dashboard/patients' and '/dashboard/patients' (the
// default locale, which has no prefix per routing.ts's localePrefix:
// 'as-needed') both resolve to the same '/dashboard/patients' string here,
// matching how sidebar.tsx and settings/layout.tsx already compare paths.
function isAllowedForSuperAdmin(pathname: string): boolean {
  if (pathname === '/dashboard') return true;
  return SUPER_ADMIN_ALLOWED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// Renders nothing (instead of the clinic page) for SUPER_ADMIN on any
// /dashboard/* route outside the platform-only allow-list, while redirecting
// away — this is nested inside AuthGuard, so the auth store has already
// rehydrated by the time this runs.
export function PlatformOnlyGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);

  const blocked = role === 'SUPER_ADMIN' && !isAllowedForSuperAdmin(pathname);

  useEffect(() => {
    if (blocked) {
      router.replace('/dashboard/platform/overview');
    }
  }, [blocked, router]);

  if (blocked) return null;

  return <>{children}</>;
}
