/**
 * Locale-aware formatting utilities.
 * Uses the user's preferred locale from localStorage/cookie.
 * Falls back to 'en-GB' if no preference set.
 */

function getLocale(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('preferredLocale') || 'en-GB';
  }
  return 'en-GB';
}

/**
 * Format a date string to a readable format using the user's locale.
 */
export function formatDate(dateStr: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return '\u2014';
  const locale = getLocale();
  const defaults: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  return new Date(dateStr).toLocaleDateString(locale, options ?? defaults);
}

/**
 * Format a date+time string.
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '\u2014';
  const locale = getLocale();
  return new Date(dateStr).toLocaleString(locale, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Format a number as currency.
 */
export function formatCurrency(value: number | string | null | undefined, currency = 'USD'): string {
  if (value == null) return '\u2014';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '\u2014';
  const locale = getLocale();
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format a number with locale-aware separators.
 */
export function formatNumber(value: number | string | null | undefined): string {
  if (value == null) return '\u2014';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '\u2014';
  const locale = getLocale();
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * Format a time string (hours:minutes:seconds).
 */
export function formatTime(dateStr: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return '\u2014';
  const locale = getLocale();
  const defaults: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
  return new Date(dateStr).toLocaleTimeString(locale, options ?? defaults);
}

/**
 * Format a percentage.
 */
export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null) return '\u2014';
  const locale = getLocale();
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}
