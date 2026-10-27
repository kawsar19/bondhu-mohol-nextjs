// Shared by server and client. Components use useT() (components/i18n-provider.tsx);
// route handlers and server components use getT() (lib/i18n/server.ts).
import { bn } from './bn'
import type { Locale } from './config'
import { en, type Dictionary } from './en'
import type { Paths, Vars } from './types'

export type MessageKey = Paths<Dictionary>
export type TFunction = (key: MessageKey, vars?: Vars) => string

const dictionaries: Record<Locale, Dictionary> = { bn, en }

function lookup(dict: Dictionary, key: string): string | undefined {
  const value = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], dict)
  return typeof value === 'string' ? value : undefined
}

/** Translator for one locale. "{name}" placeholders are filled from `vars`; unknown keys fall back to English, then the key. */
export function createT(locale: Locale): TFunction {
  return (key, vars) => {
    const text = lookup(dictionaries[locale], key) ?? lookup(en, key) ?? key
    return vars ? text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match)) : text
  }
}
