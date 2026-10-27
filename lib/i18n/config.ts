// Shared by server and client.
export const LOCALES = ['bn', 'en'] as const
export type Locale = (typeof LOCALES)[number]

// Most guests and staff read Bangla first.
export const DEFAULT_LOCALE: Locale = 'bn'
export const LOCALE_COOKIE = 'bm_lang'

/** Locale tags for toLocaleString / Intl. Digits stay Latin (0-9) in both, as on most BD receipts. */
export const INTL_LOCALE: Record<Locale, string> = { bn: 'bn-BD-u-nu-latn', en: 'en-GB' }

export const LOCALE_LABELS: Record<Locale, string> = { bn: 'বাংলা', en: 'English' }

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale)
}
