'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Activity, AlertTriangle } from 'lucide-react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ reset }: ErrorPageProps) {
  const t = useTranslations('error.serverError');
  const locale = useLocale();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="flex flex-col items-center gap-5 text-center">
        {/* Brand icon */}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <Activity className="h-6 w-6 text-primary-foreground" />
        </div>

        {/* Error icon */}
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>

        {/* Title & description */}
        <div className="max-w-sm space-y-2">
          <h1 className="text-xl font-semibold text-foreground">{t('title')}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{t('description')}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={reset}
            className="inline-flex h-9 items-center justify-center rounded-md border px-5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t('retry')}
          </button>
          <Link
            href="/dashboard"
            locale={locale}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t('backToDashboard')}
          </Link>
        </div>
      </div>
    </div>
  );
}
