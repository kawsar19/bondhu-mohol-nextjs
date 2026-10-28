'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowUpRight, Bike, CircleDollarSign, ClipboardList, Clock3, Coffee, Grid2X2, Loader2, Plus, RefreshCw, UserRound, Utensils, Wallet } from 'lucide-react'
import { useIntlLocale, useT } from '@/components/i18n-provider'
import type { TFunction } from '@/lib/i18n'

type Totals = { orders: number; sales: number; unpaid: number }
type RecentOrder = { id: string; code: string; type: 'Dine in' | 'Takeaway'; tableNumber: number | null; customerName: string; items: string; total: number; status: string; source: string; takenBy: string; createdAt: string }
type Popular = { id: string; name: string; image: string; qty: number; revenue: number }
type Stats = { today: Totals; yesterday: Totals; open: Record<string, number>; tables: Record<string, number>; recent: RecentOrder[]; popular: Popular[]; updatedAt: string }

const taka = (n: number) => `৳ ${n.toLocaleString('en-IN')}`
const statusStyles: Record<string, string> = { Pending: 'bg-amber-50 text-amber-700', Preparing: 'bg-orange-50 text-orange-700', Ready: 'bg-teal-50 text-teal-700', Served: 'bg-violet-50 text-violet-700', Completed: 'bg-emerald-50 text-emerald-700', Cancelled: 'bg-red-50 text-red-700' }
const STATUS_KEY = { Pending: 'common.orderStatus.Pending', Preparing: 'common.orderStatus.Preparing', Ready: 'common.orderStatus.Ready', Served: 'common.orderStatus.Served', Completed: 'common.orderStatus.Completed', Cancelled: 'common.orderStatus.Cancelled' } as const
const statusName = (t: TFunction, status: string) => status in STATUS_KEY ? t(STATUS_KEY[status as keyof typeof STATUS_KEY]) : status
const TABLE_STATUS_KEY = { Available: 'common.tableStatus.Available', Occupied: 'common.tableStatus.Occupied', Reserved: 'common.tableStatus.Reserved' } as const

function timeAgo(t: TFunction, locale: string, iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return t('overview.justNow')
  if (minutes < 60) return t('overview.minAgo', { minutes })
  if (minutes < 24 * 60) return new Date(iso).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

/** "+3 vs yesterday" style comparison against the same time yesterday. */
function compare(t: TFunction, now: number, before: number, money = false) {
  if (now === 0 && before === 0) return { text: t('overview.noOrdersYet'), tone: 'muted' as const }
  if (before === 0) return { text: t('overview.yesterdayNone'), tone: 'up' as const }
  const pct = Math.round(((now - before) / before) * 100)
  if (pct === 0) return { text: t('overview.sameAsYesterday'), tone: 'muted' as const }
  const diff = money ? `${pct > 0 ? '+' : ''}${pct}%` : `${now - before > 0 ? '+' : ''}${now - before}`
  return { text: t('overview.vsYesterday', { diff }), tone: pct > 0 ? 'up' as const : 'down' as const }
}

export function Overview({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const t = useT()
  const intlLocale = useIntlLocale()
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stats/overview', { cache: 'no-store' })
      if (res.status === 401) { window.location.href = '/admin/login'; return }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? t('overview.loadError'))
      setStats(data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('overview.loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  // Keep the numbers fresh while the dashboard is open.
  useEffect(() => {
    load()
    const timer = setInterval(load, 30000)
    return () => clearInterval(timer)
  }, [load])

  const header = <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[.17em] text-[#bc7843]">{t('overview.eyebrow')}</p><h2 className="font-serif text-3xl font-bold tracking-tight">{t('overview.title')}</h2></div><div className="flex items-center gap-2">{stats && <span className="hidden text-[11px] text-[#9aa39c] sm:inline">{t('overview.updated', { time: new Date(stats.updatedAt).toLocaleTimeString(intlLocale, { hour: 'numeric', minute: '2-digit' }) })}</span>}<button onClick={load} aria-label={t('overview.refreshAria')} className="flex size-10 items-center justify-center rounded-xl border border-[#e0e5df] bg-white text-[#68756b] hover:bg-[#f5f7f4]"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button><button onClick={() => onNavigate('Waiter order panel')} className="flex items-center gap-2 rounded-xl bg-[#174d3c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123f31]"><Plus className="size-4" /> {t('overview.newOrder')}</button></div></div>

  if (!stats) return <div>{header}{error ? <p role="alert" className="rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{error}</p> : <div className="mt-10 flex justify-center text-[#87928a]"><Loader2 className="size-6 animate-spin" /></div>}</div>

  const { today, yesterday, open, tables, recent, popular } = stats
  const ordersCmp = compare(t, today.orders, yesterday.orders)
  const salesCmp = compare(t, today.sales, yesterday.sales, true)
  const totalTables = tables.Available + tables.Occupied + tables.Reserved
  const maxQty = Math.max(1, ...popular.map(p => p.qty))

  return <div>
    {header}
    {error && <p role="alert" className="mb-5 rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{t('overview.refreshError', { error })}</p>}

    <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <Metric icon={ClipboardList} label={t('overview.todaysOrders')} value={String(today.orders)} note={ordersCmp.text} tone={ordersCmp.tone} />
      <Metric icon={CircleDollarSign} label={t('overview.todaysSales')} value={taka(today.sales)} note={salesCmp.text} tone={salesCmp.tone} />
      <Metric icon={Clock3} label={t('overview.waitingForKitchen')} value={String(open.Pending)} note={t('overview.kitchenNote', { preparing: open.Preparing, ready: open.Ready })} tone={open.Pending > 0 ? 'warn' : 'muted'} onClick={() => onNavigate('Orders')} />
      <Metric icon={Wallet} label={t('overview.unpaidToday')} value={taka(today.unpaid)} note={today.unpaid > 0 ? t('overview.stillToCollect') : t('overview.allCollected')} tone={today.unpaid > 0 ? 'warn' : 'muted'} onClick={() => onNavigate('Orders')} />
    </section>

    <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-[1.55fr_1fr]">
      <section className="rounded-2xl border border-[#e3e8e1] bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between"><div><h3 className="font-serif text-lg font-bold">{t('overview.recentOrders')}</h3><p className="mt-0.5 text-xs text-[#87928a]">{t('overview.recentHint')}</p></div><button onClick={() => onNavigate('Orders')} className="text-xs font-semibold text-[#b86f3c] hover:underline">{t('overview.viewAllOrders')} <ArrowUpRight className="ml-1 inline size-3.5" /></button></div>
        {recent.length === 0 ? <div className="flex flex-col items-center py-10 text-center"><ClipboardList className="size-9 text-[#c7d1c7]" /><p className="mt-3 text-sm font-semibold">{t('overview.noOrdersYet')}</p><p className="mt-1 text-xs text-[#89938b]">{t('overview.noOrdersHint')}</p></div>
          : <ul className="divide-y divide-[#f0f2ef]">{recent.map(order => <li key={order.id}><button onClick={() => onNavigate('Orders')} className="flex w-full items-center gap-3 py-3 text-left hover:bg-[#fafbf9]">
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${order.type === 'Dine in' ? 'bg-[#eaf2eb] text-[#174d3c]' : 'bg-[#fff0df] text-[#a8622f]'}`}>{order.type === 'Dine in' ? <Utensils className="size-4" /> : <Bike className="size-4" />}</span>
            <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-x-2 text-sm"><span className="font-semibold">{order.code}</span><span className="text-xs text-[#5f6b62]">{order.type === 'Dine in' ? t('common.table', { number: order.tableNumber ?? '' }) : order.customerName || t('common.orderType.Takeaway')}</span>{order.source === 'Staff' && <span className="flex items-center gap-1 text-[11px] text-[#4b5aa8]"><UserRound className="size-3" />{order.takenBy || t('overview.staff')}</span>}</span><span className="mt-0.5 block truncate text-xs text-[#89938b]">{order.items}</span></span>
            <span className="text-right"><span className="block text-sm font-bold">{taka(order.total)}</span><span className="block text-[10px] text-[#a0aaa2]">{timeAgo(t, intlLocale, order.createdAt)}</span></span>
            <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline ${statusStyles[order.status] ?? ''}`}>{statusName(t, order.status)}</span>
          </button></li>)}</ul>}
      </section>

      <div className="flex flex-col gap-6">
        <section className="rounded-2xl border border-[#e3e8e1] bg-white p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between"><div><h3 className="font-serif text-lg font-bold">{t('overview.bestSellers')}</h3><p className="mt-0.5 text-xs text-[#87928a]">{t('overview.last7Days')}</p></div><button onClick={() => onNavigate('Menu')} className="text-xs font-semibold text-[#b86f3c] hover:underline">{t('overview.manageMenu')} <ArrowUpRight className="ml-1 inline size-3.5" /></button></div>
          {popular.length === 0 ? <p className="py-6 text-center text-xs text-[#89938b]">{t('overview.noSales')}</p>
            : <ol className="flex flex-col gap-3.5">{popular.map(item => <li key={item.id} className="flex items-center gap-3">
              {item.image ? <img src={item.image} alt="" className="size-12 shrink-0 rounded-xl object-cover" /> : <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#f5f1e8] text-[#d2b893]"><Coffee className="size-5" /></div>}
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.name}</p><p className="mt-0.5 text-[11px] text-[#8a968d]">{t('overview.sold', { qty: item.qty, amount: taka(item.revenue) })}</p><div className="mt-1.5 h-1.5 w-full rounded-full bg-[#edf1ec]"><div className="h-1.5 rounded-full bg-[#d38a51]" style={{ width: `${(item.qty / maxQty) * 100}%` }} /></div></div>
            </li>)}</ol>}
        </section>

        <section className="rounded-2xl border border-[#e3e8e1] bg-white p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between"><div><h3 className="font-serif text-lg font-bold">{t('overview.tablesNow')}</h3><p className="mt-0.5 text-xs text-[#87928a]">{t(totalTables === 1 ? 'overview.activeTableOne' : 'overview.activeTableMany', { count: totalTables })}</p></div><button onClick={() => onNavigate('Tables')} className="text-xs font-semibold text-[#b86f3c] hover:underline">{t('overview.manage')} <ArrowUpRight className="ml-1 inline size-3.5" /></button></div>
          {totalTables === 0 ? <button onClick={() => onNavigate('Tables')} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#eef4ed] py-3 text-xs font-bold text-[#174d3c]"><Grid2X2 className="size-4" /> {t('overview.addTables')}</button> : <>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-[#edf1ec]">{tables.Occupied > 0 && <div className="bg-[#d38a51]" style={{ width: `${(tables.Occupied / totalTables) * 100}%` }} />}{tables.Reserved > 0 && <div className="bg-[#7b8fd1]" style={{ width: `${(tables.Reserved / totalTables) * 100}%` }} />}</div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">{([['Available', '#2f8a5b'], ['Occupied', '#c7773d'], ['Reserved', '#5b6fb5']] as const).map(([label, color]) => <div key={label} className="rounded-xl bg-[#f7f8f6] py-2.5"><dd className="font-serif text-xl font-bold" style={{ color }}>{tables[label]}</dd><dt className="text-[11px] text-[#87928a]">{t(TABLE_STATUS_KEY[label])}</dt></div>)}</dl>
          </>}
        </section>
      </div>
    </div>
  </div>
}

function Metric({ icon: Icon, label, value, note, tone, onClick }: { icon: typeof ClipboardList; label: string; value: string; note: string; tone: 'up' | 'down' | 'warn' | 'muted'; onClick?: () => void }) {
  const toneClass = { up: 'text-[#2f8a5b]', down: 'text-[#b4472c]', warn: 'text-[#c7773d]', muted: 'text-[#9aa39c]' }[tone]
  const body = <><div className={`flex size-9 items-center justify-center rounded-xl ${tone === 'warn' ? 'bg-[#fff0df] text-[#c7773d]' : 'bg-[#eaf2eb] text-[#174d3c]'}`}><Icon className="size-[18px]" /></div><p className="mt-3 text-xs font-medium text-[#87928a] sm:mt-4">{label}</p><p className="mt-1 font-serif text-xl font-bold tracking-tight sm:text-2xl">{value}</p><p className={`mt-1 text-[11px] font-semibold ${toneClass}`}>{note}</p></>
  return onClick
    ? <button onClick={onClick} className="rounded-2xl border border-[#e3e8e1] bg-white p-4 text-left sm:p-5 transition hover:border-[#c9d6cb]">{body}</button>
    : <div className="rounded-2xl border border-[#e3e8e1] bg-white p-4 sm:p-5">{body}</div>
}
