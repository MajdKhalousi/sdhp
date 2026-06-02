'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Activity } from 'lucide-react';

export default function NotFound() {
  const t = useTranslations('error.notFound');
  const locale = useLocale();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="flex flex-col items-center gap-5 text-center">
        {/* Brand icon — matches sidebar logo */}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <Activity className="h-6 w-6 text-primary-foreground" />
        </div>

        {/* Brand name */}
        <p className="text-sm font-semibold text-muted-foreground">Elaji Health</p>

        {/* Large 404 */}
        <p className="text-8xl font-bold tracking-tight text-muted-foreground/15 select-none">
          404
        </p>

        {/* Title & description */}
        <div className="max-w-sm space-y-2">
          <h1 className="text-xl font-semibold text-foreground">{t('title')}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{t('description')}</p>
        </div>

        {/* Back to dashboard */}
        <Link
          href="/dashboard"
          locale={locale}
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('backToDashboard')}
        </Link>
      </div>
    </div>
  );
}
