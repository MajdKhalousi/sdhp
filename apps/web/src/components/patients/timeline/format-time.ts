export function formatTime(value: string | Date, locale = 'en-US'): string {
  return new Date(value).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
}
