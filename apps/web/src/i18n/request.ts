import { getRequestConfig } from 'next-intl/server';
import { routing, type Locale } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !(routing.locales as readonly string[]).includes(locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    onError() {
      // Silent: missing keys fall back to the key string, never throw or render undefined
    },
    getMessageFallback({ key, namespace }) {
      // Return the raw key as fallback — never undefined, never crashes rendering
      return namespace ? `${namespace}.${key}` : key;
    },
  };
});
