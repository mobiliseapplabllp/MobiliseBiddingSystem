import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

// Supported locales — add new ones here as translation files are created
const SUPPORTED_LOCALES = ['en'];
const DEFAULT_LOCALE = 'en';

export default getRequestConfig(async () => {
  // Try to get locale from cookie (set by language selector)
  let locale = DEFAULT_LOCALE;
  try {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get('preferredLocale')?.value;
    if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
      locale = cookieLocale;
    }
  } catch {
    // Cookies not available in some contexts — use default
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
