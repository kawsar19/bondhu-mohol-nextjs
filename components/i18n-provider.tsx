'use client'

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createT, type TFunction } from '@/lib/i18n'
import { INTL_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n/config'

const LocaleContext = createContext<Locale>('bn')

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  return useContext(LocaleContext)
}

/** Locale tag for toLocaleDateString and friends. */
export function useIntlLocale() {
  return INTL_LOCALE[useLocale()]
}

export function useT(): TFunction {
  const locale = useLocale()
  return useMemo(() => createT(locale), [locale])
}

/** Saves the choice in a cookie (so the server renders and answers in it too), then re-renders. */
export function useSetLocale() {
  const router = useRouter()
  return useCallback((locale: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    router.refresh()
  }, [router])
}
