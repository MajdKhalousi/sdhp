'use client';

import { Link } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarDays } from 'lucide-react';
import { useDoctorsList } from '@/hooks/use-appointments';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { DoctorRef } from '@/types/appointment';

export function DoctorsList() {
  const t       = useTranslations('doctors.list');
  const tStatus = useTranslations('settings.visitTypes.status');
  const tCommon = useTranslations('common');
  const locale  = useLocale();

  const { data, isLoading, isError, refetch } = useDoctorsList();
  const doctors: DoctorRef[] = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {[t('columns.name'), t('columns.specialization'), t('columns.status'), t('columns.actions')].map((h) => (
                  <th key={h} className="px-4 py-3 text-start font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-28" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">{t('error.loadFailed')}</p>
        <button
          onClick={() => refetch()}
          className="mt-3 text-sm text-primary hover:underline"
        >
          {tCommon('actions.tryAgain')}
        </button>
      </div>
    );
  }

  if (doctors.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
        <p className="font-medium">{t('empty.heading')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('empty.subtext')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.name')}</th>
              <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.specialization')}</th>
              <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.status')}</th>
              <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('columns.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((doc) => (
              <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">
                  {doc.user.firstName} {doc.user.lastName}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {doc.specialization ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={doc.user.isActive ? 'default' : 'outline'}>
                    {tStatus(doc.user.isActive ? 'active' : 'inactive')}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/doctors/${doc.id}/schedule`}
                    locale={locale}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    {t('manageSchedule')}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
