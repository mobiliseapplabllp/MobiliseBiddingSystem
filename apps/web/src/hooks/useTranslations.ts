import {
  useTranslations as useNextIntlTranslations,
  useLocale,
  useMessages,
} from 'next-intl';

/**
 * Custom useTranslations wrapper that supports a string fallback as the 2nd argument.
 *
 * next-intl's native `t('key', values)` expects `values` to be a Record, not a string.
 * Many components in this project use `t('key', 'Fallback Text')` for safety.
 * This wrapper intercepts that pattern and returns the fallback if the key is missing,
 * while forwarding valid interpolation objects unchanged.
 */
export function useTranslations(namespace?: string) {
  const originalT = useNextIntlTranslations(namespace);

  // Build a callable function that also carries helper methods
  function translate(key: string, valuesOrFallback?: Record<string, unknown> | string): string {
    try {
      if (typeof valuesOrFallback === 'string') {
        // String fallback pattern — try the key first, use fallback on error
        try {
          return originalT(key as never) as string;
        } catch {
          return valuesOrFallback;
        }
      }
      if (valuesOrFallback) {
        return originalT(key as never, valuesOrFallback as never) as string;
      }
      return originalT(key as never) as string;
    } catch {
      return typeof valuesOrFallback === 'string' ? valuesOrFallback : key;
    }
  }

  // Copy over utility methods from the original translator
  translate.rich = originalT.rich ? originalT.rich.bind(originalT) : undefined;
  translate.raw = originalT.raw ? originalT.raw.bind(originalT) : undefined;
  translate.has = originalT.has ? originalT.has.bind(originalT) : undefined;
  translate.markup = originalT.markup ? originalT.markup.bind(originalT) : undefined;

  return translate;
}

export { useLocale, useMessages };
