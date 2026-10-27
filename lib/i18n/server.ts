import 'server-only'
import { cookies } from 'next/headers'
import { createT } from '.'
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from './config'

/** The visitor's chosen language, from the cookie the language switch sets. */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value
  return isLocale(value) ? value : DEFAULT_LOCALE
}

/** Translator for route handlers and server components, so API error messages match the UI language. */
export async function getT() {
  return createT(await getLocale())
}
