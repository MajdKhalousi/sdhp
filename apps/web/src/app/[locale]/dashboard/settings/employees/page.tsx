'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';

// Employee Profiles moved to /dashboard/hr/employees (145C) to remove the
// duplicate navigation surface between Settings and the HR module. This
// stub exists only so old bookmarks/links keep working.
export default function EmployeesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/hr/employees');
  }, [router]);

  return null;
}
