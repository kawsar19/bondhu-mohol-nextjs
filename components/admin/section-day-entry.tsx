'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Circle, ClipboardCheck, Loader2, PackageOpen, RefreshCw, Wand2 } from 'lucide-react'
import { businessDateString } from '@/lib/time'
import type { MessageKey, TFunction } from '@/lib/i18n'
import { useIntlLocale, useT } from '@/components/i18n-provider'
import { addDays } from './date-range-picker'
import { Thumb } from './ingredients-manager'

type Unit = 'kg' | 'litre' | 'piece' | 'packet'
type Section = { _id: string; name: string; isActive: boolean }
type Row = { ingredient: { _id: string; name: string; unit: Unit; image: string }; opening: number; received: number; available: number; used: number | null; closing: number | null }
type DayData = { rows: Row[]; entry: { enteredBy: string; updatedAt: string } | null }
type Saved = Record<string, { enteredBy: string; updatedAt: string }>

const amount = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 3 })
const round = (n: number) => Math.round(n * 1000) / 1000
// Same colours, in the same order, as the section chips on the store pages.
const TONES = ['bg-[#3f9a6b]', 'bg-[#c98a3e]', 'bg-[#4f74b0]', 'bg-[#b5577a]', 'bg-[#8a9437]', 'bg-[#7461b0]']

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) window.location.href = '/admin/login'
  if (!res.ok) throw new Error(data.error ?? '')
  return data as T
}

const errorText = (err: unknown, t: TFunction, fallback: MessageKey) => err instanceof Error ? err.message || t('common.somethingWentWrong') : t(fallback)

/** End of day, per section: count what is left of each ingredient; use is worked out from it. */
export function SectionDayEntry({ onOpenStore }: { onOpenStore?: () => void }) {
  const t = useT()
  const locale = useIntlLocale()
  const today = businessDateString()
  const [sections, setSections] = useState<Section[]>([])
  const [section, setSection] = useState('')
  const [date, setDate] = useState(today)
  const [saved, setSaved] = useState<Saved>({})
  const [data, setData] = useState<DayData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [savedNow, setSavedNow] = useState(false)

  useEffect(() => {
    api<{ sections: Section[] }>('/api/sections').then(({ sections }) => {
      const open = sections.filter(s => s.isActive)
      setSections(open)
      setSection(current => current || open[0]?._id || '')
    }).catch(err => setError(errorText(err, t, 'daily.loadFailed')))
  }, [t])

  const loadStatus = useCallback(() => {
    api<{ saved: Saved }>(`/api/section-days/status?date=${date}`).then(r => setSaved(r.saved)).catch(() => setSaved({}))
  }, [date])
  useEffect(() => { loadStatus() }, [loadStatus])

  const load = useCallback(async () => {
    if (!section) return
    setLoading(true)
    setError('')
    setSavedNow(false)
    try {
      const day = await api<DayData>(`/api/section-days?section=${section}&date=${date}`)
      setData(day)
      setValues(Object.fromEntries(day.rows.filter(r => r.closing !== null).map(r => [r.ingredient._id, String(r.closing)])))
    } catch (err) {
      setData(null)
      setError(errorText(err, t, 'daily.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [section, date, t])
  useEffect(() => { load() }, [load])

  const rows = data?.rows ?? []
  const filled = rows.filter(r => (values[r.ingredient._id] ?? '').trim() !== '').length
  const doneCount = sections.filter(s => saved[s._id]).length
  const nextPending = sections.find(s => s._id !== section && !saved[s._id])
  const dayLabel = useMemo(() => new Date(`${date}T00:00:00+06:00`).toLocaleDateString(locale, { timeZone: 'Asia/Dhaka', weekday: 'long', day: 'numeric', month: 'long' }), [date, locale])

  // Nothing used of these: what is left is what should be there.
  const fillRest = () => setValues(v => ({ ...v, ...Object.fromEntries(rows.filter(r => !(v[r.ingredient._id] ?? '').trim()).map(r => [r.ingredient._id, String(round(Math.max(r.available, 0)))])) }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!data) return
    setSaving(true)
    setError('')
    setSavedNow(false)
    try {
      const items = Object.entries(values).filter(([, v]) => v.trim() !== '').map(([ingredient, v]) => ({ ingredient, closing: Number(v) }))
      await api('/api/section-days', { method: 'PUT', body: JSON.stringify({ section, date, items }) })
      await load()
      loadStatus()
      setSavedNow(true)
    } catch (err) {
      setError(errorText(err, t, 'daily.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const card = 'rounded-2xl border border-[#e3e8e1] bg-white'
  const roundBtn = 'flex size-10 items-center justify-center rounded-xl border border-[#e0e5df] bg-white text-[#5f6b62] hover:bg-[#f5f7f4] disabled:opacity-30'
  const chip = (on: boolean) => `h-8 rounded-full px-3 text-xs font-semibold transition ${on ? 'bg-[#174d3c] text-white' : 'border border-[#e2e7e1] bg-white text-[#5f6b62] hover:bg-[#f5f7f4]'}`

  return <form onSubmit={submit} className="max-w-5xl pb-28">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-1 text-xs font-semibold uppercase tracking-[.17em] text-[#bc7843]">{t('daily.eyebrow')}</p><h2 className="font-serif text-3xl font-bold tracking-tight">{t('daily.title')}</h2><p className="mt-1 max-w-xl text-xs text-[#89938b]">{t('daily.subtitle')}</p></div>
      <button type="button" onClick={() => { load(); loadStatus() }} aria-label={t('daily.refresh')} className={roundBtn}><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button>
    </div>

    {/* Which day */}
    <div className={`${card} flex flex-wrap items-center gap-3 p-3`}>
      <button type="button" onClick={() => setDate(addDays(date, -1))} aria-label={t('daily.prevDay')} className={roundBtn}><ChevronLeft className="size-4" /></button>
      <div className="min-w-0 flex-1 text-center sm:text-left"><p className="font-serif text-lg font-bold leading-tight">{dayLabel}</p><p className="text-[11px] text-[#89938b]">{sections.length > 0 && (doneCount === sections.length ? <span className="font-semibold text-[#2f7a55]">{t('daily.allDone')}</span> : t('daily.dayDone', { done: doneCount, total: sections.length }))}</p></div>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => setDate(today)} className={chip(date === today)}>{t('dates.presets.today')}</button>
        <button type="button" onClick={() => setDate(addDays(today, -1))} className={chip(date === addDays(today, -1))}>{t('dates.presets.yesterday')}</button>
        <label className="sr-only" htmlFor="d-date">{t('daily.date')}</label>
        <input id="d-date" type="date" max={today} value={date} onChange={e => e.target.value && setDate(e.target.value)} className="h-8 rounded-full border border-[#e2e7e1] bg-white px-2.5 text-xs font-medium outline-none focus:border-[#8eaf9b]" />
      </div>
      <button type="button" onClick={() => setDate(addDays(date, 1))} disabled={date >= today} aria-label={t('daily.nextDay')} className={roundBtn}><ChevronRight className="size-4" /></button>
      {sections.length > 0 && <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#edf1ec]"><div className="h-full rounded-full bg-[#3f9a6b] transition-all" style={{ width: `${(doneCount / sections.length) * 100}%` }} /></div>}
    </div>

    {/* Which section, and whether it is done */}
    {sections.length === 0 ? <p className="mt-5 text-xs text-[#b4472c]">{t('daily.noSections')}</p>
      : <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="group" aria-label={t('daily.section')}>
        {sections.map((s, i) => {
          const on = s._id === section
          const done = Boolean(saved[s._id])
          return <button type="button" key={s._id} onClick={() => setSection(s._id)} aria-pressed={on} className={`flex min-w-0 items-center gap-2.5 rounded-xl border p-3 text-left transition ${on ? 'border-[#174d3c] bg-[#f4f8f5] ring-1 ring-[#174d3c]' : 'border-[#e3e8e1] bg-white hover:border-[#c9d6cc]'}`}>
            <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${TONES[i % TONES.length]}`} />
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{s.name}</span><span className={`flex items-center gap-1 text-[11px] font-semibold ${done ? 'text-[#2f7a55]' : 'text-[#b07a45]'}`}>{done ? <CheckCircle2 className="size-3" /> : <Circle className="size-3" />}{t(done ? 'daily.statusSaved' : 'daily.statusPending')}</span></span>
          </button>
        })}
      </div>}

    {error && <p role="alert" className="mt-5 rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{error}</p>}

    {loading && !data ? <div className="mt-10 flex justify-center text-[#87928a]"><Loader2 className="size-6 animate-spin" /></div> : data && <>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className={`flex items-center gap-1.5 text-xs font-medium ${data.entry ? 'text-[#174d3c]' : 'text-[#a8622f]'}`}>{data.entry ? <><CheckCircle2 className="size-4" /> {t('daily.savedBy', { name: data.entry.enteredBy, time: new Date(data.entry.updatedAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) })}</> : <><ClipboardCheck className="size-4" /> {t('daily.notSaved')}</>}</p>
        {rows.length > 0 && filled < rows.length && <button type="button" onClick={fillRest} title={t('daily.fillRestHint')} className="flex h-9 items-center gap-1.5 rounded-xl border border-[#e0e5df] bg-white px-3 text-xs font-semibold text-[#174d3c] hover:bg-[#f4f8f5]"><Wand2 className="size-3.5" /> {t('daily.fillRest')}</button>}
      </div>

      {rows.length === 0 ? <div className={`${card} mt-3 flex flex-col items-center px-6 py-12 text-center`}>
        <PackageOpen className="size-10 text-[#c7d1c7]" />
        <p className="mt-3 max-w-sm text-sm text-[#68756b]">{t('daily.noIngredients')}</p>
        {onOpenStore && <button type="button" onClick={onOpenStore} className="mt-4 flex h-10 items-center gap-2 rounded-xl bg-[#174d3c] px-4 text-sm font-semibold text-white hover:bg-[#123f31]">{t('daily.openStore')} <ArrowRight className="size-4" /></button>}
      </div>
        : <>
          <ul className="mt-3 grid gap-2.5 md:grid-cols-2">{rows.map(r => {
            const unit = t(`ingredients.units.${r.ingredient.unit}`)
            const raw = values[r.ingredient._id] ?? ''
            const isFilled = raw.trim() !== ''
            const used = isFilled ? round(r.available - Number(raw)) : null
            return <li key={r.ingredient._id} className={`${card} flex flex-col gap-3 p-3 ${isFilled ? (used! < 0 ? 'border-l-4 border-l-[#e08a3c]' : 'border-l-4 border-l-[#3f9a6b]') : ''}`}>
              <div className="flex items-center gap-3">
                <Thumb image={r.ingredient.image} size="size-11" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{r.ingredient.name}</p><p className="text-[11px] text-[#9aa39c]">{t('daily.opening')} {amount(r.opening)} + {t('daily.received')} {amount(r.received)}</p></div>
                <div className="text-right"><p className="text-[10px] font-semibold uppercase tracking-wide text-[#9aa39c]">{t('daily.shouldHave')}</p><p className="font-serif text-lg font-bold leading-none tabular-nums">{amount(r.available)} <span className="font-sans text-[11px] font-semibold text-[#68756b]">{unit}</span></p></div>
              </div>
              <div className="flex items-center gap-3">
                <label className="relative flex-1"><span className="sr-only">{r.ingredient.name}: {t('daily.left')}</span>
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#9aa39c]">{t('daily.left')}</span>
                  <input type="number" inputMode="decimal" min={0} step="0.001" placeholder="—" value={raw} onChange={e => setValues(v => ({ ...v, [r.ingredient._id]: e.target.value }))} className="h-11 w-full rounded-xl border border-[#e2e7e1] bg-[#fbfcfb] pl-14 pr-14 text-right text-base font-bold tabular-nums outline-none focus:border-[#8eaf9b] focus:bg-white" />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#87928a]">{unit}</span>
                </label>
                <p className="w-28 text-right text-[11px] font-semibold leading-tight">{used === null ? <span className="font-normal text-[#b5bdb6]">—</span>
                  : used >= 0 ? <span className="text-[#5f6b62]">{t('daily.usedIs', { quantity: amount(used), unit })}</span>
                  : <span className="text-[#a8622f]">{t('daily.foundMore', { quantity: amount(-used), unit })}</span>}</p>
              </div>
            </li>
          })}</ul>
        </>}

      {rows.length > 0 && <div className="sticky bottom-20 z-10 mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#e3e8e1] bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
        <div className="min-w-0 flex-1">
          {savedNow ? <p role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-[#174d3c]"><span className="flex items-center gap-1.5"><CheckCircle2 className="size-4" /> {t('daily.saved')}</span>{nextPending && <button type="button" onClick={() => setSection(nextPending._id)} className="flex items-center gap-1 text-[#b86f3c] hover:underline">{t('daily.nextSection', { name: nextPending.name })} <ArrowRight className="size-3.5" /></button>}</p>
            : <><p className="text-xs font-semibold text-[#4f5b52]">{t('daily.filled', { filled, total: rows.length })}</p><div className="mt-1 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[#edf1ec]"><div className="h-full rounded-full bg-[#174d3c] transition-all" style={{ width: `${(filled / rows.length) * 100}%` }} /></div></>}
        </div>
        <button disabled={saving || loading || filled === 0} className="flex h-11 items-center gap-2 rounded-xl bg-[#174d3c] px-5 text-sm font-semibold text-white hover:bg-[#123f31] disabled:opacity-50">{saving && <Loader2 className="size-4 animate-spin" />}{t('daily.save')}</button>
      </div>}
    </>}
  </form>
}
