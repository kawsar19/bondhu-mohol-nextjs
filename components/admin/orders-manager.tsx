'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bike, ClipboardList, Loader2, MessageSquareText, Phone, Printer, RefreshCw, UserRound, Utensils, X } from 'lucide-react'
import { PrintReceipt } from './receipt'

type Status = 'Pending' | 'Preparing' | 'Ready' | 'Served' | 'Completed' | 'Cancelled'
type Order = { _id: string; code: string; type: 'Dine in' | 'Takeaway'; tableNumber?: number; customerName: string; phone: string; note: string; items: { name: string; price: number; qty: number }[]; total: number; status: Status; paymentStatus: 'Unpaid' | 'Paid'; source?: 'Customer' | 'Staff'; takenBy?: string; createdAt: string }

const FILTERS = ['Active', 'Completed', 'Cancelled', 'All today'] as const
type Filter = (typeof FILTERS)[number]
const ACTIVE: Status[] = ['Pending', 'Preparing', 'Ready', 'Served']
const statusStyles: Record<Status, string> = { Pending: 'bg-amber-50 text-amber-700', Preparing: 'bg-orange-50 text-orange-700', Ready: 'bg-teal-50 text-teal-700', Served: 'bg-violet-50 text-violet-700', Completed: 'bg-emerald-50 text-emerald-700', Cancelled: 'bg-red-50 text-red-700' }
const taka = (n: number) => `৳ ${n.toLocaleString('en-IN')}`

function nextStep(order: Order): { status: Status; label: string } | null {
  switch (order.status) {
    case 'Pending': return { status: 'Preparing', label: 'Start preparing' }
    case 'Preparing': return { status: 'Ready', label: 'Mark ready' }
    case 'Ready': return order.type === 'Dine in' ? { status: 'Served', label: 'Mark served' } : { status: 'Completed', label: 'Handed over' }
    case 'Served': return { status: 'Completed', label: 'Complete' }
    default: return null
  }
}

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) window.location.href = '/admin/login'
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
  return data as T
}

export function OrdersManager() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('Active')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)
  const [, setTick] = useState(0)
  const [printing, setPrinting] = useState<Order | null>(null)
  const closePrint = useCallback(() => setPrinting(null), [])

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      setOrders((await api<{ orders: Order[] }>('/api/orders?day=today')).orders)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load orders')
    } finally {
      setLoading(false)
    }
  }, [])

  // New customer orders show up without a manual refresh.
  useEffect(() => {
    load()
    const timer = setInterval(() => { load(true); setTick(t => t + 1) }, 10000)
    return () => clearInterval(timer)
  }, [load])

  const visible = useMemo(() => orders.filter(o => filter === 'All today' || (filter === 'Active' ? ACTIVE.includes(o.status) : o.status === filter)).sort((a, b) => filter === 'Active' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)), [orders, filter])
  const counts = useMemo(() => ({ Active: orders.filter(o => ACTIVE.includes(o.status)).length, Completed: orders.filter(o => o.status === 'Completed').length, Cancelled: orders.filter(o => o.status === 'Cancelled').length, 'All today': orders.length }), [orders])
  const sales = useMemo(() => orders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + o.total, 0), [orders])

  const update = async (order: Order, changes: Partial<Pick<Order, 'status' | 'paymentStatus'>>) => {
    setBusyId(order._id)
    setError('')
    try {
      const { order: updated } = await api<{ order: Order }>(`/api/orders/${order._id}`, { method: 'PATCH', body: JSON.stringify(changes) })
      setOrders(current => current.map(o => o._id === updated._id ? updated : o))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update order')
    } finally {
      setBusyId(null)
      setConfirmCancel(null)
    }
  }

  return <div>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.17em] text-[#bc7843]">Orders <span className="flex items-center gap-1 rounded-full bg-[#eaf2eb] px-2 py-0.5 text-[10px] tracking-normal text-[#174d3c]"><span className="size-1.5 animate-pulse rounded-full bg-[#2f8a5b]" />Live</span></p><h2 className="font-serif text-3xl font-bold tracking-tight">Today&apos;s orders</h2></div><div className="flex items-center gap-3"><div className="text-right"><p className="text-[11px] font-medium text-[#87928a]">Sales today</p><p className="font-serif text-xl font-bold">{taka(sales)}</p></div><button onClick={() => load()} aria-label="Refresh orders" className="flex size-10 items-center justify-center rounded-xl border border-[#e0e5df] bg-white text-[#68756b] hover:bg-[#f5f7f4]"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button></div></div>

    <div className="flex gap-2 overflow-x-auto pb-1">{FILTERS.map(f => <button key={f} onClick={() => setFilter(f)} className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition ${filter === f ? 'bg-[#174d3c] text-white' : 'bg-white text-[#728077] ring-1 ring-inset ring-[#e3e8e1] hover:bg-[#f5f7f4]'}`}>{f}<span className={`rounded-full px-1.5 text-[10px] ${filter === f ? 'bg-white/20' : 'bg-[#f1f4f0]'}`}>{counts[f]}</span></button>)}</div>

    {error && <p role="alert" className="mt-5 rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{error}</p>}

    {loading && orders.length === 0 ? <div className="mt-10 flex justify-center text-[#87928a]"><Loader2 className="size-6 animate-spin" /></div>
      : visible.length === 0 ? <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-[#d9e0d8] bg-white px-6 py-14 text-center"><ClipboardList className="size-10 text-[#c7d1c7]" /><p className="mt-4 font-semibold">{filter === 'Active' ? 'No active orders' : 'Nothing here yet'}</p><p className="mt-1 text-xs text-[#89938b]">New orders from guests appear here automatically.</p></div>
      : <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{visible.map(order => { const next = nextStep(order); const busy = busyId === order._id; return <article key={order._id} className={`flex flex-col rounded-2xl border bg-white p-5 ${order.status === 'Pending' ? 'border-amber-300 ring-1 ring-amber-200' : 'border-[#e3e8e1]'}`}>
        <div className="flex items-start justify-between gap-3"><div><p className="font-serif text-xl font-bold">{order.code}</p><p className="mt-0.5 text-[11px] text-[#8a968d]">{timeAgo(order.createdAt)}</p></div><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[order.status]}`}><span className="size-1.5 rounded-full bg-current" />{order.status}</span></div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">{order.type === 'Dine in' ? <span className="flex items-center gap-1.5 rounded-lg bg-[#eaf2eb] px-2.5 py-1.5 text-[#174d3c]"><Utensils className="size-3.5" /> Table {order.tableNumber}</span> : <span className="flex items-center gap-1.5 rounded-lg bg-[#fff0df] px-2.5 py-1.5 text-[#a8622f]"><Bike className="size-3.5" /> Takeaway</span>}{order.source === 'Staff' && <span className="flex items-center gap-1.5 rounded-lg bg-[#eef0fb] px-2.5 py-1.5 text-[#4b5aa8]"><UserRound className="size-3.5" /> Waiter{order.takenBy ? `: ${order.takenBy}` : ''}</span>}{order.phone && <a href={`tel:${order.phone}`} className="flex items-center gap-1.5 rounded-lg bg-[#f1f4f0] px-2.5 py-1.5 text-[#5f6b62]"><Phone className="size-3.5" /> {order.customerName ? `${order.customerName} · ` : ''}{order.phone}</a>}</div>
        <ul className="mt-4 space-y-1.5 text-sm">{order.items.map(i => <li key={i.name} className="flex justify-between gap-3"><span><span className="font-bold">{i.qty}×</span> {i.name}</span><span className="text-[#68756b]">{taka(i.price * i.qty)}</span></li>)}</ul>
        {order.note && <p className="mt-3 flex gap-2 rounded-lg bg-[#fbf5ec] px-3 py-2 text-xs text-[#835a2c]"><MessageSquareText className="mt-0.5 size-3.5 shrink-0" />{order.note}</p>}
        <div className="mt-4 flex items-center justify-between border-t border-[#eef0ec] pt-3"><span className="text-lg font-bold">{taka(order.total)}</span><div className="flex items-center gap-1.5"><button onClick={() => setPrinting(order)} disabled={order.status === 'Cancelled'} className="flex items-center gap-1 rounded-full bg-[#f1f4f0] px-3 py-1 text-[11px] font-bold text-[#5f6b62] hover:bg-[#e7eee7] disabled:opacity-40"><Printer className="size-3" /> Print bill</button><button onClick={() => update(order, { paymentStatus: order.paymentStatus === 'Paid' ? 'Unpaid' : 'Paid' })} disabled={busy || order.status === 'Cancelled'} className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${order.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f1f4f0] text-[#68756b] hover:bg-[#e7eee7]'}`}>{order.paymentStatus === 'Paid' ? '✓ Paid' : 'Mark paid'}</button></div></div>
        {(next || ACTIVE.includes(order.status)) && <div className="mt-4 flex gap-2">{next && <button onClick={() => update(order, { status: next.status })} disabled={busy} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#174d3c] text-sm font-semibold text-white hover:bg-[#123f31] disabled:opacity-70">{busy && <Loader2 className="size-4 animate-spin" />}{next.label}</button>}{ACTIVE.includes(order.status) && <button onClick={() => setConfirmCancel(order._id)} disabled={busy} aria-label={`Cancel ${order.code}`} className="flex size-11 items-center justify-center rounded-xl border border-[#e2e7e1] text-[#b4472c] hover:bg-[#fdf0ec]"><X className="size-4" /></button>}</div>}
        {confirmCancel === order._id && <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-[#fdf0ec] px-3 py-2.5"><p className="text-xs font-medium text-[#b4472c]">Cancel this order?</p><div className="flex gap-1.5"><button onClick={() => setConfirmCancel(null)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#68756b] hover:bg-white">Keep</button><button onClick={() => update(order, { status: 'Cancelled' })} className="rounded-lg bg-[#b4472c] px-2.5 py-1.5 text-xs font-semibold text-white">Cancel order</button></div></div>}
      </article> })}</div>}
    {printing && <PrintReceipt order={printing} onDone={closePrint} />}
  </div>
}
