'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bike, Check, ChefHat, ChevronRight, Coffee, ImageOff, Loader2, Minus, Plus, Search, Utensils, X } from 'lucide-react'

type MenuItem = { _id: string; name: string; price: number; category: string; image: string; isAvailable: boolean }
type DiningTable = { _id: string; number: number; name: string; isActive: boolean }
type OrderType = 'Dine in' | 'Takeaway'

const taka = (n: number) => `৳ ${n.toLocaleString('en-IN')}`
// Tea and coffee items without a photo get a cup icon.
const isTea = (category: string) => /\b(tea|cha|chai|coffee)\b|চা|কফি/i.test(category)

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) window.location.href = '/admin/login'
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
  return data as T
}

export function WaiterPanel() {
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [tables, setTables] = useState<DiningTable[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [type, setType] = useState<OrderType>('Dine in')
  const [table, setTable] = useState<number | null>(null)
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState<{ code: string; where: string } | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [m, t] = await Promise.all([api<{ items: MenuItem[] }>('/api/menu'), api<{ tables: DiningTable[] }>('/api/tables')])
      setMenu(m.items.filter(i => i.isAvailable))
      setTables(t.tables.filter(x => x.isActive))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load the menu')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  // Hide the "sent" message after a few seconds.
  useEffect(() => {
    if (!sent) return
    const timer = setTimeout(() => setSent(null), 6000)
    return () => clearTimeout(timer)
  }, [sent])

  const categories = useMemo(() => ['All', ...new Set(menu.map(i => i.category))], [menu])
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return menu.filter(i => (category === 'All' || i.category === category) && (!q || i.name.toLowerCase().includes(q)))
  }, [menu, category, search])

  // Count from the latest state so quick repeated taps are never lost.
  const change = (id: string, delta: number) => setCart(current => {
    const qty = Math.min((current[id] ?? 0) + delta, 50)
    const next = { ...current }
    if (qty > 0) next[id] = qty; else delete next[id]
    return next
  })
  const lines = menu.flatMap(item => cart[item._id] ? [{ item, qty: cart[item._id] }] : [])
  const count = lines.reduce((sum, l) => sum + l.qty, 0)
  const total = lines.reduce((sum, l) => sum + l.item.price * l.qty, 0)

  const submit = async () => {
    setError('')
    if (lines.length === 0) return setError('Add at least one item')
    if (type === 'Dine in' && !table) return setError('Choose the table number')
    setSending(true)
    try {
      const { order } = await api<{ order: { code: string } }>('/api/orders/staff', { method: 'POST', body: JSON.stringify({ type, tableNumber: table, phone, customerName: name, note, items: lines.map(l => ({ id: l.item._id, qty: l.qty })) }) })
      setSent({ code: order.code, where: type === 'Dine in' ? `Table ${table}` : name || 'Takeaway' })
      setCart({})
      setTable(null)
      setPhone('')
      setName('')
      setNote('')
      setSheetOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the order')
    } finally {
      setSending(false)
    }
  }

  const panel = <OrderPanel {...{ lines, total, tables, type, setType, table, setTable, phone, setPhone, name, setName, note, setNote, sending, error, change, submit }} onTypeChange={() => setError('')} />

  return <div className="pb-24 lg:pb-0">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[.17em] text-[#bc7843]">Waiter order panel</p><h2 className="font-serif text-3xl font-bold tracking-tight">Take an order</h2></div></div>

    {sent && <div role="status" className="mb-5 flex items-center gap-3 rounded-2xl bg-[#174d3c] p-4 text-white"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15"><ChefHat className="size-5" /></span><div className="flex-1"><p className="font-semibold">Order {sent.code} sent to the kitchen</p><p className="text-xs text-white/75">{sent.where}</p></div><button aria-label="Dismiss" onClick={() => setSent(null)} className="flex size-9 items-center justify-center rounded-full hover:bg-white/10"><X className="size-4" /></button></div>}

    {loadError && <p role="alert" className="mb-5 rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{loadError}</p>}

    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section>
        <div className="relative"><Search className="absolute left-3 top-3 size-4 text-[#a0aaa2]" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search food..." aria-label="Search menu" className="h-10 w-full rounded-xl border border-[#e2e7e1] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#8eaf9b]" /></div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{categories.map(c => <button key={c} onClick={() => setCategory(c)} className={`h-9 shrink-0 rounded-full px-3.5 text-xs font-semibold transition ${category === c ? 'bg-[#174d3c] text-white' : 'bg-white text-[#5f6b62] ring-1 ring-inset ring-[#e3e8e1]'}`}>{c}</button>)}</div>

        {loading ? <div className="mt-10 flex justify-center text-[#87928a]"><Loader2 className="size-6 animate-spin" /></div>
          : visible.length === 0 ? <p className="mt-10 text-center text-sm text-[#89938b]">{menu.length === 0 ? 'No available items. Add items in the Menu tab.' : 'No items match.'}</p>
          : <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{visible.map(item => { const qty = cart[item._id] ?? 0; return <div key={item._id} className={`relative overflow-hidden rounded-2xl border bg-white transition ${qty ? 'border-[#174d3c] ring-2 ring-[#174d3c]' : 'border-[#e3e8e1]'}`}>
            <button onClick={() => change(item._id, 1)} aria-label={`Add ${item.name}`} className="block w-full text-left active:scale-[.98]">
              {item.image ? <img src={item.image} alt="" className="h-24 w-full object-cover" /> : <div className="flex h-24 items-center justify-center bg-[#f5f1e8] text-[#d2b893]">{isTea(item.category) ? <Coffee className="size-8" /> : <ImageOff className="size-7" />}</div>}
              <div className="p-3"><p className="line-clamp-2 min-h-10 text-sm font-semibold leading-snug">{item.name}</p><p className="mt-1 text-base font-bold text-[#b86f3c]">{taka(item.price)}</p></div>
            </button>
            {qty > 0 && <><span className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-[#174d3c] text-base font-bold text-white shadow">{qty}</span><button onClick={() => change(item._id, -1)} aria-label={`Remove one ${item.name}`} className="absolute left-2 top-2 flex size-9 items-center justify-center rounded-full bg-white text-[#174d3c] shadow"><Minus className="size-4" /></button></>}
          </div> })}</div>}
      </section>

      <aside className="sticky top-24 hidden rounded-2xl border border-[#e3e8e1] bg-white lg:block">{panel}</aside>
    </div>

    {/* Phones: the order lives in a bottom sheet. */}
    {count > 0 && !sheetOpen && <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden"><button onClick={() => setSheetOpen(true)} className="mx-auto flex h-14 w-full max-w-lg items-center gap-3 rounded-2xl bg-[#174d3c] px-4 text-white shadow-lg"><span className="flex size-8 items-center justify-center rounded-lg bg-white/15 text-sm font-bold">{count}</span><span className="flex-1 text-left font-semibold">Review order</span><span className="text-lg font-bold">{taka(total)}</span><ChevronRight className="size-5" /></button></div>}
    {sheetOpen && <div className="fixed inset-0 z-50 flex items-end bg-[#202521]/40 lg:hidden" onClick={() => setSheetOpen(false)}><div role="dialog" aria-modal="true" aria-label="Order" onClick={e => e.stopPropagation()} className="relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white"><div className="flex justify-center pt-2.5"><span className="h-1.5 w-10 rounded-full bg-[#e2e5e0]" /></div><button aria-label="Close" onClick={() => setSheetOpen(false)} className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full hover:bg-[#f2f4f0]"><X className="size-5" /></button>{panel}</div></div>}
  </div>
}

type PanelProps = {
  lines: { item: MenuItem; qty: number }[]; total: number; tables: DiningTable[]
  type: OrderType; setType: (t: OrderType) => void; table: number | null; setTable: (n: number | null) => void
  phone: string; setPhone: (v: string) => void; name: string; setName: (v: string) => void; note: string; setNote: (v: string) => void
  sending: boolean; error: string; change: (id: string, delta: number) => void; submit: () => void; onTypeChange: () => void
}

function OrderPanel({ lines, total, tables, type, setType, table, setTable, phone, setPhone, name, setName, note, setNote, sending, error, change, submit, onTypeChange }: PanelProps) {
  const input = 'h-11 w-full rounded-xl border border-[#e2e7e1] bg-[#fbfcfb] px-3 text-sm outline-none focus:border-[#8eaf9b]'
  return <div className="flex min-h-0 flex-1 flex-col">
    <div className="min-h-0 flex-1 overflow-y-auto p-5 lg:max-h-[calc(100dvh-14rem)]">
      <h3 className="font-serif text-xl font-bold">Order</h3>

      <div className="mt-4 grid grid-cols-2 gap-2">{([['Dine in', Utensils], ['Takeaway', Bike]] as const).map(([value, Icon]) => <button key={value} type="button" aria-pressed={type === value} onClick={() => { setType(value); onTypeChange() }} className={`flex h-12 items-center justify-center gap-2 rounded-xl border-2 text-sm font-bold transition ${type === value ? 'border-[#174d3c] bg-[#eef4ed] text-[#174d3c]' : 'border-[#e6e9e4] text-[#5f6b62]'}`}><Icon className="size-4" />{value}</button>)}</div>

      {type === 'Dine in' ? <div className="mt-4"><p className="mb-2 text-xs font-semibold text-[#5f6b62]">Table</p>{tables.length > 0
        ? <div className="grid grid-cols-5 gap-2">{tables.map(t => <button key={t._id} type="button" aria-pressed={table === t.number} aria-label={`Table ${t.number}`} onClick={() => setTable(t.number)} className={`h-11 rounded-xl text-base font-bold transition ${table === t.number ? 'bg-[#174d3c] text-white' : 'bg-[#f1f4f0]'}`}>{t.number}</button>)}</div>
        : <input type="number" inputMode="numeric" min={1} placeholder="Table number" aria-label="Table number" value={table ?? ''} onChange={e => setTable(e.target.value ? Number(e.target.value) : null)} className={input} />}</div>
        : <div className="mt-4 grid gap-2"><input type="tel" inputMode="tel" placeholder="Mobile number (optional)" aria-label="Mobile number" value={phone} onChange={e => setPhone(e.target.value)} className={input} /><input placeholder="Guest name (optional)" aria-label="Guest name" value={name} onChange={e => setName(e.target.value)} className={input} /></div>}

      <div className="mt-5 border-t border-[#eef0ec] pt-4">{lines.length === 0
        ? <p className="py-6 text-center text-sm text-[#89938b]">Tap food on the menu to add it.</p>
        : <ul className="divide-y divide-[#eef0ec]">{lines.map(({ item, qty }) => <li key={item._id} className="flex items-center gap-2 py-2.5">
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.name}</p><p className="text-xs text-[#89938b]">{taka(item.price)} each</p></div>
          <div className="flex h-9 items-center rounded-lg bg-[#eef4ed] text-[#174d3c]"><button type="button" onClick={() => change(item._id, -1)} aria-label={`Remove one ${item.name}`} className="flex size-9 items-center justify-center"><Minus className="size-4" /></button><span className="w-6 text-center font-bold">{qty}</span><button type="button" onClick={() => change(item._id, 1)} aria-label={`Add one ${item.name}`} className="flex size-9 items-center justify-center"><Plus className="size-4" /></button></div>
          <span className="w-16 text-right text-sm font-bold">{taka(item.price * qty)}</span>
        </li>)}</ul>}</div>

      <label className="mt-3 block"><span className="sr-only">Note for the kitchen</span><input placeholder="Note for the kitchen (optional)" value={note} maxLength={200} onChange={e => setNote(e.target.value)} className={input} /></label>
    </div>

    <div className="border-t border-[#eef0ec] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      {error && <p role="alert" className="mb-3 rounded-xl bg-[#fdf0ec] px-3 py-2.5 text-xs font-medium text-[#b4472c]">{error}</p>}
      <div className="mb-3 flex items-baseline justify-between"><span className="text-sm text-[#5f6b62]">Total</span><span className="text-2xl font-bold">{taka(total)}</span></div>
      <button type="button" onClick={submit} disabled={sending || lines.length === 0} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#174d3c] py-3.5 text-base font-bold text-white hover:bg-[#123f31] disabled:opacity-50">{sending ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}{sending ? 'Sending…' : 'Send to kitchen'}</button>
    </div>
  </div>
}
