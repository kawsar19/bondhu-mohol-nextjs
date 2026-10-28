'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bike, CircleCheck, ClipboardList, Loader2, MessageSquareText, Pencil, Phone, Printer, ReceiptText, RefreshCw, UserRound, Utensils, Wallet, X } from 'lucide-react'
import { useIntlLocale, useLocale, useT } from '@/components/i18n-provider'
import type { MessageKey, TFunction } from '@/lib/i18n'
import { OrderEditor } from './order-editor'
import { methodLabel, PaymentButtons, type PaymentMethod } from './payment'
import { PrintReceipt, type ReceiptOrder } from './receipt'
import { TableBill } from './table-bill'

type Status = 'Pending' | 'Preparing' | 'Ready' | 'Served' | 'Completed' | 'Cancelled'
type Order = { _id: string; code: string; type: 'Dine in' | 'Takeaway'; tableNumber?: number; customerName: string; phone: string; note: string; items: { menuItem: string; name: string; price: number; qty: number }[]; total: number; status: Status; paymentStatus: 'Unpaid' | 'Paid'; paymentMethod?: string; source?: 'Customer' | 'Staff'; takenBy?: string; createdAt: string }

const FILTERS = ['Active', 'Completed', 'Cancelled', 'All today'] as const
type Filter = (typeof FILTERS)[number]
const ACTIVE: Status[] = ['Pending', 'Preparing', 'Ready', 'Served']
const statusStyles: Record<Status, string> = { Pending: 'bg-amber-50 text-amber-700', Preparing: 'bg-orange-50 text-orange-700', Ready: 'bg-teal-50 text-teal-700', Served: 'bg-violet-50 text-violet-700', Completed: 'bg-emerald-50 text-emerald-700', Cancelled: 'bg-red-50 text-red-700' }
const taka = (n: number) => `৳ ${n.toLocaleString('en-IN')}`
const FILTER_KEY = { Active: 'orders.filters.Active', Completed: 'orders.filters.Completed', Cancelled: 'orders.filters.Cancelled', 'All today': 'orders.filters.All today' } as const
const STATUS_KEY = { Pending: 'common.orderStatus.Pending', Preparing: 'common.orderStatus.Preparing', Ready: 'common.orderStatus.Ready', Served: 'common.orderStatus.Served', Completed: 'common.orderStatus.Completed', Cancelled: 'common.orderStatus.Cancelled' } as const

function nextStep(order: Order): { status: Status; label: MessageKey } | null {
  switch (order.status) {
    case 'Pending': return { status: 'Preparing', label: 'orders.startPreparing' }
    case 'Preparing': return { status: 'Ready', label: 'orders.markReady' }
    case 'Ready': return order.type === 'Dine in' ? { status: 'Served', label: 'orders.markServed' } : { status: 'Completed', label: 'orders.handedOver' }
    case 'Served': return { status: 'Completed', label: 'orders.complete' }
    default: return null
  }
}

function timeAgo(iso: string, t: TFunction, timeLocale: string | string[]) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return t('orders.justNow')
  if (minutes < 60) return t('orders.minAgo', { minutes })
  return new Date(iso).toLocaleTimeString(timeLocale, { hour: 'numeric', minute: '2-digit' })
}

async function api<T>(t: TFunction, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) window.location.href = '/admin/login'
  if (!res.ok) throw new Error(data.error ?? t('common.somethingWentWrong'))
  return data as T
}

export function OrdersManager() {
  const t = useT()
  const intl = useIntlLocale()
  // English keeps the browser's own time format, as before.
  const timeLocale = useLocale() === 'en' ? [] : intl
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('Active')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)
  const [, setTick] = useState(0)
  const [printing, setPrinting] = useState<ReceiptOrder | null>(null)
  const [paying, setPaying] = useState<string | null>(null)
  const [editing, setEditing] = useState<Order | null>(null)
  const [billTable, setBillTable] = useState<number | null>(null)
  const closePrint = useCallback(() => setPrinting(null), [])

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      setOrders((await api<{ orders: Order[] }>(t, '/api/orders?day=today')).orders)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('orders.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  // New customer orders show up without a manual refresh.
  useEffect(() => {
    load()
    const timer = setInterval(() => { load(true); setTick(n => n + 1) }, 10000)
    return () => clearInterval(timer)
  }, [load])

  const visible = useMemo(() => orders.filter(o => filter === 'All today' || (filter === 'Active' ? ACTIVE.includes(o.status) : o.status === filter)).sort((a, b) => filter === 'Active' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)), [orders, filter])
  const counts = useMemo(() => ({ Active: orders.filter(o => ACTIVE.includes(o.status)).length, Completed: orders.filter(o => o.status === 'Completed').length, Cancelled: orders.filter(o => o.status === 'Cancelled').length, 'All today': orders.length }), [orders])
  const sales = useMemo(() => orders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + o.total, 0), [orders])
  // Dine-in tables that still owe money, so the cashier can bill each table in one go.
  const openTables = useMemo(() => {
    const byTable = new Map<number, Order[]>()
    for (const o of orders) if (o.type === 'Dine in' && o.tableNumber && o.status !== 'Cancelled' && o.paymentStatus === 'Unpaid') byTable.set(o.tableNumber, [...(byTable.get(o.tableNumber) ?? []), o])
    return [...byTable.entries()].sort((a, b) => a[0] - b[0]).map(([table, list]) => ({ table, orders: list.sort((a, b) => a.createdAt.localeCompare(b.createdAt)), total: list.reduce((sum, o) => sum + o.total, 0) }))
  }, [orders])
  const replaceOrders = (updated: Order[]) => setOrders(current => current.map(o => updated.find(u => u._id === o._id) ?? o))

  const update = async (order: Order, changes: { status?: Status; paymentStatus?: 'Paid' | 'Unpaid'; paymentMethod?: PaymentMethod }) => {
    setBusyId(order._id)
    setError('')
    try {
      const { order: updated } = await api<{ order: Order }>(t, `/api/orders/${order._id}`, { method: 'PATCH', body: JSON.stringify(changes) })
      setOrders(current => current.map(o => o._id === updated._id ? updated : o))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('orders.updateFailed'))
    } finally {
      setBusyId(null)
      setConfirmCancel(null)
      setPaying(null)
    }
  }

  return <div>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.17em] text-[#bc7843]">{t('orders.eyebrow')} <span className="flex items-center gap-1 rounded-full bg-[#eaf2eb] px-2 py-0.5 text-[10px] tracking-normal text-[#174d3c]"><span className="size-1.5 animate-pulse rounded-full bg-[#2f8a5b]" />{t('orders.live')}</span></p><h2 className="font-serif text-3xl font-bold tracking-tight">{t('orders.title')}</h2></div><div className="flex items-center gap-3"><div className="text-right"><p className="text-[11px] font-medium text-[#87928a]">{t('orders.salesToday')}</p><p className="font-serif text-xl font-bold">{taka(sales)}</p></div><button onClick={() => load()} aria-label={t('orders.refreshOrders')} className="flex size-10 items-center justify-center rounded-xl border border-[#e0e5df] bg-white text-[#68756b] hover:bg-[#f5f7f4]"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button></div></div>

    {openTables.length > 0 && <section className="mb-5 rounded-2xl border border-[#e3e8e1] bg-white p-4"><p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-[#5f6b62]"><ReceiptText className="size-3.5" /> {t('orders.tablesToBill')}</p><div className="flex flex-wrap gap-2">{openTables.map(tb => <button key={tb.table} onClick={() => setBillTable(tb.table)} className="flex items-center gap-2.5 rounded-xl border border-[#d9e5da] bg-[#f4f8f3] px-3.5 py-2 text-left hover:border-[#8eaf9b]"><span className="font-serif text-lg font-bold text-[#174d3c]">{tb.table}</span><span className="text-[11px] leading-tight text-[#68756b]"><span className="block font-bold text-[#202521]">{taka(tb.total)}</span>{t(tb.orders.length === 1 ? 'orders.countOne' : 'orders.countMany', { count: tb.orders.length })}</span></button>)}</div></section>}

    <div className="flex gap-2 overflow-x-auto pb-1">{FILTERS.map(f => <button key={f} onClick={() => setFilter(f)} className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition ${filter === f ? 'bg-[#174d3c] text-white' : 'bg-white text-[#728077] ring-1 ring-inset ring-[#e3e8e1] hover:bg-[#f5f7f4]'}`}>{t(FILTER_KEY[f])}<span className={`rounded-full px-1.5 text-[10px] ${filter === f ? 'bg-white/20' : 'bg-[#f1f4f0]'}`}>{counts[f]}</span></button>)}</div>

    {error && <p role="alert" className="mt-5 rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{error}</p>}

    {loading && orders.length === 0 ? <div className="mt-10 flex justify-center text-[#87928a]"><Loader2 className="size-6 animate-spin" /></div>
      : visible.length === 0 ? <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-[#d9e0d8] bg-white px-6 py-14 text-center"><ClipboardList className="size-10 text-[#c7d1c7]" /><p className="mt-4 font-semibold">{filter === 'Active' ? t('orders.noActive') : t('orders.nothingYet')}</p><p className="mt-1 text-xs text-[#89938b]">{t('orders.emptyHint')}</p></div>
      : <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{visible.map(order => { const next = nextStep(order); const busy = busyId === order._id; return <article key={order._id} className={`flex flex-col rounded-2xl border bg-white p-5 ${order.status === 'Pending' ? 'border-amber-300 ring-1 ring-amber-200' : 'border-[#e3e8e1]'}`}>
        <div className="flex items-start justify-between gap-3"><div><p className="font-serif text-xl font-bold">{order.code}</p><p className="mt-0.5 text-[11px] text-[#8a968d]">{timeAgo(order.createdAt, t, timeLocale)}</p></div><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[order.status]}`}><span className="size-1.5 rounded-full bg-current" />{t(STATUS_KEY[order.status])}</span></div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">{order.type === 'Dine in' ? <span className="flex items-center gap-1.5 rounded-lg bg-[#eaf2eb] px-2.5 py-1.5 text-[#174d3c]"><Utensils className="size-3.5" /> {t('common.table', { number: order.tableNumber ?? '' })}</span> : <span className="flex items-center gap-1.5 rounded-lg bg-[#fff0df] px-2.5 py-1.5 text-[#a8622f]"><Bike className="size-3.5" /> {t('common.orderType.Takeaway')}</span>}{order.source === 'Staff' && <span className="flex items-center gap-1.5 rounded-lg bg-[#eef0fb] px-2.5 py-1.5 text-[#4b5aa8]"><UserRound className="size-3.5" /> {t('orders.waiter')}{order.takenBy ? `: ${order.takenBy}` : ''}</span>}{order.phone && <a href={`tel:${order.phone}`} className="flex items-center gap-1.5 rounded-lg bg-[#f1f4f0] px-2.5 py-1.5 text-[#5f6b62]"><Phone className="size-3.5" /> {order.customerName ? `${order.customerName} · ` : ''}{order.phone}</a>}</div>
        <ul className="mt-4 space-y-1.5 text-sm">{order.items.map(i => <li key={i.name} className="flex justify-between gap-3"><span><span className="font-bold">{i.qty}×</span> {i.name}</span><span className="text-[#68756b]">{taka(i.price * i.qty)}</span></li>)}</ul>
        {order.note && <p className="mt-3 flex gap-2 rounded-lg bg-[#fbf5ec] px-3 py-2 text-xs text-[#835a2c]"><MessageSquareText className="mt-0.5 size-3.5 shrink-0" />{order.note}</p>}
        <div className="mt-4 flex items-center justify-between border-t border-[#eef0ec] pt-3"><span className="text-lg font-bold">{taka(order.total)}</span><div className="flex items-center gap-1.5"><button onClick={() => setPrinting(order)} disabled={order.status === 'Cancelled'} className="flex items-center gap-1 rounded-full bg-[#f1f4f0] px-3 py-1.5 text-[11px] font-bold text-[#5f6b62] hover:bg-[#e7eee7] disabled:opacity-40"><Printer className="size-3" /> {t('orders.printBill')}</button></div></div>
        {order.status !== 'Cancelled' && (paying === order._id
          ? <div className="mt-3 rounded-xl border-2 border-[#e9d3b3] bg-[#fffaf2] p-3"><div className="mb-2.5 flex items-center justify-between"><p className="text-sm font-bold text-[#5f4a2c]">{order.paymentStatus === 'Paid' ? t('orders.changePayment') : t('orders.howPaid', { amount: taka(order.total) })}</p><button onClick={() => setPaying(null)} aria-label={t('common.close')} className="rounded-full p-1.5 text-[#9aa39c] hover:bg-white"><X className="size-4" /></button></div><PaymentButtons disabled={busy} onPick={method => update(order, { paymentStatus: 'Paid', paymentMethod: method })} />{order.paymentStatus === 'Paid' && <button onClick={() => update(order, { paymentStatus: 'Unpaid' })} disabled={busy} className="mt-2 w-full rounded-lg py-2 text-xs font-semibold text-[#b4472c] hover:bg-white">{t('orders.markUnpaid')}</button>}</div>
          : order.paymentStatus === 'Paid'
            ? <button onClick={() => setPaying(order._id)} disabled={busy} className="mt-3 flex h-11 w-full items-center justify-between rounded-xl bg-emerald-50 px-4 text-sm font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100"><span className="flex items-center gap-2"><CircleCheck className="size-5" /> {t('common.paymentStatus.Paid')}{order.paymentMethod ? ` · ${methodLabel(t, order.paymentMethod)}` : ''}</span><span className="text-xs font-semibold text-emerald-600/80">{t('orders.change')}</span></button>
            : <button onClick={() => setPaying(order._id)} disabled={busy} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#d9a25f] bg-[#fff6e8] text-[15px] font-bold text-[#8a5a24] transition hover:bg-[#ffefd6]"><Wallet className="size-5" /> {t('orders.takePayment', { amount: taka(order.total) })}</button>)}
        {(next || ACTIVE.includes(order.status)) && <div className="mt-4 flex gap-2">{next && <button onClick={() => update(order, { status: next.status })} disabled={busy} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#174d3c] text-sm font-semibold text-white hover:bg-[#123f31] disabled:opacity-70">{busy && <Loader2 className="size-4 animate-spin" />}{t(next.label)}</button>}{ACTIVE.includes(order.status) && order.paymentStatus === 'Unpaid' && <button onClick={() => setEditing(order)} disabled={busy} aria-label={t('orders.editItemsIn', { code: order.code })} title={t('orders.addRemoveItems')} className="flex size-11 items-center justify-center rounded-xl border border-[#e2e7e1] text-[#5f6b62] hover:bg-[#f5f7f4]"><Pencil className="size-4" /></button>}{ACTIVE.includes(order.status) && <button onClick={() => setConfirmCancel(order._id)} disabled={busy} aria-label={t('orders.cancelCode', { code: order.code })} className="flex size-11 items-center justify-center rounded-xl border border-[#e2e7e1] text-[#b4472c] hover:bg-[#fdf0ec]"><X className="size-4" /></button>}</div>}
        {confirmCancel === order._id && <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-[#fdf0ec] px-3 py-2.5"><p className="text-xs font-medium text-[#b4472c]">{t('orders.cancelConfirm')}</p><div className="flex gap-1.5"><button onClick={() => setConfirmCancel(null)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#68756b] hover:bg-white">{t('orders.keep')}</button><button onClick={() => update(order, { status: 'Cancelled' })} className="rounded-lg bg-[#b4472c] px-2.5 py-1.5 text-xs font-semibold text-white">{t('orders.cancelOrder')}</button></div></div>}
      </article> })}</div>}
    {printing && <PrintReceipt order={printing} onDone={closePrint} />}
    {editing && <OrderEditor order={editing} onClose={() => setEditing(null)} onSaved={updated => { replaceOrders([updated as Order]); setEditing(null) }} />}
    {billTable !== null && (() => { const tb = openTables.find(x => x.table === billTable); return tb ? <TableBill table={tb.table} orders={tb.orders} onClose={() => setBillTable(null)} onPrint={setPrinting} onSettled={updated => { replaceOrders(updated as Order[]); setBillTable(null) }} /> : null })()}
  </div>
}
