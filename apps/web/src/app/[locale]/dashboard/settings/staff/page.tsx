'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';

// Login accounts moved to /dashboard/hr/accounts (146D-146G) — HR is now the
// primary home for people/accounts, mirroring how Employee Profiles moved
// to /dashboard/hr/employees (145C). This stub exists only so old
// bookmarks/links keep working.
export default function StaffPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/hr/accounts');
  }, [router]);

  return null;
}
