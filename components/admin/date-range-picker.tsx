'use client'

import { businessDateString } from '@/lib/time'
import { useT } from '@/components/i18n-provider'

export type DateRange = { from: string; to: string }

/** Shifts a "YYYY-MM-DD" date by whole days. */
export function addDays(date: string, days: number) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

function monthStart(date: string, monthsBack = 0) {
  const [y, m] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 - monthsBack, 1)).toISOString().slice(0, 10)
}

// Dates are Bangladesh calendar days, whatever the viewer's computer clock is set to.
export type PresetId = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth'

// `id` is stable; the shown label comes from dates.presets.<id>.
export const PRESETS: { id: PresetId; range: () => DateRange }[] = [
  { id: 'today', range: () => { const today = businessDateString(); return { from: today, to: today } } },
  { id: 'yesterday', range: () => { const day = addDays(businessDateString(), -1); return { from: day, to: day } } },
  { id: 'last7', range: () => { const today = businessDateString(); return { from: addDays(today, -6), to: today } } },
  { id: 'thisMonth', range: () => { const today = businessDateString(); return { from: monthStart(today), to: today } } },
  { id: 'lastMonth', range: () => { const today = businessDateString(); return { from: monthStart(today, 1), to: addDays(monthStart(today), -1) } } },
]

/** `locale` is an Intl tag, e.g. from useIntlLocale(). */
export function formatDay(date: string, locale: string, withYear = false) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) })
}

export function describeRange({ from, to }: DateRange, locale: string) {
  return from === to ? formatDay(from, locale, true) : `${formatDay(from, locale, true)} – ${formatDay(to, locale, true)}`
}

export function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
  const t = useT()
  const today = businessDateString()
  const activePreset = PRESETS.find(p => { const r = p.range(); return r.from === value.from && r.to === value.to })?.id
  const input = 'h-9 rounded-lg border border-[#e2e7e1] bg-white px-2 text-xs font-medium outline-none focus:border-[#8eaf9b]'

  return <div className="flex flex-wrap items-center gap-2">
    <div className="flex flex-wrap gap-1.5">{PRESETS.map(p => <button key={p.id} onClick={() => onChange(p.range())} className={`h-9 rounded-lg px-3 text-xs font-semibold transition ${activePreset === p.id ? 'bg-[#174d3c] text-white' : 'border border-[#e2e7e1] bg-white text-[#5f6b62] hover:bg-[#f5f7f4]'}`}>{t(`dates.presets.${p.id}`)}</button>)}</div>
    <div className="flex items-center gap-1.5">
      <label className="sr-only" htmlFor="range-from">{t('dates.from')}</label>
      <input id="range-from" type="date" max={value.to} value={value.from} onChange={e => e.target.value && onChange({ ...value, from: e.target.value })} className={input} />
      <span className="text-xs text-[#9aa39c]">{t('dates.rangeTo')}</span>
      <label className="sr-only" htmlFor="range-to">{t('dates.to')}</label>
      <input id="range-to" type="date" min={value.from} max={today} value={value.to} onChange={e => e.target.value && onChange({ ...value, to: e.target.value })} className={input} />
    </div>
  </div>
}
