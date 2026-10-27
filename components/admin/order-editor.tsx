'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Minus, Plus, Search, Trash2, X } from 'lucide-react'

type Line = { menuItem: string; name: string; price: number; qty: number }
type MenuItem = { _id: string; name: string; price: number; category: string; isAvailable: boolean }
export type EditableOrder = { _id: string; code: string; items: Line[] }

const taka = (n: number) => `৳ ${n.toLocaleString('en-IN')}`

/** Change quantities, remove lines, or add menu items to an open order. */
export function OrderEditor({ order, onClose, onSaved }: { order: EditableOrder; onClose: () => void; onSaved: (order: unknown) => void }) {
  const [lines, setLines] = useState<Line[]>(order.items)
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/menu', { cache: 'no-store' }).then(r => r.json()).then(d => setMenu((d.items ?? []).filter((m: MenuItem) => m.isAvailable))).catch(() => setError('Could not load the menu'))
  }, [])

  const setQty = (id: string, qty: number) => setLines(ls => qty <= 0 ? ls.filter(l => l.menuItem !== id) : ls.map(l => l.menuItem === id ? { ...l, qty: Math.min(50, qty) } : l))
  const add = (m: MenuItem) => setLines(ls => ls.some(l => l.menuItem === m._id) ? ls.map(l => l.menuItem === m._id ? { ...l, qty: Math.min(50, l.qty + 1) } : l) : [...ls, { menuItem: m._id, name: m.name, price: m.price, qty: 1 }])
  const total = lines.reduce((sum, l) => sum + l.price * l.qty, 0)
  const matches = useMemo(() => { const q = search.trim().toLowerCase(); return q ? menu.filter(m => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)).slice(0, 8) : [] }, [menu, search])

  const save = async () => {
    if (lines.length === 0) return setError('An order needs at least one item. To drop the whole order, cancel it instead.')
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/orders/${order._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: lines.map(l => ({ id: l.menuItem, qty: l.qty })) }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not save the order')
      onSaved(data.order)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the order')
      setSaving(false)
    }
  }

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#202521]/30 sm:items-center sm:p-4" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={`Edit ${order.code}`} onClick={e => e.stopPropagation()} className="flex max-h-[94dvh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
      <div className="flex items-center justify-between p-6 pb-3"><div><p className="text-xs uppercase tracking-[.16em] text-[#b86f3c]">Edit order</p><h3 className="mt-1 font-serif text-2xl font-bold">{order.code}</h3></div><button aria-label="Close" onClick={onClose} className="rounded-full p-2 hover:bg-[#f2f4f0]"><X className="size-5" /></button></div>
      <div className="flex-1 overflow-y-auto px-6">
        <ul className="divide-y divide-[#f0f2ef]">{lines.map(l => <li key={l.menuItem} className="flex items-center gap-3 py-2.5">
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{l.name}</p><p className="text-[11px] text-[#89938b]">{taka(l.price)} each</p></div>
          <div className="flex items-center gap-1"><button onClick={() => setQty(l.menuItem, l.qty - 1)} aria-label={`One less ${l.name}`} className="flex size-8 items-center justify-center rounded-lg border border-[#e2e7e1] text-[#5f6b62] hover:bg-[#f5f7f4]">{l.qty === 1 ? <Trash2 className="size-3.5 text-[#b4472c]" /> : <Minus className="size-3.5" />}</button><span className="w-7 text-center text-sm font-bold">{l.qty}</span><button onClick={() => setQty(l.menuItem, l.qty + 1)} aria-label={`One more ${l.name}`} className="flex size-8 items-center justify-center rounded-lg border border-[#e2e7e1] text-[#5f6b62] hover:bg-[#f5f7f4]"><Plus className="size-3.5" /></button></div>
          <span className="w-20 text-right text-sm font-semibold">{taka(l.price * l.qty)}</span>
        </li>)}</ul>
        {lines.length === 0 && <p className="py-4 text-center text-xs text-[#89938b]">No items. Add some below.</p>}
        <div className="mt-3"><label className="sr-only" htmlFor="oe-search">Add an item</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#a0aaa2]" /><input id="oe-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Add an item: type a name" className="h-11 w-full rounded-xl border border-[#e2e7e1] bg-[#fbfcfb] pl-9 pr-3 text-sm outline-none focus:border-[#8eaf9b]" /></div>
          {matches.length > 0 && <ul className="mt-1.5 overflow-hidden rounded-xl border border-[#e2e7e1]">{matches.map(m => <li key={m._id}><button onClick={() => { add(m); setSearch('') }} className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-[#f5f7f4]"><span>{m.name} <span className="text-[11px] text-[#9aa39c]">{m.category}</span></span><span className="flex items-center gap-2 text-xs font-semibold">{taka(m.price)}<Plus className="size-3.5 text-[#174d3c]" /></span></button></li>)}</ul>}
          {search.trim() && matches.length === 0 && <p className="mt-2 text-xs text-[#89938b]">No available item matches.</p>}
        </div>
      </div>
      <div className="border-t border-[#eef1ed] p-6 pt-4">
        {error && <p role="alert" className="mb-3 rounded-lg bg-[#fdf0ec] px-3 py-2 text-xs font-medium text-[#b4472c]">{error}</p>}
        <div className="mb-3 flex justify-between text-sm"><span className="text-[#68756b]">New total</span><span className="font-serif text-xl font-bold">{taka(total)}</span></div>
        <div className="flex gap-2"><button onClick={onClose} className="h-11 flex-1 rounded-xl border border-[#e2e7e1] text-sm font-semibold text-[#68756b] hover:bg-[#f5f7f4]">Cancel</button><button onClick={save} disabled={saving} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#174d3c] text-sm font-semibold text-white hover:bg-[#123f31] disabled:opacity-70">{saving && <Loader2 className="size-4 animate-spin" />}Save changes</button></div>
      </div>
    </div>
  </div>
}
