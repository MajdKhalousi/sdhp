'use client';

import { useMemo, memo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { formatDateDisplay } from '@/lib/format-date';
import type { TimelineEvent } from '@/types/timeline';
import { TimelineEventCard } from './timeline-event-card';
import { EncounterCard } from './encounter-card';
import type { OutputCounts } from './encounter-card';

interface DateGroup {
  key: string;
  dateLabel: string;
  events: TimelineEvent[];
}

function groupByLocalDate(events: TimelineEvent[]): DateGroup[] {
  const groups = new Map<string, TimelineEvent[]>();
  for (const event of events) {
    const d = new Date(event.timestamp);
    const key = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(event);
  }
  return Array.from(groups.entries()).map(([key, evts]) => {
    return { key, dateLabel: formatDateDisplay(key), events: evts };
  });
}

function todayKey() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

function computeOutputCounts(encounterId: string, allEvents: TimelineEvent[]): OutputCounts {
  let prescriptions = 0, labs = 0, radiology = 0, files = 0, reports = 0;
  for (const e of allEvents) {
    switch (e.type) {
      case 'PRESCRIPTION':            if (e.data.encounterId === encounterId) prescriptions++; break;
      case 'LAB_ORDER':               if (e.data.encounterId === encounterId) labs++;          break;
      case 'RADIOLOGY_ORDER':         if (e.data.encounterId === encounterId) radiology++;     break;
      case 'MEDICAL_FILE':            if (e.data.encounterId === encounterId) files++;         break;
      case 'CLINICAL_REPORT_CREATED': if (e.data.encounterId === encounterId) reports++;       break;
    }
  }
  return { prescriptions, labs, radiology, files, reports };
}

interface Props {
  events: TimelineEvent[];
}

export const TimelineEventList = memo(function TimelineEventList({ events }: Props) {
  const t = useTranslations('timeline.dateGroups');
  const locale = useLocale();
  const groups = useMemo(() => groupByLocalDate(events), [events]);
  const today = todayKey();
  const yesterday = yesterdayKey();

  return (
    <div className="space-y-8">
      {groups.map((group) => {
        const prefix = group.key === today
          ? `${t('today')} `
          : group.key === yesterday
            ? `${t('yesterday')} `
            : '';

        return (
          <div key={group.key}>
            <div className="mb-3 flex items-center gap-3">
              <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {prefix}{group.dateLabel}
              </p>
              <div className="flex-1 border-t border-border" />
              {group.events.length > 1 && (
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {group.events.length}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {group.events.map((event) => {
                if (event.type === 'ENCOUNTER') {
                  return (
                    <EncounterCard
                      key={event.id}
                      event={event}
                      outputCounts={computeOutputCounts(event.id, events)}
                    />
                  );
                }
                return <TimelineEventCard key={event.id} event={event} />;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
});
