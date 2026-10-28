'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bike, CircleCheck, ClipboardList, Loader2, MessageSquareText, Pencil, Phone, Plus, Printer, ReceiptText, RefreshCw, RotateCcw, UserRound, Utensils, Wallet, X } from 'lucide-react'
import { useIntlLocale, useLocale, useT } from '@/components/i18n-provider'
import type { TFunction } from '@/lib/i18n'
import { OrderEditor } from './order-editor'
import { methodLabel, PaymentButtons, type PaymentMethod } from './payment'
import { PrintReceipt, type ReceiptOrder } from './receipt'
import { TableBill } from './table-bill'

type Status = 'Completed' | 'Cancelled'
type Order = { _id: string; code: string; type: 'Dine in' | 'Takeaway'; tableNumber?: number; customerName: string; phone: string; note: string; items: { menuItem: string; name: string; price: number; qty: number }[]; total: number; status: Status; paymentStatus: 'Unpaid' | 'Paid'; paymentMethod?: string; takenBy?: string; createdAt: string }

const FILTERS = ['Unpaid', 'Paid', 'Cancelled', 'All today'] as const
type Filter = (typeof FILTERS)[number]
const taka = (n: number) => `৳ ${n.toLocaleString('en-IN')}`
const FILTER_KEY = { Unpaid: 'orders.filters.Unpaid', Paid: 'orders.filters.Paid', Cancelled: 'orders.filters.Cancelled', 'All today': 'orders.filters.All today' } as const

function matches(order: Order, filter: Filter) {
  if (filter === 'All today') return true
  if (filter === 'Cancelled') return order.status === 'Cancelled'
  return order.status !== 'Cancelled' && order.paymentStatus === filter
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

export function OrdersManager({ onNewOrder }: { onNewOrder: () => void }) {
  const t = useT()
  const intl = useIntlLocale()
  // English keeps the browser's own time format, as before.
  const timeLocale = useLocale() === 'en' ? [] : intl
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('Unpaid')
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

  // Picks up orders entered on another device.
  useEffect(() => {
    load()
    const timer = setInterval(() => { load(true); setTick(n => n + 1) }, 30000)
    return () => clearInterval(timer)
  }, [load])

  const visible = useMemo(() => orders.filter(o => matches(o, filter)).sort((a, b) => filter === 'Unpaid' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)), [orders, filter])
  const counts = useMemo(() => Object.fromEntries(FILTERS.map(f => [f, orders.filter(o => matches(o, f)).length])) as Record<Filter, number>, [orders])
  const sales = useMemo(() => orders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + o.total, 0), [orders])
  // Dine-in tables that still owe money, so each table can be billed in one go.
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
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[.17em] text-[#bc7843]">{t('orders.eyebrow')}</p><h2 className="font-serif text-3xl font-bold tracking-tight">{t('orders.title')}</h2></div><div className="flex items-center gap-3"><div className="text-right"><p className="text-[11px] font-medium text-[#87928a]">{t('orders.salesToday')}</p><p className="font-serif text-xl font-bold">{taka(sales)}</p></div><button onClick={() => load()} aria-label={t('orders.refreshOrders')} className="flex size-10 items-center justify-center rounded-xl border border-[#e0e5df] bg-white text-[#68756b] hover:bg-[#f5f7f4]"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button><button onClick={onNewOrder} className="flex items-center gap-2 rounded-xl bg-[#174d3c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123f31]"><Plus className="size-4" /> {t('orders.newOrder')}</button></div></div>

    {openTables.length > 0 && <section className="mb-5 rounded-2xl border border-[#e3e8e1] bg-white p-4"><p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-[#5f6b62]"><ReceiptText className="size-3.5" /> {t('orders.tablesToBill')}</p><div className="flex flex-wrap gap-2">{openTables.map(tb => <button key={tb.table} onClick={() => setBillTable(tb.table)} className="flex items-center gap-2.5 rounded-xl border border-[#d9e5da] bg-[#f4f8f3] px-3.5 py-2 text-left hover:border-[#8eaf9b]"><span className="font-serif text-lg font-bold text-[#174d3c]">{tb.table}</span><span className="text-[11px] leading-tight text-[#68756b]"><span className="block font-bold text-[#202521]">{taka(tb.total)}</span>{t(tb.orders.length === 1 ? 'orders.countOne' : 'orders.countMany', { count: tb.orders.length })}</span></button>)}</div></section>}

    <div className="flex gap-2 overflow-x-auto pb-1">{FILTERS.map(f => <button key={f} onClick={() => setFilter(f)} className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition ${filter === f ? 'bg-[#174d3c] text-white' : 'bg-white text-[#728077] ring-1 ring-inset ring-[#e3e8e1] hover:bg-[#f5f7f4]'}`}>{t(FILTER_KEY[f])}<span className={`rounded-full px-1.5 text-[10px] ${filter === f ? 'bg-white/20' : 'bg-[#f1f4f0]'}`}>{counts[f]}</span></button>)}</div>

    {error && <p role="alert" className="mt-5 rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{error}</p>}

    {loading && orders.length === 0 ? <div className="mt-10 flex justify-center text-[#87928a]"><Loader2 className="size-6 animate-spin" /></div>
      : visible.length === 0 ? <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-[#d9e0d8] bg-white px-6 py-14 text-center"><ClipboardList className="size-10 text-[#c7d1c7]" /><p className="mt-4 font-semibold">{filter === 'Unpaid' ? t('orders.noUnpaid') : t('orders.nothingYet')}</p><p className="mt-1 text-xs text-[#89938b]">{t('orders.emptyHint')}</p></div>
      : <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{visible.map(order => { const busy = busyId === order._id; const cancelled = order.status === 'Cancelled'; return <article key={order._id} className={`flex flex-col rounded-2xl border border-[#e3e8e1] bg-white p-5 ${cancelled ? 'opacity-70' : ''}`}>
        <div className="flex items-start justify-between gap-3"><div><p className="font-serif text-xl font-bold">{order.code}</p><p className="mt-0.5 text-[11px] text-[#8a968d]">{timeAgo(order.createdAt, t, timeLocale)}</p></div>{cancelled && <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700"><span className="size-1.5 rounded-full bg-current" />{t('common.orderStatus.Cancelled')}</span>}</div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">{order.type === 'Dine in' ? <span className="flex items-center gap-1.5 rounded-lg bg-[#eaf2eb] px-2.5 py-1.5 text-[#174d3c]"><Utensils className="size-3.5" /> {order.tableNumber ? t('common.table', { number: order.tableNumber }) : t('common.orderType.Dine in')}</span> : <span className="flex items-center gap-1.5 rounded-lg bg-[#fff0df] px-2.5 py-1.5 text-[#a8622f]"><Bike className="size-3.5" /> {t('common.orderType.Takeaway')}</span>}{order.customerName && !order.phone && <span className="rounded-lg bg-[#f1f4f0] px-2.5 py-1.5 text-[#5f6b62]">{order.customerName}</span>}{order.takenBy && <span className="flex items-center gap-1.5 rounded-lg bg-[#eef0fb] px-2.5 py-1.5 text-[#4b5aa8]"><UserRound className="size-3.5" /> {t('orders.enteredBy', { name: order.takenBy })}</span>}{order.phone && <a href={`tel:${order.phone}`} className="flex items-center gap-1.5 rounded-lg bg-[#f1f4f0] px-2.5 py-1.5 text-[#5f6b62]"><Phone className="size-3.5" /> {order.customerName ? `${order.customerName} · ` : ''}{order.phone}</a>}</div>
        <ul className="mt-4 space-y-1.5 text-sm">{order.items.map(i => <li key={i.name} className="flex justify-between gap-3"><span><span className="font-bold">{i.qty}×</span> {i.name}</span><span className="text-[#68756b]">{taka(i.price * i.qty)}</span></li>)}</ul>
        {order.note && <p className="mt-3 flex gap-2 rounded-lg bg-[#fbf5ec] px-3 py-2 text-xs text-[#835a2c]"><MessageSquareText className="mt-0.5 size-3.5 shrink-0" />{order.note}</p>}
        <div className="mt-4 flex items-center justify-between border-t border-[#eef0ec] pt-3"><span className="text-lg font-bold">{taka(order.total)}</span><div className="flex items-center gap-1.5"><button onClick={() => setPrinting(order)} disabled={cancelled} className="flex items-center gap-1 rounded-full bg-[#f1f4f0] px-3 py-1.5 text-[11px] font-bold text-[#5f6b62] hover:bg-[#e7eee7] disabled:opacity-40"><Printer className="size-3" /> {t('orders.printBill')}</button></div></div>
        {!cancelled && (paying === order._id
          ? <div className="mt-3 rounded-xl border-2 border-[#e9d3b3] bg-[#fffaf2] p-3"><div className="mb-2.5 flex items-center justify-between"><p className="text-sm font-bold text-[#5f4a2c]">{order.paymentStatus === 'Paid' ? t('orders.changePayment') : t('orders.howPaid', { amount: taka(order.total) })}</p><button onClick={() => setPaying(null)} aria-label={t('common.close')} className="rounded-full p-1.5 text-[#9aa39c] hover:bg-white"><X className="size-4" /></button></div><PaymentButtons disabled={busy} onPick={method => update(order, { paymentStatus: 'Paid', paymentMethod: method })} />{order.paymentStatus === 'Paid' && <button onClick={() => update(order, { paymentStatus: 'Unpaid' })} disabled={busy} className="mt-2 w-full rounded-lg py-2 text-xs font-semibold text-[#b4472c] hover:bg-white">{t('orders.markUnpaid')}</button>}</div>
          : order.paymentStatus === 'Paid'
            ? <button onClick={() => setPaying(order._id)} disabled={busy} className="mt-3 flex h-11 w-full items-center justify-between rounded-xl bg-emerald-50 px-4 text-sm font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100"><span className="flex items-center gap-2"><CircleCheck className="size-5" /> {t('common.paymentStatus.Paid')}{order.paymentMethod ? ` · ${methodLabel(t, order.paymentMethod)}` : ''}</span><span className="text-xs font-semibold text-emerald-600/80">{t('orders.change')}</span></button>
            : <button onClick={() => setPaying(order._id)} disabled={busy} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#d9a25f] bg-[#fff6e8] text-[15px] font-bold text-[#8a5a24] transition hover:bg-[#ffefd6]"><Wallet className="size-5" /> {t('orders.takePayment', { amount: taka(order.total) })}</button>)}
        <div className="mt-3 flex justify-end gap-2">{cancelled
          ? <button onClick={() => update(order, { status: 'Completed' })} disabled={busy} className="flex h-9 items-center gap-1.5 rounded-xl border border-[#e2e7e1] px-3 text-xs font-semibold text-[#5f6b62] hover:bg-[#f5f7f4]">{busy ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}{t('orders.restore')}</button>
          : <>{order.paymentStatus === 'Unpaid' && <button onClick={() => setEditing(order)} disabled={busy} aria-label={t('orders.editItemsIn', { code: order.code })} title={t('orders.addRemoveItems')} className="flex size-9 items-center justify-center rounded-xl border border-[#e2e7e1] text-[#5f6b62] hover:bg-[#f5f7f4]"><Pencil className="size-4" /></button>}{order.paymentStatus === 'Unpaid' && <button onClick={() => setConfirmCancel(order._id)} disabled={busy} aria-label={t('orders.cancelCode', { code: order.code })} className="flex size-9 items-center justify-center rounded-xl border border-[#e2e7e1] text-[#b4472c] hover:bg-[#fdf0ec]"><X className="size-4" /></button>}</>}</div>
        {confirmCancel === order._id && <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-[#fdf0ec] px-3 py-2.5"><p className="text-xs font-medium text-[#b4472c]">{t('orders.cancelConfirm')}</p><div className="flex gap-1.5"><button onClick={() => setConfirmCancel(null)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#68756b] hover:bg-white">{t('orders.keep')}</button><button onClick={() => update(order, { status: 'Cancelled' })} className="rounded-lg bg-[#b4472c] px-2.5 py-1.5 text-xs font-semibold text-white">{t('orders.cancelOrder')}</button></div></div>}
      </article> })}</div>}
    {printing && <PrintReceipt order={printing} onDone={closePrint} />}
    {editing && <OrderEditor order={editing} onClose={() => setEditing(null)} onSaved={updated => { replaceOrders([updated as Order]); setEditing(null) }} />}
    {billTable !== null && (() => { const tb = openTables.find(x => x.table === billTable); return tb ? <TableBill table={tb.table} orders={tb.orders} onClose={() => setBillTable(null)} onPrint={setPrinting} onSettled={updated => { replaceOrders(updated as Order[]); setBillTable(null) }} /> : null })()}
  </div>
}
