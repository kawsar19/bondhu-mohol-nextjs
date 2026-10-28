'use client'

import { Languages } from 'lucide-react'
import { LOCALE_LABELS, LOCALES } from '@/lib/i18n/config'
import { useLocale, useSetLocale, useT } from './i18n-provider'

/** Two-option bangla / english toggle. */
export function LanguageSwitch({ className = '' }: { className?: string }) {
  const locale = useLocale()
  const setLocale = useSetLocale()
  const t = useT()
  return <div role="group" aria-label={t('common.language')} className={`inline-flex items-center gap-0.5 rounded-full border border-[#e0e5df] bg-white p-0.5 ${className}`}>
    <Languages className="ml-1.5 hidden size-3.5 text-[#9aa39c] sm:block" aria-hidden />
    {LOCALES.map(l => <button key={l} type="button" lang={l} aria-pressed={locale === l} onClick={() => locale !== l && setLocale(l)} className={`h-8 rounded-full px-2.5 text-[11px] sm:px-3 font-semibold transition ${locale === l ? 'bg-[#174d3c] text-white' : 'text-[#5f6b62] hover:bg-[#f5f7f4]'}`}>{LOCALE_LABELS[l]}</button>)}
  </div>
}
