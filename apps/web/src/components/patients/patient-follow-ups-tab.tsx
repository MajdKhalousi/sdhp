'use client';

import { CalendarX2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFollowUps } from '@/hooks/use-follow-ups';
import { FollowUpStatusBadge } from '@/components/follow-ups/follow-up-status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateDisplay, formatDateTimeDisplay } from '@/lib/format-date';

export function PatientFollowUpsTab({ patientId }: { patientId: string }) {
  const t = useTranslations('patient.detail.followUps');
  const tFollowUps = useTranslations('followups');
  const tCommon = useTranslations('common');

  const { data, isLoading, isError, error, refetch } = useFollowUps({
    patientId,
    limit: 50,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-12 text-center">
        <p className="text-sm font-medium text-destructive">
          {error instanceof Error ? error.message : tCommon('states.error')}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-1 h-8 rounded-md border px-3 text-sm transition-colors hover:bg-accent"
        >
          {tCommon('actions.tryAgain')}
        </button>
      </div>
    );
  }

  const items = data?.data ?? [];

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <CalendarX2 className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-start font-medium">
                {tFollowUps('columns.recommendedDate')}
              </th>
              <th className="px-4 py-3 text-start font-medium">
                {tFollowUps('columns.status')}
              </th>
              <th className="px-4 py-3 text-start font-medium">
                {tFollowUps('columns.doctor')}
              </th>
              <th className="px-4 py-3 text-start font-medium">
                {tFollowUps('columns.linkedAppointment')}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.encounterId}
                className="border-t border-border transition-colors hover:bg-muted/20"
              >
                <td className="px-4 py-3 text-sm whitespace-nowrap" dir="ltr">
                  {formatDateDisplay(item.followUpDate)}
                </td>
                <td className="px-4 py-3">
                  <FollowUpStatusBadge status={item.followUpStatus} />
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm">
                    {tFollowUps('doctorPrefix')} {item.doctor.firstName} {item.doctor.lastName}
                  </p>
                  {item.doctor.specialization && (
                    <p className="text-xs text-muted-foreground">{item.doctor.specialization}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {item.linkedAppointment ? (
                    <p className="text-sm whitespace-nowrap" dir="ltr">
                      {formatDateTimeDisplay(item.linkedAppointment.scheduledAt)}
                    </p>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
