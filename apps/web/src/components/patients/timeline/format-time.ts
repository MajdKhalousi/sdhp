import { formatTimeDisplay } from '@/lib/format-date';

export function formatTime(value: string | Date, locale = 'en-US'): string {
  // locale param kept for API compatibility; output is always HH:mm
  void locale;
  return formatTimeDisplay(value);
}
