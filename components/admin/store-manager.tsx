'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Loader2, Package, Plus, RefreshCw, Search, ShoppingBasket, Trash2, Warehouse, X } from 'lucide-react'
import { businessDateString } from '@/lib/time'
import type { MessageKey, TFunction } from '@/lib/i18n'
import { useIntlLocale, useT } from '@/components/i18n-provider'
import { addDays, DateRangePicker, describeRange, formatDay, PRESETS, type DateRange } from './date-range-picker'

type Unit = 'kg' | 'litre' | 'piece' | 'packet'
type StockItem = { _id: string; name: string; unit: Unit; isActive: boolean; stock: number; avgPrice: number | null }
type Purchase = { _id: string; date: string; ingredient: { _id: string; name: string; unit: Unit } | null; quantity: number; cost: number; paidTo: string; note: string; addedBy: string }
type FormState = { date: string; ingredient: string; quantity: string; cost: string; category: string; paidTo: string; note: string }

const taka = (n: number) => `৳ ${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const amount = (n: number, digits = 3) => n.toLocaleString('en-IN', { maximumFractionDigits: digits })

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) window.location.href = '/admin/login'
  if (!res.ok) throw new Error(data.error ?? '')
  return data as T
}

const errorText = (err: unknown, t: TFunction, fallback: MessageKey) => err instanceof Error ? err.message || t('common.somethingWentWrong') : t(fallback)

export function StoreManager() {
  const t = useT()
  const [tab, setTab] = useState<'stock' | 'purchases'>('stock')
  const [items, setItems] = useState<StockItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  // Bumped after a save so the purchases list reloads too.
  const [version, setVersion] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api<{ ingredients: StockItem[]; categories: string[] }>('/api/store')
      setItems(data.ingredients)
      setCategories(data.categories)
    } catch (err) {
      setError(errorText(err, t, 'store.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  const changed = () => {
    load()
    setVersion(v => v + 1)
  }

  const tabClass = (on: boolean) => `h-10 rounded-lg px-4 text-sm font-semibold transition ${on ? 'bg-white text-[#174d3c] shadow-sm' : 'text-[#7d897f] hover:text-[#174d3c]'}`

  return <div className="pb-20 sm:pb-0">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[.17em] text-[#bc7843]">{t('store.eyebrow')}</p><h2 className="font-serif text-3xl font-bold tracking-tight">{t('store.title')}</h2><p className="mt-1 max-w-xl text-xs text-[#89938b]">{t('store.subtitle')}</p></div><div className="flex gap-2"><button onClick={changed} aria-label={t('store.refresh')} className="flex size-10 items-center justify-center rounded-xl border border-[#e0e5df] bg-white text-[#68756b] hover:bg-[#f5f7f4]"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button><button onClick={() => setAdding(true)} disabled={items.length === 0} className="hidden items-center gap-2 rounded-xl bg-[#174d3c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123f31] disabled:opacity-50 sm:flex"><Plus className="size-4" /> {t('store.addPurchase')}</button></div></div>

    <div role="tablist" className="inline-flex rounded-xl bg-[#eef1ed] p-1">{(['stock', 'purchases'] as const).map(id => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={tabClass(tab === id)}>{t(`store.tabs.${id}`)}</button>)}</div>

    {error && <p role="alert" className="mt-5 rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{error}</p>}

    {tab === 'stock' ? <StockList items={items} loading={loading} /> : <PurchaseList version={version} onDeleted={changed} />}

    {items.length > 0 && <button onClick={() => setAdding(true)} aria-label={t('store.addPurchase')} className="fixed bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.5rem)] right-4 z-30 flex size-14 items-center justify-center rounded-full bg-[#c48545] text-white shadow-xl sm:hidden"><Plus className="size-6" /></button>}

    {adding && <PurchaseForm items={items} categories={categories} onClose={() => setAdding(false)} onSaved={another => { if (!another) setAdding(false); changed() }} />}
  </div>
}

function StockList({ items, loading }: { items: StockItem[]; loading: boolean }) {
  const t = useT()
  const [search, setSearch] = useState('')
  // Hidden ingredients still show while there is some left of them.
  const shown = useMemo(() => items.filter(i => i.isActive || i.stock !== 0), [items])
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? shown.filter(i => i.name.toLowerCase().includes(q)) : shown
  }, [shown, search])
  const value = shown.reduce((sum, i) => sum + (i.stock > 0 && i.avgPrice ? i.stock * i.avgPrice : 0), 0)
  const inStock = shown.filter(i => i.stock > 0).length

  if (loading && items.length === 0) return <div className="mt-10 flex justify-center text-[#87928a]"><Loader2 className="size-6 animate-spin" /></div>
  if (items.length === 0) return <div className="mt-6 flex max-w-2xl flex-col items-center rounded-2xl border border-dashed border-[#d9e0d8] bg-white px-6 py-14 text-center"><Package className="size-10 text-[#c7d1c7]" /><p className="mt-4 font-semibold">{t('store.noIngredientsTitle')}</p><p className="mt-1 text-xs text-[#89938b]">{t('store.noIngredientsHint')}</p></div>

  return <>
    <section className="mt-5 grid max-w-3xl gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-[#e3e8e1] bg-white p-5"><p className="text-xs font-medium text-[#87928a]">{t('store.stockValue')}</p><p className="mt-1 font-serif text-3xl font-bold tracking-tight text-[#174d3c]">{taka(Math.round(value))}</p><p className="mt-1 text-[11px] text-[#9aa39c]">{t('store.stockValueHint')}</p></div>
      <div className="flex items-center gap-4 rounded-2xl border border-[#e3e8e1] bg-white p-5"><div className="flex size-12 items-center justify-center rounded-xl bg-[#f3efe6] text-[#8a5a24]"><Warehouse className="size-6" /></div><p className="text-sm font-semibold">{t('store.inStock', { count: inStock, total: shown.length })}</p></div>
    </section>

    {shown.length > 8 && <div className="relative mt-5 max-w-xs"><Search className="absolute left-3 top-2.5 size-4 text-[#a0aaa2]" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('store.searchPlaceholder')} aria-label={t('store.searchPlaceholder')} className="h-9 w-full rounded-lg border border-[#e2e7e1] bg-white pl-9 pr-3 text-xs outline-none focus:border-[#8eaf9b]" /></div>}

    {visible.length === 0 ? <p className="mt-8 text-sm text-[#89938b]">{t('store.noMatch')}</p>
      : <ul className="mt-5 max-w-3xl divide-y divide-[#f0f2ef] rounded-2xl border border-[#e3e8e1] bg-white px-5">{visible.map(i => {
        const unit = t(`ingredients.units.${i.unit}`)
        return <li key={i._id} className={`flex items-center gap-3 py-3.5 ${i.stock > 0 ? '' : 'opacity-60'}`}>
          <div className="min-w-0 flex-1"><p className="flex items-center gap-2 truncate text-sm font-semibold">{i.name}{!i.isActive && <span className="text-[11px] font-medium text-[#a0aaa2]">{t('store.hidden')}</span>}</p><p className="mt-0.5 text-[11px] text-[#89938b]">{i.avgPrice === null ? t('store.noPurchaseYet') : t('store.avgPrice', { price: amount(i.avgPrice, 2), unit })}</p></div>
          <div className="text-right">{i.stock > 0 ? <><p className="text-base font-bold">{amount(i.stock)} <span className="text-xs font-semibold text-[#68756b]">{unit}</span></p>{i.avgPrice !== null && <p className="text-[11px] text-[#89938b]">{taka(Math.round(i.stock * i.avgPrice))}</p>}</>
            : <p className={`text-xs font-semibold ${i.stock < 0 ? 'text-[#b4472c]' : 'text-[#a0aaa2]'}`}>{i.stock < 0 ? `${amount(i.stock)} ${unit}` : t('store.outOfStock')}</p>}</div>
        </li>
      })}</ul>}
  </>
}

function PurchaseList({ version, onDeleted }: { version: number; onDeleted: () => void }) {
  const t = useT()
  const locale = useIntlLocale()
  const [range, setRange] = useState<DateRange>(() => PRESETS.find(p => p.id === 'thisMonth')!.range())
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setPurchases((await api<{ purchases: Purchase[] }>(`/api/store/purchases?from=${range.from}&to=${range.to}`)).purchases)
    } catch (err) {
      setError(errorText(err, t, 'store.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [range, t])

  // `version` changes after a purchase is saved elsewhere on the page.
  useEffect(() => { load() }, [load, version])

  const total = purchases.reduce((sum, p) => sum + p.cost, 0)
  const byDay = useMemo(() => {
    const groups = new Map<string, Purchase[]>()
    for (const p of purchases) {
      const day = businessDateString(new Date(p.date))
      groups.set(day, [...(groups.get(day) ?? []), p])
    }
    return [...groups.entries()]
  }, [purchases])

  const remove = async (p: Purchase) => {
    setBusyId(p._id)
    setError('')
    try {
      await api(`/api/store/purchases/${p._id}`, { method: 'DELETE' })
      setConfirmDelete(null)
      onDeleted()
    } catch (err) {
      setError(errorText(err, t, 'store.deleteFailed'))
    } finally {
      setBusyId(null)
    }
  }

  return <div className="mt-5">
    <DateRangePicker value={range} onChange={setRange} />

    <div className="mt-5 max-w-sm rounded-2xl border border-[#e3e8e1] bg-white p-5"><p className="text-xs font-medium text-[#87928a]">{t('store.totalBought')}</p><p className="mt-1 font-serif text-3xl font-bold tracking-tight text-[#b4472c]">{taka(total)}</p><p className="mt-1 text-[11px] text-[#9aa39c]">{describeRange(range, locale)} · {t(purchases.length === 1 ? 'store.entryOne' : 'store.entryMany', { count: purchases.length })}</p></div>

    {error && <p role="alert" className="mt-5 rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{error}</p>}

    {loading && purchases.length === 0 ? <div className="mt-10 flex justify-center text-[#87928a]"><Loader2 className="size-6 animate-spin" /></div>
      : purchases.length === 0 ? <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-[#d9e0d8] bg-white px-6 py-14 text-center"><ShoppingBasket className="size-10 text-[#c7d1c7]" /><p className="mt-4 font-semibold">{t('store.emptyTitle')}</p><p className="mt-1 text-xs text-[#89938b]">{t('store.emptyHint')}</p></div>
      : <div className="mt-5 flex flex-col gap-5">{byDay.map(([day, list]) => <section key={day} className="overflow-hidden rounded-2xl border border-[#e3e8e1] bg-white">
        <div className="flex items-center justify-between border-b border-[#eef1ed] bg-[#fafbf9] px-5 py-3"><h3 className="text-sm font-semibold">{formatDay(day, locale, true)}</h3><span className="text-sm font-bold text-[#b4472c]">{taka(list.reduce((sum, p) => sum + p.cost, 0))}</span></div>
        <ul className="divide-y divide-[#f0f2ef]">{list.map(p => {
          const unit = p.ingredient ? t(`ingredients.units.${p.ingredient.unit}`) : ''
          return <li key={p._id} className="flex items-start gap-3 px-5 py-3">
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{p.ingredient?.name ?? t('store.deletedIngredient')}<span className="ml-1.5 font-normal text-[#68756b]">· {amount(p.quantity)} {unit}</span></p><p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#89938b]"><span>{t('store.perUnit', { price: amount(p.cost / p.quantity, 2), unit })}</span>{p.paidTo && <span>{p.paidTo}</span>}{p.addedBy && <span>{t('store.addedBy', { name: p.addedBy })}</span>}</p>{p.note && <p className="mt-1 text-xs text-[#68756b]">{p.note}</p>}</div>
            {confirmDelete === p._id ? <div className="flex shrink-0 flex-col items-end gap-1.5"><p className="text-[11px] font-medium text-[#b4472c]">{t('store.confirmDelete')}</p><div className="flex gap-1.5"><button onClick={() => setConfirmDelete(null)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#68756b] hover:bg-[#f5f7f4]">{t('common.cancel')}</button><button onClick={() => remove(p)} disabled={busyId === p._id} className="rounded-lg bg-[#b4472c] px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60">{t('common.delete')}</button></div></div>
              : <><span className="shrink-0 text-sm font-bold">{taka(p.cost)}</span><button onClick={() => setConfirmDelete(p._id)} aria-label={t('store.deleteLabel')} className="-mr-2 flex size-8 shrink-0 items-center justify-center rounded-lg text-[#b5bdb6] hover:bg-[#fdf0ec] hover:text-[#b4472c]"><Trash2 className="size-3.5" /></button></>}
          </li>
        })}</ul>
      </section>)}</div>}
  </div>
}

function PurchaseForm({ items, categories, onClose, onSaved }: { items: StockItem[]; categories: string[]; onClose: () => void; onSaved: (another: boolean) => void }) {
  const t = useT()
  const today = businessDateString()
  const choices = items.filter(i => i.isActive)
  // Bazar is the usual home for these; the user can switch to Grocery and so on.
  const defaultCategory = categories.includes('Bazar') ? 'Bazar' : categories[0] ?? ''
  const [form, setForm] = useState<FormState>({ date: today, ingredient: '', quantity: '', cost: '', category: defaultCategory, paidTo: '', note: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [addedCount, setAddedCount] = useState(0)
  const [showNote, setShowNote] = useState(false)
  const ingredientRef = useRef<HTMLSelectElement>(null)
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(current => ({ ...current, [key]: value }))

  const chosen = choices.find(i => i._id === form.ingredient)
  const unit = chosen ? t(`ingredients.units.${chosen.unit}`) : ''
  const quantity = Number(form.quantity)
  const cost = Number(form.cost)
  const unitPrice = chosen && quantity > 0 && cost > 0 ? cost / quantity : null

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // "Save & add another" keeps the date, category and shop, for writing down a whole bazar list.
    const another = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'another'
    if (!form.ingredient) return setError(t('store.chooseIngredient'))
    setSaving(true)
    setError('')
    try {
      await api('/api/store/purchases', { method: 'POST', body: JSON.stringify({ ...form, quantity, cost }) })
      onSaved(another)
      if (another) {
        setForm(current => ({ ...current, ingredient: '', quantity: '', cost: '', note: '' }))
        setShowNote(false)
        setAddedCount(n => n + 1)
        ingredientRef.current?.focus()
      }
    } catch (err) {
      setError(errorText(err, t, 'store.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const input = 'mt-1.5 h-11 w-full rounded-xl border border-[#e2e7e1] bg-[#fbfcfb] px-3 text-sm outline-none focus:border-[#8eaf9b]'
  const label = 'block text-xs font-semibold text-[#5f6b62]'
  const chip = (on: boolean) => `h-9 rounded-full px-3.5 text-xs font-semibold transition ${on ? 'bg-[#174d3c] text-white' : 'border border-[#e2e7e1] bg-white text-[#5f6b62] hover:bg-[#f5f7f4]'}`

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#202521]/30 p-0 sm:items-center sm:p-4" onClick={onClose}>
    <form onSubmit={submit} onClick={e => e.stopPropagation()} className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl">
      <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.16em] text-[#b86f3c]">{t('store.formEyebrow')}</p><h3 className="mt-1 font-serif text-2xl font-bold">{t('store.formTitle')}</h3></div><button type="button" aria-label={t('common.close')} onClick={onClose} className="rounded-full p-2 hover:bg-[#f2f4f0]"><X className="size-5" /></button></div>
      {addedCount > 0 && <p role="status" className="mt-4 rounded-lg bg-[#eaf2eb] px-3 py-2 text-xs font-medium text-[#174d3c]">{t('store.addedCount', { count: addedCount })}</p>}

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="col-span-2"><label className={label} htmlFor="p-ingredient">{t('store.ingredient')}</label><select ref={ingredientRef} id="p-ingredient" required autoFocus value={form.ingredient} onChange={e => set('ingredient', e.target.value)} className={input}><option value="">{t('store.chooseIngredient')}</option>{choices.map(i => <option key={i._id} value={i._id}>{i.name} ({t(`ingredients.units.${i.unit}`)})</option>)}</select></div>

        <div><label className={label} htmlFor="p-qty">{t('store.quantity')}</label><div className="relative"><input id="p-qty" type="number" inputMode="decimal" min={0.001} step="0.001" required placeholder="0" value={form.quantity} onChange={e => set('quantity', e.target.value)} className={`${input} pr-16 text-lg font-semibold`} />{unit && <span className="pointer-events-none absolute right-3 top-1/2 mt-[3px] -translate-y-1/2 text-xs font-semibold text-[#87928a]">{unit}</span>}</div></div>
        <div><label className={label} htmlFor="p-cost">{t('store.cost')}</label><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 mt-[3px] -translate-y-1/2 text-lg font-semibold text-[#87928a]">৳</span><input id="p-cost" type="number" inputMode="decimal" min={0.01} step="0.01" required placeholder="0" value={form.cost} onChange={e => set('cost', e.target.value)} className={`${input} pl-8 text-lg font-semibold`} /></div></div>
        {unitPrice !== null && <p className="col-span-2 -mt-2 text-[11px] text-[#89938b]">{t('store.unitPrice', { price: amount(unitPrice, 2), unit })}{chosen?.avgPrice != null && <span> · {t('store.avgPrice', { price: amount(chosen.avgPrice, 2), unit })}</span>}</p>}

        <div className="col-span-2"><p className={label}>{t('store.category')}</p><div className="mt-2 flex flex-wrap gap-1.5">{categories.map(c => <button type="button" key={c} onClick={() => set('category', c)} aria-pressed={form.category === c} className={chip(form.category === c)}>{c}</button>)}</div></div>

        <div className="col-span-2"><p className={label}>{t('store.date')}</p><div className="mt-1.5 flex flex-wrap items-center gap-1.5"><button type="button" onClick={() => set('date', today)} className={chip(form.date === today)}>{t('dates.presets.today')}</button><button type="button" onClick={() => set('date', addDays(today, -1))} className={chip(form.date === addDays(today, -1))}>{t('dates.presets.yesterday')}</button><label className="sr-only" htmlFor="p-date">{t('store.date')}</label><input id="p-date" type="date" required max={today} value={form.date} onChange={e => e.target.value && set('date', e.target.value)} className="h-9 rounded-full border border-[#e2e7e1] bg-white px-3 text-xs font-medium outline-none focus:border-[#8eaf9b]" /></div></div>

        <div className="col-span-2"><label className={label} htmlFor="p-paid">{t('store.paidTo')} <span className="font-normal text-[#a0aaa2]">{t('common.optional')}</span></label><input id="p-paid" maxLength={60} placeholder={t('store.paidToPlaceholder')} value={form.paidTo} onChange={e => set('paidTo', e.target.value)} className={input} /></div>

        {showNote ? <div className="col-span-2"><label className={label} htmlFor="p-note">{t('store.note')}</label><textarea id="p-note" autoFocus maxLength={200} rows={2} value={form.note} onChange={e => set('note', e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#e2e7e1] bg-[#fbfcfb] px-3 py-2 text-sm outline-none focus:border-[#8eaf9b]" /></div>
          : <button type="button" onClick={() => setShowNote(true)} className="col-span-2 justify-self-start text-xs font-semibold text-[#174d3c] hover:underline">{t('store.addNote')}</button>}
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg bg-[#fdf0ec] px-3 py-2 text-xs font-medium text-[#b4472c]">{error}</p>}

      <div className="mt-6 flex flex-wrap justify-end gap-2"><button type="submit" value="another" disabled={saving} className="h-11 rounded-xl border border-[#e0e5df] bg-white px-4 text-sm font-semibold text-[#5f6b62] hover:bg-[#f5f7f4] disabled:opacity-60">{t('store.saveAndAddAnother')}</button><button type="submit" disabled={saving} className="flex h-11 items-center gap-2 rounded-xl bg-[#174d3c] px-5 text-sm font-semibold text-white hover:bg-[#123f31] disabled:opacity-60">{saving && <Loader2 className="size-4 animate-spin" />}{t('common.save')}</button></div>
    </form>
  </div>
}
