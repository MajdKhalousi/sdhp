import type { TimelineEvent } from '@/types/timeline';
import { TimelineEventCard } from './timeline-event-card';

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
    const [year, month, day] = key.split('-').map(Number);
    const dateLabel = new Date(year, month - 1, day).toLocaleDateString('en', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return { key, dateLabel, events: evts };
  });
}

function relativePrefix(key: string): string {
  const today = new Date();
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = [
    yesterday.getFullYear(),
    String(yesterday.getMonth() + 1).padStart(2, '0'),
    String(yesterday.getDate()).padStart(2, '0'),
  ].join('-');

  if (key === todayKey) return 'Today — ';
  if (key === yesterdayKey) return 'Yesterday — ';
  return '';
}

interface Props {
  events: TimelineEvent[];
}

export function TimelineEventList({ events }: Props) {
  const groups = groupByLocalDate(events);

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={group.key}>
          <div className="mb-3 flex items-center gap-3">
            <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {relativePrefix(group.key)}{group.dateLabel}
            </p>
            <div className="flex-1 border-t border-border" />
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {group.events.length}
            </span>
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
