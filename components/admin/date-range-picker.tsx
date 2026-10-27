'use client'

import { businessDateString } from '@/lib/time'

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
export const PRESETS: { label: string; range: () => DateRange }[] = [
  { label: 'Today', range: () => { const today = businessDateString(); return { from: today, to: today } } },
  { label: 'Yesterday', range: () => { const day = addDays(businessDateString(), -1); return { from: day, to: day } } },
  { label: 'Last 7 days', range: () => { const today = businessDateString(); return { from: addDays(today, -6), to: today } } },
  { label: 'This month', range: () => { const today = businessDateString(); return { from: monthStart(today), to: today } } },
  { label: 'Last month', range: () => { const today = businessDateString(); return { from: monthStart(today, 1), to: addDays(monthStart(today), -1) } } },
]

export function formatDay(date: string, withYear = false) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) })
}

export function describeRange({ from, to }: DateRange) {
  return from === to ? formatDay(from, true) : `${formatDay(from, true)} – ${formatDay(to, true)}`
}

export function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
  const today = businessDateString()
  const activePreset = PRESETS.find(p => { const r = p.range(); return r.from === value.from && r.to === value.to })?.label
  const input = 'h-9 rounded-lg border border-[#e2e7e1] bg-white px-2 text-xs font-medium outline-none focus:border-[#8eaf9b]'

  return <div className="flex flex-wrap items-center gap-2">
    <div className="flex flex-wrap gap-1.5">{PRESETS.map(p => <button key={p.label} onClick={() => onChange(p.range())} className={`h-9 rounded-lg px-3 text-xs font-semibold transition ${activePreset === p.label ? 'bg-[#174d3c] text-white' : 'border border-[#e2e7e1] bg-white text-[#5f6b62] hover:bg-[#f5f7f4]'}`}>{p.label}</button>)}</div>
    <div className="flex items-center gap-1.5">
      <label className="sr-only" htmlFor="range-from">From</label>
      <input id="range-from" type="date" max={value.to} value={value.from} onChange={e => e.target.value && onChange({ ...value, from: e.target.value })} className={input} />
      <span className="text-xs text-[#9aa39c]">to</span>
      <label className="sr-only" htmlFor="range-to">To</label>
      <input id="range-to" type="date" min={value.from} max={today} value={value.to} onChange={e => e.target.value && onChange({ ...value, to: e.target.value })} className={input} />
    </div>
  </div>
}
