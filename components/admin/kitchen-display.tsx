'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bike, ChefHat, Clock, Loader2, Maximize2, MessageSquareText, Minimize2, RefreshCw, Undo2, UserRound, Utensils } from 'lucide-react'
import { useT } from '@/components/i18n-provider'
import type { MessageKey, TFunction } from '@/lib/i18n'

type Status = 'Pending' | 'Preparing' | 'Ready'
type KitchenOrder = { _id: string; code: string; type: 'Dine in' | 'Takeaway'; tableNumber?: number; customerName: string; note: string; items: { name: string; qty: number }[]; status: Status; source?: 'Customer' | 'Staff'; takenBy?: string; createdAt: string }

const POLL_MS = 5000
// Minutes waiting before a ticket turns amber, then red.
const LATE_AFTER = 10
const VERY_LATE_AFTER = 20

const COLUMNS: { status: Status; title: MessageKey; empty: MessageKey; dot: string; action?: { to: Status; label: MessageKey } }[] = [
  { status: 'Pending', title: 'kitchen.newTitle', empty: 'kitchen.newEmpty', dot: 'bg-amber-500', action: { to: 'Preparing', label: 'kitchen.startCooking' } },
  { status: 'Preparing', title: 'kitchen.cookingTitle', empty: 'kitchen.cookingEmpty', dot: 'bg-orange-500', action: { to: 'Ready', label: 'kitchen.ready' } },
  { status: 'Ready', title: 'kitchen.readyTitle', empty: 'kitchen.readyEmpty', dot: 'bg-teal-500' },
]

const minutesSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))

async function api<T>(t: TFunction, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) window.location.href = '/admin/login'
  if (!res.ok) throw new Error(data.error ?? t('common.somethingWentWrong'))
  return data as T
}

/** Cook-facing board: what to make, for whom, and how long it has waited. No prices. */
export function KitchenDisplay() {
  const t = useT()
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [, setTick] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const { orders } = await api<{ orders: KitchenOrder[] }>(t, '/api/orders?status=Pending,Preparing,Ready&day=today')
      setOrders(orders.sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('kitchen.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
    const timer = setInterval(() => { load(true); setTick(n => n + 1) }, POLL_MS)
    return () => clearInterval(timer)
  }, [load])

  // Keep a kitchen tablet's screen from sleeping while the board is open.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    const request = () => {
      const wakeLock = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock
      if (document.visibilityState === 'visible') wakeLock?.request('screen').then(l => { lock = l }).catch(() => {})
    }
    request()
    document.addEventListener('visibilitychange', request)
    return () => { document.removeEventListener('visibilitychange', request); lock?.release().catch(() => {}) }
  }, [])

  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === rootRef.current)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else rootRef.current?.requestFullscreen().catch(() => {})
  }

  const move = async (order: KitchenOrder, status: Status) => {
    setBusyId(order._id)
    setError('')
    try {
      await api(t, `/api/orders/${order._id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      setOrders(current => current.map(o => o._id === order._id ? { ...o, status } : o))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('kitchen.updateFailed'))
    } finally {
      setBusyId(null)
    }
  }

  return <div ref={rootRef} className={fullscreen ? 'h-screen overflow-y-auto bg-[#f7f8f6] p-5 sm:p-6' : ''}>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.17em] text-[#bc7843]">{t('kitchen.eyebrow')} <span className="flex items-center gap-1 rounded-full bg-[#eaf2eb] px-2 py-0.5 text-[10px] tracking-normal text-[#174d3c]"><span className="size-1.5 animate-pulse rounded-full bg-[#2f8a5b]" />{t('kitchen.live')}</span></p><h2 className="font-serif text-3xl font-bold tracking-tight">{t('kitchen.title')}</h2></div>
      <div className="flex items-center gap-2">
        <button onClick={() => load()} aria-label={t('common.refresh')} className="flex size-10 items-center justify-center rounded-xl border border-[#e0e5df] bg-white text-[#68756b] hover:bg-[#f5f7f4]"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button>
        <button onClick={toggleFullscreen} className="flex h-10 items-center gap-2 rounded-xl bg-[#174d3c] px-4 text-xs font-semibold text-white hover:bg-[#123f31]">{fullscreen ? <><Minimize2 className="size-4" /> {t('kitchen.exitFullScreen')}</> : <><Maximize2 className="size-4" /> {t('kitchen.fullScreen')}</>}</button>
      </div>
    </div>

    {error && <p role="alert" className="mb-5 rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{error}</p>}

    {loading && orders.length === 0 ? <div className="mt-10 flex justify-center text-[#87928a]"><Loader2 className="size-6 animate-spin" /></div>
      : <div className="grid gap-5 lg:grid-cols-3">{COLUMNS.map(column => {
        const list = orders.filter(o => o.status === column.status)
        return <section key={column.status} className="min-w-0">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><span className={`size-2.5 rounded-full ${column.dot}`} />{t(column.title)}<span className="rounded-full bg-white px-2 py-0.5 text-xs text-[#68756b] ring-1 ring-inset ring-[#e3e8e1]">{list.length}</span></h3>
          {list.length === 0 ? <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#d9e0d8] bg-white/60 px-6 py-10 text-center"><ChefHat className="size-8 text-[#c7d1c7]" /><p className="mt-3 text-xs font-medium text-[#89938b]">{t(column.empty)}</p></div>
            : <div className="space-y-4">{list.map(order => <Ticket key={order._id} order={order} busy={busyId === order._id} action={column.action} onMove={status => move(order, status)} />)}</div>}
        </section>
      })}</div>}
  </div>
}

function Ticket({ order, busy, action, onMove }: { order: KitchenOrder; busy: boolean; action?: { to: Status; label: MessageKey }; onMove: (status: Status) => void }) {
  const t = useT()
  const waited = minutesSince(order.createdAt)
  const late = order.status !== 'Ready' && waited >= LATE_AFTER
  const veryLate = order.status !== 'Ready' && waited >= VERY_LATE_AFTER
  const border = veryLate ? 'border-red-400 ring-2 ring-red-200' : late ? 'border-amber-400 ring-2 ring-amber-100' : order.status === 'Pending' ? 'border-amber-300' : 'border-[#e3e8e1]'
  const clock = veryLate ? 'bg-red-600 text-white' : late ? 'bg-amber-400 text-[#4a3205]' : 'bg-[#f1f4f0] text-[#4d5a51]'

  return <article className={`rounded-2xl border bg-white p-4 shadow-sm ${border}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {order.type === 'Dine in'
          ? <p className="flex items-center gap-2 font-serif text-2xl font-bold leading-tight text-[#174d3c]"><Utensils className="size-5 shrink-0" /> {t('common.table', { number: order.tableNumber ?? '' })}</p>
          : <p className="flex items-center gap-2 font-serif text-2xl font-bold leading-tight text-[#a8622f]"><Bike className="size-5 shrink-0" /> {t('common.orderType.Takeaway')}</p>}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] font-medium text-[#8a968d]">{order.type === 'Takeaway' && order.customerName && <span className="text-sm font-bold text-[#a8622f]">{order.customerName}</span>}{order.code}{order.source === 'Staff' && <span className="flex items-center gap-1 text-[#4b5aa8]"><UserRound className="size-3" />{order.takenBy || t('kitchen.waiter')}</span>}</p>
      </div>
      <span className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-bold tabular-nums ${clock}`}><Clock className="size-3.5" />{waited < 60 ? t('kitchen.minutes', { minutes: waited }) : t('kitchen.hoursMinutes', { hours: Math.floor(waited / 60), minutes: waited % 60 })}</span>
    </div>

    <ul className="mt-4 space-y-2">{order.items.map(item => <li key={item.name} className="flex items-start gap-3 text-lg font-semibold leading-snug"><span className="flex min-w-10 shrink-0 justify-center rounded-lg bg-[#174d3c] px-2 py-0.5 text-base font-bold text-white tabular-nums">{item.qty}×</span><span className="min-w-0">{item.name}</span></li>)}</ul>

    {order.note && <p className="mt-4 flex gap-2 rounded-xl bg-[#fff4d6] px-3 py-2.5 text-sm font-semibold text-[#7a4e10]"><MessageSquareText className="mt-0.5 size-4 shrink-0" />{order.note}</p>}

    {action
      ? <button onClick={() => onMove(action.to)} disabled={busy} className={`mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-bold text-white disabled:opacity-70 ${action.to === 'Ready' ? 'bg-teal-700 hover:bg-teal-800' : 'bg-[#174d3c] hover:bg-[#123f31]'}`}>{busy && <Loader2 className="size-5 animate-spin" />}{t(action.label)}</button>
      : <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-teal-50 px-3 py-2.5"><p className="text-xs font-semibold text-teal-800">{t('kitchen.waitingForWaiter')}</p><button onClick={() => onMove('Preparing')} disabled={busy} className="flex min-h-9 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#5f6b62] hover:bg-white disabled:opacity-60"><Undo2 className="size-3.5" /> {t('kitchen.undo')}</button></div>}
  </article>
}
