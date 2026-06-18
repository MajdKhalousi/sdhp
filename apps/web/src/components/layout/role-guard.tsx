'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store/auth';

interface RoleGuardProps {
  allowedRoles: { has(role: string): boolean };
  children: React.ReactNode;
  redirectTo?: string;
}

// Smallest client boundary for gating a server-component page (e.g.
// appointments/new, invoices/new) by role — the page itself stays an async
// server component; this wraps its already-rendered JSX and redirects before
// the wrapped content is shown to a disallowed role. Mirrors the
// useEffect + router.replace + conditional-null pattern used by every other
// page-level guard in this codebase (settings/layout.tsx, reports/billing,
// doctors, technician/*, etc.).
export function RoleGuard({ allowedRoles, children, redirectTo = '/dashboard' }: RoleGuardProps) {
  const router = useRouter();
  const { user } = useAuthStore();

  const allowed = !!user && allowedRoles.has(user.role);

  useEffect(() => {
    if (user && !allowed) {
      router.replace(redirectTo);
    }
  }, [user, allowed, router, redirectTo]);

  if (!user || !allowed) return null;

  return <>{children}</>;
}
