'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, ClipboardCheck, Loader2, Plus, RefreshCw, X } from 'lucide-react'
import { businessDateString } from '@/lib/time'
import type { MessageKey, TFunction } from '@/lib/i18n'
import { useIntlLocale, useT } from '@/components/i18n-provider'
import { addDays } from './date-range-picker'

type Unit = 'kg' | 'litre' | 'piece' | 'packet'
type Section = { _id: string; name: string; isActive: boolean }
type Row = { ingredient: { _id: string; name: string; unit: Unit }; opening: number; received: number; available: number; used: number | null; closing: number | null }
type Share = { key: number; item: string; quantity: string; takenBy: string }
type DayData = {
  rows: Row[]
  menuItems: { _id: string; name: string }[]
  entry: { production: { menuItem: string | null; name: string; quantity: number }[]; ownersShare: Omit<Share, 'key'>[]; note: string; enteredBy: string; updatedAt: string } | null
}

const amount = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 3 })
const round = (n: number) => Math.round(n * 1000) / 1000

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) window.location.href = '/admin/login'
  if (!res.ok) throw new Error(data.error ?? '')
  return data as T
}

const errorText = (err: unknown, t: TFunction, fallback: MessageKey) => err instanceof Error ? err.message || t('common.somethingWentWrong') : t(fallback)

let shareKey = 0
const blankShare = (): Share => ({ key: ++shareKey, item: '', quantity: '', takenBy: '' })

export function SectionDayEntry() {
  const t = useT()
  const locale = useIntlLocale()
  const today = businessDateString()
  const [sections, setSections] = useState<Section[]>([])
  const [section, setSection] = useState('')
  const [date, setDate] = useState(today)
  const [data, setData] = useState<DayData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Counting what is left is more accurate, so it is the default; what was used can be written instead.
  const [mode, setMode] = useState<'closing' | 'used'>('closing')
  const [values, setValues] = useState<Record<string, string>>({})
  const [made, setMade] = useState<Record<string, string>>({})
  const [shares, setShares] = useState<Share[]>([blankShare()])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedNow, setSavedNow] = useState(false)

  useEffect(() => {
    api<{ sections: Section[] }>('/api/sections').then(({ sections }) => {
      const open = sections.filter(s => s.isActive)
      setSections(open)
      setSection(current => current || open[0]?._id || '')
    }).catch(err => setError(errorText(err, t, 'daily.loadFailed')))
  }, [t])

  const load = useCallback(async () => {
    if (!section) return
    setLoading(true)
    setError('')
    setSavedNow(false)
    try {
      const day = await api<DayData>(`/api/section-days?section=${section}&date=${date}`)
      setData(day)
      // A saved day is shown as counted stock, the way it is usually written.
      setMode('closing')
      setValues(Object.fromEntries(day.rows.filter(r => r.closing !== null).map(r => [r.ingredient._id, String(r.closing)])))
      setMade(Object.fromEntries((day.entry?.production ?? []).filter(p => p.menuItem).map(p => [p.menuItem!, String(p.quantity)])))
      setShares(day.entry?.ownersShare.length ? day.entry.ownersShare.map(s => ({ ...s, key: ++shareKey })) : [blankShare()])
      setNote(day.entry?.note ?? '')
    } catch (err) {
      setData(null)
      setError(errorText(err, t, 'daily.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [section, date, t])

  useEffect(() => { load() }, [load])

  // Switching mode carries each filled line over, so nothing typed is lost.
  const switchMode = (next: 'closing' | 'used') => {
    if (next === mode || !data) return
    setValues(current => Object.fromEntries(Object.entries(current).filter(([, v]) => v.trim() !== '').map(([id, v]) => {
      const row = data.rows.find(r => r.ingredient._id === id)
      return [id, row ? String(round(Math.max(row.available - Number(v), 0))) : v]
    })))
    setMode(next)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!data) return
    setSaving(true)
    setError('')
    setSavedNow(false)
    try {
      const items = Object.entries(values).filter(([, v]) => v.trim() !== '').map(([ingredient, v]) => ({ ingredient, [mode]: Number(v) }))
      const production = Object.entries(made).filter(([, v]) => Number(v) > 0).map(([menuItem, v]) => ({ menuItem, quantity: Number(v) }))
      await api('/api/section-days', { method: 'PUT', body: JSON.stringify({ section, date, items, production, ownersShare: shares.filter(s => s.item.trim()), note }) })
      await load()
      setSavedNow(true)
    } catch (err) {
      setError(errorText(err, t, 'daily.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const card = 'rounded-2xl border border-[#e3e8e1] bg-white p-5'
  const heading = 'text-sm font-bold'
  const input = 'h-10 w-full rounded-lg border border-[#e2e7e1] bg-[#fbfcfb] px-3 text-sm outline-none focus:border-[#8eaf9b]'
  const chip = (on: boolean) => `h-9 rounded-full px-3.5 text-xs font-semibold transition ${on ? 'bg-[#174d3c] text-white' : 'border border-[#e2e7e1] bg-white text-[#5f6b62] hover:bg-[#f5f7f4]'}`
  const tooMuch = data?.rows.some(r => mode === 'used' && values[r.ingredient._id]?.trim() && Number(values[r.ingredient._id]) > r.available + 0.0005)

  return <form onSubmit={submit} className="max-w-4xl pb-24">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[.17em] text-[#bc7843]">{t('daily.eyebrow')}</p><h2 className="font-serif text-3xl font-bold tracking-tight">{t('daily.title')}</h2><p className="mt-1 max-w-xl text-xs text-[#89938b]">{t('daily.subtitle')}</p></div><button type="button" onClick={load} aria-label={t('daily.refresh')} className="flex size-10 items-center justify-center rounded-xl border border-[#e0e5df] bg-white text-[#68756b] hover:bg-[#f5f7f4]"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button></div>

    <div className={`${card} flex flex-col gap-4`}>
      <div><p className="text-xs font-semibold text-[#5f6b62]">{t('daily.section')}</p>{sections.length === 0 ? <p className="mt-1.5 text-xs text-[#b4472c]">{t('daily.noSections')}</p> : <div className="mt-2 flex flex-wrap gap-1.5">{sections.map(s => <button type="button" key={s._id} onClick={() => setSection(s._id)} aria-pressed={section === s._id} className={chip(section === s._id)}>{s.name}</button>)}</div>}</div>
      <div><p className="text-xs font-semibold text-[#5f6b62]">{t('daily.date')}</p><div className="mt-2 flex flex-wrap items-center gap-1.5"><button type="button" onClick={() => setDate(today)} className={chip(date === today)}>{t('dates.presets.today')}</button><button type="button" onClick={() => setDate(addDays(today, -1))} className={chip(date === addDays(today, -1))}>{t('dates.presets.yesterday')}</button><label className="sr-only" htmlFor="d-date">{t('daily.date')}</label><input id="d-date" type="date" max={today} value={date} onChange={e => e.target.value && setDate(e.target.value)} className="h-9 rounded-full border border-[#e2e7e1] bg-white px-3 text-xs font-medium outline-none focus:border-[#8eaf9b]" /></div></div>
      {data && <p className={`flex items-center gap-1.5 text-xs font-medium ${data.entry ? 'text-[#174d3c]' : 'text-[#a8622f]'}`}>{data.entry ? <><CheckCircle2 className="size-4" /> {t('daily.savedBy', { name: data.entry.enteredBy, time: new Date(data.entry.updatedAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) })}</> : <><ClipboardCheck className="size-4" /> {t('daily.notSaved')}</>}</p>}
    </div>

    {error && <p role="alert" className="mt-5 rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{error}</p>}

    {loading && !data ? <div className="mt-10 flex justify-center text-[#87928a]"><Loader2 className="size-6 animate-spin" /></div> : data && <>
      <section className={`${card} mt-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className={heading}>{t('daily.stockTitle')}</h3><div role="group" className="inline-flex rounded-xl bg-[#eef1ed] p-1">{(['closing', 'used'] as const).map(m => <button type="button" key={m} onClick={() => switchMode(m)} aria-pressed={mode === m} className={`h-8 rounded-lg px-3 text-xs font-semibold transition ${mode === m ? 'bg-white text-[#174d3c] shadow-sm' : 'text-[#7d897f]'}`}>{t(m === 'closing' ? 'daily.modeClosing' : 'daily.modeUsed')}</button>)}</div></div>
        {data.rows.length === 0 ? <p className="mt-3 text-xs text-[#89938b]">{t('daily.noIngredients')}</p> : <>
          <p className="mt-1 text-[11px] text-[#89938b]">{t('daily.modeHint')}</p>
          <ul className="mt-3 divide-y divide-[#f0f2ef]">{data.rows.map(r => {
            const unit = t(`ingredients.units.${r.ingredient.unit}`)
            const raw = values[r.ingredient._id] ?? ''
            const filled = raw.trim() !== ''
            const other = filled ? round(r.available - Number(raw)) : null
            return <li key={r.ingredient._id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
              <div className="min-w-[140px] flex-1"><p className="text-sm font-semibold">{r.ingredient.name}</p><p className="mt-0.5 text-[11px] text-[#89938b]">{t('daily.opening')} {amount(r.opening)} · {t('daily.received')} {amount(r.received)} · <span className="font-semibold text-[#5f6b62]">{t('daily.available')} {amount(r.available)} {unit}</span></p></div>
              <div className="flex items-center gap-3">
                <div className="relative w-32"><label className="sr-only" htmlFor={`d-v-${r.ingredient._id}`}>{r.ingredient.name}: {t(mode === 'closing' ? 'daily.left' : 'daily.used')}</label><input id={`d-v-${r.ingredient._id}`} type="number" inputMode="decimal" min={0} step="0.001" placeholder={t(mode === 'closing' ? 'daily.left' : 'daily.used')} value={raw} onChange={e => setValues(v => ({ ...v, [r.ingredient._id]: e.target.value }))} className={`${input} pr-12 font-semibold`} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#87928a]">{unit}</span></div>
                <p className="w-36 text-[11px] font-medium">{other === null ? null
                  : mode === 'closing' ? (other >= 0 ? <span className="text-[#5f6b62]">{t('daily.usedIs', { quantity: amount(other), unit })}</span> : <span className="text-[#a8622f]">{t('daily.foundMore', { quantity: amount(-other), unit })}</span>)
                  : (other >= -0.0005 ? <span className="text-[#5f6b62]">{t('daily.leftIs', { quantity: amount(Math.max(other, 0)), unit })}</span> : <span className="text-[#b4472c]">{t('daily.usedTooMuch', { quantity: amount(r.available), unit })}</span>)}</p>
              </div>
            </li>
          })}</ul>
        </>}
      </section>

      <section className={`${card} mt-5`}>
        <h3 className={heading}>{t('daily.productionTitle')}</h3><p className="mt-1 text-[11px] text-[#89938b]">{t('daily.productionHint')}</p>
        {data.menuItems.length === 0 ? <p className="mt-3 text-xs text-[#89938b]">{t('daily.noMenuItems')}</p>
          : <div className="mt-3 grid gap-2 sm:grid-cols-2">{data.menuItems.map(m => <label key={m._id} className="flex items-center gap-3 rounded-xl border border-[#eef1ed] px-3 py-2"><span className="min-w-0 flex-1 truncate text-sm font-medium">{m.name}</span><span className="sr-only">{t('daily.made', { name: m.name })}</span><input type="number" inputMode="numeric" min={0} step="1" placeholder="0" value={made[m._id] ?? ''} onChange={e => setMade(v => ({ ...v, [m._id]: e.target.value }))} className="h-9 w-24 rounded-lg border border-[#e2e7e1] bg-[#fbfcfb] px-2.5 text-right text-sm font-semibold outline-none focus:border-[#8eaf9b]" /></label>)}</div>}
      </section>

      <section className={`${card} mt-5`}>
        <h3 className={heading}>{t('daily.shareTitle')}</h3><p className="mt-1 text-[11px] text-[#89938b]">{t('daily.shareHint')}</p>
        <div className="mt-3 flex flex-col gap-2">{shares.map((s, i) => {
          const set = (patch: Partial<Share>) => setShares(list => list.map(x => x.key === s.key ? { ...x, ...patch } : x))
          return <div key={s.key} className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor={`d-s-item-${s.key}`}>{t('daily.shareItem')} {i + 1}</label><input id={`d-s-item-${s.key}`} maxLength={60} placeholder={t('daily.shareItemPlaceholder')} value={s.item} onChange={e => set({ item: e.target.value })} className={`${input} min-w-[120px] flex-[2]`} />
            <label className="sr-only" htmlFor={`d-s-qty-${s.key}`}>{t('daily.shareQuantity')} {i + 1}</label><input id={`d-s-qty-${s.key}`} maxLength={30} placeholder={t('daily.shareQuantityPlaceholder')} value={s.quantity} onChange={e => set({ quantity: e.target.value })} className={`${input} min-w-[90px] flex-1`} />
            <label className="sr-only" htmlFor={`d-s-who-${s.key}`}>{t('daily.shareTakenBy')} {i + 1}</label><input id={`d-s-who-${s.key}`} maxLength={60} placeholder={t('daily.shareTakenBy')} value={s.takenBy} onChange={e => set({ takenBy: e.target.value })} className={`${input} min-w-[110px] flex-1`} />
            {shares.length > 1 && <button type="button" onClick={() => setShares(list => list.filter(x => x.key !== s.key))} aria-label={t('daily.removeShare')} className="flex size-10 items-center justify-center rounded-lg text-[#a0aaa2] hover:bg-[#fdf0ec] hover:text-[#b4472c]"><X className="size-4" /></button>}
          </div>
        })}</div>
        {shares.length < 50 && <button type="button" onClick={() => setShares(list => [...list, blankShare()])} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#174d3c] hover:underline"><Plus className="size-3.5" /> {t('daily.addShare')}</button>}
      </section>

      <section className={`${card} mt-5`}><label className={heading} htmlFor="d-note">{t('daily.note')} <span className="text-xs font-normal text-[#a0aaa2]">{t('common.optional')}</span></label><textarea id="d-note" maxLength={300} rows={2} value={note} onChange={e => setNote(e.target.value)} className="mt-2 w-full rounded-lg border border-[#e2e7e1] bg-[#fbfcfb] px-3 py-2 text-sm outline-none focus:border-[#8eaf9b]" /></section>

      <div className="sticky bottom-4 z-10 mt-5 flex items-center justify-end gap-3 rounded-2xl border border-[#e3e8e1] bg-white/95 p-3 shadow-lg backdrop-blur">
        {savedNow && <p role="status" className="flex items-center gap-1.5 text-xs font-semibold text-[#174d3c]"><CheckCircle2 className="size-4" /> {t('daily.saved')}</p>}
        <button disabled={saving || loading || tooMuch} className="flex h-11 items-center gap-2 rounded-xl bg-[#174d3c] px-5 text-sm font-semibold text-white hover:bg-[#123f31] disabled:opacity-50">{saving && <Loader2 className="size-4 animate-spin" />}{t('daily.save')}</button>
      </div>
    </>}
  </form>
}
