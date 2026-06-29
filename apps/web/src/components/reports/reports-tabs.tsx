'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

const REPORTS_TABS = [
  { href: '/dashboard/reports/summary', key: 'summary' },
  { href: '/dashboard/reports/appointments', key: 'appointments' },
] as const;

export function ReportsTabs() {
  const pathname = usePathname();
  const t = useTranslations('reportsNav');

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t('title')}
      </p>
      <div className="inline-flex items-center rounded-lg border bg-background p-0.5">
        {REPORTS_TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(tab.key)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
