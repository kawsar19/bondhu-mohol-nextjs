'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Bike, Check, ChefHat, ChevronRight, Coffee, Loader2, Minus, Plus, ShoppingBag, Utensils, UtensilsCrossed, X } from 'lucide-react'

export type PublicMenuItem = { id: string; name: string; description: string; category: string; price: number; image: string; isPopular: boolean }
export type PublicTable = { number: number; name: string }
type OrderType = 'Dine in' | 'Takeaway'
type TrackedOrder = { id: string; code: string; type: OrderType; tableNumber: number | null; items: { name: string; price: number; qty: number }[]; total: number; status: string }
type SavedOrder = { id: string; token: string; code: string }

// Tea and coffee items without a photo get a cup icon.
const isTea = (category: string) => /\b(tea|cha|chai|coffee)\b|চা|কফি/i.test(category)
const OPEN = ['Pending', 'Preparing', 'Ready', 'Served']
const taka = (n: number) => `৳ ${n.toLocaleString('en-IN')}`

// Browser storage can be unavailable (private mode, blocked); the page must work without it.
function load<T>(key: string): T | null {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : null } catch { return null }
}
function save(key: string, value: unknown) {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
}

export function CustomerMenu({ items, tables, initialTable }: { items: PublicMenuItem[]; tables: PublicTable[]; initialTable: number | null }) {
  const [cart, setCart] = useState<Record<string, number>>({})
  const [sheet, setSheet] = useState<'cart' | 'track' | null>(null)
  const [saved, setSaved] = useState<SavedOrder | null>(null)
  const [tracked, setTracked] = useState<TrackedOrder | null>(null)
  const [activeCategory, setActiveCategory] = useState('')
  const itemById = useMemo(() => new Map(items.map(i => [i.id, i])), [items])

  // Restore cart and last order after mount (storage is client-only).
  useEffect(() => {
    const stored = load<Record<string, number>>('bm_cart') ?? {}
    setCart(Object.fromEntries(Object.entries(stored).filter(([id, qty]) => itemById.has(id) && qty > 0)))
    setSaved(load<SavedOrder>('bm_last_order'))
  }, [itemById])
  useEffect(() => { save('bm_cart', Object.keys(cart).length ? cart : null) }, [cart])

  // Follow the last order's status until it is finished.
  const refreshOrder = useCallback(async (order: SavedOrder) => {
    try {
      const res = await fetch(`/api/orders/${order.id}/track?token=${order.token}`, { cache: 'no-store' })
      if (res.status === 404) { save('bm_last_order', null); setSaved(null); setTracked(null); return }
      if (res.ok) setTracked((await res.json()).order)
    } catch { /* offline: keep last known status */ }
  }, [])
  useEffect(() => {
    if (!saved) return
    refreshOrder(saved)
    const timer = setInterval(() => refreshOrder(saved), 8000)
    return () => clearInterval(timer)
  }, [saved, refreshOrder])
  const orderIsOpen = tracked ? OPEN.includes(tracked.status) : false

  // Lock page scroll behind the sheet.
  useEffect(() => {
    if (!sheet) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [sheet])

  const groups = useMemo(() => {
    const result: { name: string; items: PublicMenuItem[] }[] = []
    const popular = items.filter(i => i.isPopular)
    if (popular.length) result.push({ name: 'Popular', items: popular })
    for (const item of items) {
      const group = result.find(g => g.name === item.category && g.name !== 'Popular') ?? (result.push({ name: item.category, items: [] }), result[result.length - 1])
      group.items.push(item)
    }
    return result
  }, [items])

  // Highlight the category chip for the group in view.
  const chipBar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    setActiveCategory(groups[0]?.name ?? '')
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (visible) setActiveCategory(visible.target.getAttribute('data-category') ?? '')
    }, { rootMargin: '-80px 0px -60% 0px' })
    document.querySelectorAll('[data-category]').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [groups])
  // Scroll only the chip bar sideways. scrollIntoView would also move the page and fight the guest's own scrolling on phones.
  useEffect(() => {
    const bar = chipBar.current
    const chip = bar?.querySelector<HTMLElement>(`[data-chip="${CSS.escape(activeCategory)}"]`)
    if (!bar || !chip) return
    const left = chip.offsetLeft - bar.offsetLeft
    if (left >= bar.scrollLeft && left + chip.offsetWidth <= bar.scrollLeft + bar.clientWidth) return
    bar.scrollTo({ left: left - (bar.clientWidth - chip.offsetWidth) / 2, behavior: 'smooth' })
  }, [activeCategory])

  const setQty = (id: string, qty: number) => setCart(current => {
    const next = { ...current }
    if (qty > 0) next[id] = Math.min(qty, 50); else delete next[id]
    return next
  })
  const lines = Object.entries(cart).flatMap(([id, qty]) => { const item = itemById.get(id); return item ? [{ item, qty }] : [] })
  const count = lines.reduce((sum, l) => sum + l.qty, 0)
  const total = lines.reduce((sum, l) => sum + l.item.price * l.qty, 0)

  const placed = (order: SavedOrder) => {
    save('bm_last_order', order)
    setSaved(order)
    setTracked(null)
    setCart({})
    setSheet('track')
  }

  return <main className="min-h-dvh bg-[#fbfaf7] pb-32 text-[#202521]">
    <header className="px-4 pt-5 sm:px-8"><div className="mx-auto flex max-w-5xl items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-2xl bg-[#174d3c] text-white"><Utensils className="size-5" /></div><div><p className="font-serif text-xl font-bold leading-tight">Bondhu Mohol</p><p className="text-xs text-[#89938b]">Restaurant &amp; Tea Stall</p></div></div>{initialTable && <span className="rounded-full bg-[#f4ddca] px-3 py-1.5 text-sm font-bold text-[#8a4f26]">Table {initialTable}</span>}</div></header>

    {saved && tracked && orderIsOpen && <div className="mx-auto mt-4 max-w-5xl px-4 sm:px-8"><button onClick={() => setSheet('track')} className="flex w-full items-center gap-3 rounded-2xl bg-[#174d3c] p-4 text-left text-white"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15">{tracked.status === 'Ready' ? <Check className="size-5" /> : <ChefHat className="size-5" />}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Order {tracked.code}</span><span className="block text-xs text-white/75">{statusLine(tracked)}</span></span><ChevronRight className="size-5 shrink-0" /></button></div>}

    {items.length === 0 ? <div className="mx-auto mt-6 max-w-5xl px-4 sm:px-8"><div className="flex flex-col items-center rounded-3xl border border-dashed border-[#e3ded3] bg-white px-6 py-16 text-center"><UtensilsCrossed className="size-10 text-[#c7d1c7]" /><p className="mt-4 text-lg font-semibold">The menu is being prepared</p><p className="mt-1 text-sm text-[#89938b]">Please check back in a little while.</p></div></div> : <>
      <div className="sticky top-0 z-30 mt-4 border-b border-[#ece8df] bg-[#fbfaf7]/95 backdrop-blur"><div className="mx-auto max-w-5xl px-4 sm:px-8">
        <div ref={chipBar} className="-mx-4 flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] sm:mx-0 sm:px-0">{groups.map(g => <button key={g.name} data-chip={g.name} onClick={() => document.getElementById(`cat-${g.name}`)?.scrollIntoView({ behavior: 'smooth' })} className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition ${activeCategory === g.name ? 'bg-[#174d3c] text-white' : 'bg-white text-[#5f6b62] ring-1 ring-inset ring-[#e3e8e1]'}`}>{g.name}</button>)}</div>
      </div></div>

      <div className="mx-auto max-w-5xl px-4 sm:px-8">{groups.map(group => <section key={group.name} id={`cat-${group.name}`} data-category={group.name} className="scroll-mt-20 pt-6">
        <h2 className="mb-3 font-serif text-2xl font-bold">{group.name}</h2>
        <div className="grid gap-3 md:grid-cols-2">{group.items.map(item => <ItemRow key={item.id} item={item} qty={cart[item.id] ?? 0} onQty={qty => setQty(item.id, qty)} />)}</div>
      </section>)}</div>
    </>}

    {count > 0 && !sheet && <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-[#fbfaf7] via-[#fbfaf7] to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6"><button onClick={() => setSheet('cart')} className="mx-auto flex h-16 w-full max-w-lg items-center gap-3 rounded-2xl bg-[#174d3c] px-4 text-white shadow-lg shadow-[#174d3c]/25 active:scale-[.99]"><span className="flex size-9 items-center justify-center rounded-xl bg-white/15 text-base font-bold">{count}</span><span className="flex-1 text-left text-base font-semibold">View order</span><span className="text-xl font-bold">{taka(total)}</span><ChevronRight className="size-5" /></button></div>}

    {sheet && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#202521]/40 sm:items-center sm:p-4" onClick={() => setSheet(null)}>
      <div role="dialog" aria-modal="true" aria-label={sheet === 'cart' ? 'Your order' : 'Order status'} onClick={e => e.stopPropagation()} className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-[#e2e5e0] sm:hidden" />
        {sheet === 'cart'
          ? <CartSheet lines={lines} total={total} tables={tables} initialTable={initialTable} onQty={setQty} onClose={() => setSheet(null)} onPlaced={placed} />
          : <TrackSheet order={tracked} code={saved?.code ?? ''} onClose={() => setSheet(null)} />}
      </div>
    </div>}
  </main>
}

function ItemRow({ item, qty, onQty }: { item: PublicMenuItem; qty: number; onQty: (qty: number) => void }) {
  return <article className={`flex gap-3 rounded-2xl border bg-white p-3 transition ${qty ? 'border-[#9cc2aa] ring-1 ring-[#9cc2aa]' : 'border-[#ebece6]'}`}>
    {item.image ? <img src={item.image} alt="" loading="lazy" className="size-24 shrink-0 rounded-xl object-cover" /> : <div className="flex size-24 shrink-0 items-center justify-center rounded-xl bg-[#f5f1e8] text-[#d2b893]">{isTea(item.category) ? <Coffee className="size-9" /> : <Utensils className="size-8" />}</div>}
    <div className="flex min-w-0 flex-1 flex-col">
      <h3 className="text-base font-semibold leading-snug">{item.name}</h3>
      {item.description && <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#89938b]">{item.description}</p>}
      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <span className="text-xl font-bold text-[#b86f3c]">{taka(item.price)}</span>
        {qty === 0
          ? <button onClick={() => onQty(1)} aria-label={`Add ${item.name}`} className="flex h-11 items-center gap-1.5 rounded-xl bg-[#174d3c] px-4 text-sm font-bold text-white active:scale-95"><Plus className="size-5" /> Add</button>
          : <Stepper qty={qty} name={item.name} onQty={onQty} />}
      </div>
    </div>
  </article>
}

function Stepper({ qty, name, onQty }: { qty: number; name: string; onQty: (qty: number) => void }) {
  return <div className="flex h-11 items-center rounded-xl bg-[#eef4ed] text-[#174d3c]">
    <button onClick={() => onQty(qty - 1)} aria-label={`Remove one ${name}`} className="flex h-11 w-11 items-center justify-center rounded-xl active:bg-[#dfece0]"><Minus className="size-5" /></button>
    <span aria-live="polite" className="min-w-8 text-center text-lg font-bold">{qty}</span>
    <button onClick={() => onQty(qty + 1)} aria-label={`Add one ${name}`} className="flex h-11 w-11 items-center justify-center rounded-xl active:bg-[#dfece0]"><Plus className="size-5" /></button>
  </div>
}

function CartSheet({ lines, total, tables, initialTable, onQty, onClose, onPlaced }: { lines: { item: PublicMenuItem; qty: number }[]; total: number; tables: PublicTable[]; initialTable: number | null; onQty: (id: string, qty: number) => void; onClose: () => void; onPlaced: (order: SavedOrder) => void }) {
  const contact = useMemo(() => load<{ phone: string; name: string }>('bm_contact'), [])
  const [type, setType] = useState<OrderType>('Dine in')
  const [table, setTable] = useState<number | null>(initialTable)
  const [changingTable, setChangingTable] = useState(!initialTable)
  const [phone, setPhone] = useState(contact?.phone ?? '')
  const [name, setName] = useState(contact?.name ?? '')
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (type === 'Dine in' && !table) return setError('Please choose your table number')
    if (type === 'Takeaway' && phone.replace(/\D/g, '').length < 11) return setError('Please enter your mobile number')
    setSending(true)
    try {
      const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, tableNumber: table, phone, customerName: name, note, items: lines.map(l => ({ id: l.item.id, qty: l.qty })) }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not place your order. Please try again.')
      if (type === 'Takeaway') save('bm_contact', { phone, name })
      onPlaced({ id: data.order.id, token: data.order.trackingToken, code: data.order.code })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place your order. Please try again.')
      setSending(false)
    }
  }

  if (lines.length === 0) return <div className="flex flex-col items-center px-6 pb-10 pt-8 text-center"><ShoppingBag className="size-12 text-[#c7d1c7]" /><p className="mt-4 text-lg font-semibold">Your order is empty</p><button onClick={onClose} className="mt-6 h-12 rounded-xl bg-[#eef4ed] px-6 text-base font-bold text-[#174d3c]">Browse menu</button></div>

  return <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
    <div className="flex items-center justify-between px-5 pb-2 pt-3"><h2 className="font-serif text-2xl font-bold">Your order</h2><button type="button" aria-label="Close" onClick={onClose} className="flex size-11 items-center justify-center rounded-full hover:bg-[#f2f4f0]"><X className="size-6" /></button></div>

    <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
      <ul className="divide-y divide-[#eef0ec]">{lines.map(({ item, qty }) => <li key={item.id} className="flex items-center gap-3 py-3.5">
        <div className="min-w-0 flex-1"><p className="text-base font-semibold leading-snug">{item.name}</p><p className="mt-0.5 text-sm text-[#89938b]">{taka(item.price)} each</p></div>
        <Stepper qty={qty} name={item.name} onQty={q => onQty(item.id, q)} />
        <span className="w-20 text-right text-lg font-bold">{taka(item.price * qty)}</span>
      </li>)}</ul>
      <button type="button" onClick={onClose} className="mt-1 flex h-11 items-center gap-1.5 text-sm font-semibold text-[#174d3c]"><Plus className="size-4" /> Add more items</button>

      <fieldset className="mt-4"><legend className="mb-2 text-sm font-semibold text-[#5f6b62]">How will you eat?</legend><div className="grid grid-cols-2 gap-2">{([['Dine in', Utensils, 'At a table'], ['Takeaway', Bike, 'Pick up']] as const).map(([value, Icon, hint]) => <button key={value} type="button" aria-pressed={type === value} onClick={() => { setType(value); setError('') }} className={`flex h-16 items-center gap-3 rounded-2xl border-2 px-4 text-left transition ${type === value ? 'border-[#174d3c] bg-[#eef4ed]' : 'border-[#e6e9e4] bg-white'}`}><Icon className={`size-6 ${type === value ? 'text-[#174d3c]' : 'text-[#9aa39c]'}`} /><span><span className="block text-base font-bold">{value}</span><span className="block text-xs text-[#89938b]">{hint}</span></span></button>)}</div></fieldset>

      {type === 'Dine in' && <div className="mt-4">{table && !changingTable
        ? <div className="flex items-center justify-between rounded-2xl bg-[#f7f0e5] px-4 py-3"><span className="text-base font-semibold text-[#805b35]">Table {table}</span><button type="button" onClick={() => setChangingTable(true)} className="h-10 px-2 text-sm font-semibold text-[#b86f3c]">Change</button></div>
        : <><p className="mb-2 text-sm font-semibold text-[#5f6b62]">Your table number</p>{tables.length > 0
          ? <div className="grid grid-cols-5 gap-2">{tables.map(t => <button key={t.number} type="button" aria-pressed={table === t.number} aria-label={`Table ${t.number}${t.name ? `, ${t.name}` : ''}`} onClick={() => { setTable(t.number); setChangingTable(false); setError('') }} className={`h-12 rounded-xl text-lg font-bold transition ${table === t.number ? 'bg-[#174d3c] text-white' : 'bg-[#f1f4f0] text-[#202521]'}`}>{t.number}</button>)}</div>
          : <input type="number" inputMode="numeric" min={1} placeholder="e.g. 5" aria-label="Table number" value={table ?? ''} onChange={e => setTable(e.target.value ? Number(e.target.value) : null)} className="h-14 w-full rounded-2xl border border-[#e2e7e1] bg-[#fbfcfb] px-4 text-lg outline-none focus:border-[#8eaf9b]" />}</>}
      </div>}

      {type === 'Takeaway' && <div className="mt-4 grid gap-3">
        <label className="block"><span className="mb-2 block text-sm font-semibold text-[#5f6b62]">Mobile number</span><input type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} className="h-14 w-full rounded-2xl border border-[#e2e7e1] bg-[#fbfcfb] px-4 text-lg tracking-wide outline-none focus:border-[#8eaf9b]" /></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold text-[#5f6b62]">Name <span className="font-normal text-[#a0aaa2]">(optional)</span></span><input autoComplete="name" value={name} onChange={e => setName(e.target.value)} className="h-12 w-full rounded-2xl border border-[#e2e7e1] bg-[#fbfcfb] px-4 text-base outline-none focus:border-[#8eaf9b]" /></label>
      </div>}

      {showNote
        ? <label className="mt-4 block"><span className="mb-2 block text-sm font-semibold text-[#5f6b62]">Note for the kitchen</span><textarea autoFocus maxLength={200} rows={2} placeholder="e.g. less sugar, extra spicy" value={note} onChange={e => setNote(e.target.value)} className="w-full rounded-2xl border border-[#e2e7e1] bg-[#fbfcfb] px-4 py-3 text-base outline-none focus:border-[#8eaf9b]" /></label>
        : <button type="button" onClick={() => setShowNote(true)} className="mt-3 flex h-11 items-center gap-1.5 text-sm font-semibold text-[#5f6b62]"><Plus className="size-4" /> Add a note (less sugar, extra spicy…)</button>}
    </div>

    <div className="border-t border-[#eef0ec] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
      {error && <p role="alert" className="mb-3 rounded-xl bg-[#fdf0ec] px-4 py-3 text-sm font-medium text-[#b4472c]">{error}</p>}
      <div className="mb-3 flex items-baseline justify-between"><span className="text-base text-[#5f6b62]">Total</span><span className="text-3xl font-bold">{taka(total)}</span></div>
      <button disabled={sending} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#174d3c] text-lg font-bold text-white active:scale-[.99] disabled:opacity-70">{sending ? <Loader2 className="size-5 animate-spin" /> : null}{sending ? 'Placing order…' : 'Place order'}</button>
      <p className="mt-2.5 text-center text-xs text-[#89938b]">Pay at the counter · Cash, bKash or Nagad</p>
    </div>
  </form>
}

function statusLine(order: TrackedOrder) {
  switch (order.status) {
    case 'Pending': return 'Received, waiting for the kitchen'
    case 'Preparing': return 'Being prepared now'
    case 'Ready': return order.type === 'Takeaway' ? 'Ready! Pick it up at the counter' : 'Ready! Coming to your table'
    case 'Served': return 'Served. Enjoy your meal!'
    case 'Completed': return 'Completed. Thank you!'
    case 'Cancelled': return 'Cancelled. Please ask a staff member.'
    default: return order.status
  }
}

function TrackSheet({ order, code, onClose }: { order: TrackedOrder | null; code: string; onClose: () => void }) {
  const steps = order?.type === 'Takeaway' ? ['Pending', 'Preparing', 'Ready'] : ['Pending', 'Preparing', 'Ready', 'Served']
  const labels: Record<string, string> = { Pending: 'Received', Preparing: 'Preparing', Ready: 'Ready', Served: 'Served' }
  const reached = order ? (order.status === 'Completed' ? steps.length - 1 : steps.indexOf(order.status)) : 0

  return <div className="flex min-h-0 flex-1 flex-col">
    <div className="flex justify-end px-3 pt-2"><button aria-label="Close" onClick={onClose} className="flex size-11 items-center justify-center rounded-full hover:bg-[#f2f4f0]"><X className="size-6" /></button></div>
    <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 text-center">
      <div className={`mx-auto flex size-16 items-center justify-center rounded-full ${order?.status === 'Cancelled' ? 'bg-[#fdf0ec] text-[#b4472c]' : 'bg-[#eef4ed] text-[#174d3c]'}`}>{order?.status === 'Cancelled' ? <X className="size-8" /> : <Check className="size-8" />}</div>
      <p className="mt-3 text-sm font-semibold uppercase tracking-[.14em] text-[#89938b]">Your order number</p>
      <p className="mt-1 font-serif text-5xl font-bold tracking-tight">{order?.code ?? code}</p>
      <p className="mt-2 text-base text-[#5f6b62]">{order ? (order.type === 'Dine in' ? `Table ${order.tableNumber}` : 'Takeaway') : ''}</p>
      <p className="mt-4 text-lg font-semibold text-[#174d3c]">{order ? statusLine(order) : <Loader2 className="mx-auto size-5 animate-spin" />}</p>

      {order && order.status !== 'Cancelled' && <ol className="mt-5 flex items-start justify-between gap-1">{steps.map((step, i) => <li key={step} className="flex flex-1 flex-col items-center gap-1.5"><span className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${i <= reached ? 'bg-[#174d3c] text-white' : 'bg-[#eef0ec] text-[#a0aaa2]'}`}>{i < reached || order.status === 'Completed' ? <Check className="size-4" /> : i + 1}</span><span className={`text-xs font-semibold ${i <= reached ? 'text-[#174d3c]' : 'text-[#a0aaa2]'}`}>{labels[step]}</span></li>)}</ol>}

      {order && <div className="mt-6 rounded-2xl bg-[#f7f8f6] p-4 text-left"><ul className="space-y-2">{order.items.map(i => <li key={i.name} className="flex justify-between gap-3 text-base"><span><span className="font-bold">{i.qty}×</span> {i.name}</span><span className="font-semibold">{taka(i.price * i.qty)}</span></li>)}</ul><div className="mt-3 flex items-baseline justify-between border-t border-[#e6e9e4] pt-3"><span className="text-[#5f6b62]">Total</span><span className="text-2xl font-bold">{taka(order.total)}</span></div></div>}
      <p className="mt-3 text-xs text-[#89938b]">This page updates by itself. Pay at the counter.</p>
    </div>
    <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2"><button onClick={onClose} className="h-14 w-full rounded-2xl bg-[#eef4ed] text-lg font-bold text-[#174d3c]">Order something more</button></div>
  </div>
}
