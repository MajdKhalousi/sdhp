import type { TimelineEvent } from '@/types/timeline';
import { TimelineEventCard } from './timeline-event-card';

interface DateGroup {
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
    const [year, month, day] = key.split('-').map(Number);
    const dateLabel = new Date(year, month - 1, day).toLocaleDateString('en', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return { dateLabel, events: evts };
  });
}

interface Props {
  events: TimelineEvent[];
}

export function TimelineEventList({ events }: Props) {
  const groups = groupByLocalDate(events);

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={group.dateLabel}>
          <div className="mb-3 flex items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.dateLabel}
            </p>
            <div className="flex-1 border-t border-border" />
          </div>
          <div className="space-y-3">
            {group.events.map((event) => (
              <TimelineEventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
