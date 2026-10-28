'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CircleDollarSign, ClipboardList, Download, Loader2, Printer, RefreshCw, ShoppingBasket, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { SHOP } from '@/lib/shop'
import type { MessageKey, TFunction } from '@/lib/i18n'
import { useIntlLocale, useT } from '@/components/i18n-provider'
import { DateRangePicker, describeRange, formatDay, PRESETS, type DateRange } from './date-range-picker'

type Totals = { orders: number; sales: number; unpaid: number; cancelled: number; expenses: number; profit: number }
type Day = { date: string; orders: number; sales: number; expenses: number; profit: number }
type Report = {
  totals: Totals
  byType: { type: string; orders: number; sales: number }[]
  byPayment: { method: string; orders: number; amount: number }[]
  daily: Day[]
  topItems: { id: string; name: string; qty: number; revenue: number }[]
  expensesByCategory: { category: string; amount: number; count: number }[]
}

const taka = (n: number) => `${n < 0 ? '−' : ''}৳ ${Math.abs(n).toLocaleString('en-IN')}`

// Stored values (order type, payment method) shown in the current language; anything else is shown as stored.
const LABELS: Record<string, MessageKey> = { 'Dine in': 'common.orderType.Dine in', Takeaway: 'common.orderType.Takeaway', Cash: 'reports.paymentMethod.Cash', bKash: 'reports.paymentMethod.bKash', Nagad: 'reports.paymentMethod.Nagad', Card: 'reports.paymentMethod.Card', 'Not recorded': 'reports.paymentMethod.Not recorded' }
const label = (t: TFunction, value: string) => LABELS[value] ? t(LABELS[value]) : value

function downloadCsv(report: Report, range: DateRange, t: TFunction) {
  const rows = [[t('reports.date'), t('reports.orders'), t('reports.sales'), t('reports.expenses'), t('reports.profit')], ...[...report.daily].reverse().map(d => [d.date, d.orders, d.sales, d.expenses, d.profit]), [t('common.total'), report.totals.orders, report.totals.sales, report.totals.expenses, report.totals.profit]]
  // BOM so Excel opens it as UTF-8.
  const blob = new Blob(['﻿' + rows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `report-${range.from}-to-${range.to}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

export function Reports() {
  const tr = useT()
  const locale = useIntlLocale()
  const [range, setRange] = useState<DateRange>(() => PRESETS[0].range())
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [printing, setPrinting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/reports?from=${range.from}&to=${range.to}`, { cache: 'no-store' })
      if (res.status === 401) { window.location.href = '/admin/login'; return }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? tr('reports.loadFailed'))
      setReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('reports.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [range, tr])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!printing) return
    const done = () => setPrinting(false)
    window.addEventListener('afterprint', done, { once: true })
    const timer = setTimeout(() => window.print(), 50)
    return () => { clearTimeout(timer); window.removeEventListener('afterprint', done) }
  }, [printing])

  const t = report?.totals
  const multiDay = range.from !== range.to

  return <div>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[.17em] text-[#bc7843]">{tr('reports.eyebrow')}</p><h2 className="font-serif text-3xl font-bold tracking-tight">{tr('reports.title')}</h2><p className="mt-1 text-xs text-[#89938b]">{describeRange(range, locale)}</p></div><div className="flex gap-2"><button onClick={load} aria-label={tr('reports.refresh')} className="flex size-10 items-center justify-center rounded-xl border border-[#e0e5df] bg-white text-[#68756b] hover:bg-[#f5f7f4]"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button><button onClick={() => report && downloadCsv(report, range, tr)} disabled={!report} className="flex items-center gap-2 rounded-xl border border-[#e0e5df] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#5f6b62] hover:bg-[#f5f7f4] disabled:opacity-50"><Download className="size-4" /> CSV</button><button onClick={() => setPrinting(true)} disabled={!report} className="flex items-center gap-2 rounded-xl bg-[#174d3c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123f31] disabled:opacity-50"><Printer className="size-4" /> {tr('reports.print')}</button></div></div>

    <DateRangePicker value={range} onChange={setRange} />

    {error && <p role="alert" className="mt-5 rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{error}</p>}

    {!report || !t ? (loading && <div className="mt-10 flex justify-center text-[#87928a]"><Loader2 className="size-6 animate-spin" /></div>) : <div className={loading ? 'opacity-60 transition' : 'transition'}>
      <section className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Tile icon={CircleDollarSign} label={tr('reports.sales')} value={taka(t.sales)} note={`${tr('reports.salesNote', { count: t.orders })}${t.orders ? tr('reports.avg', { amount: taka(Math.round(t.sales / t.orders)) }) : ''}`} />
        <Tile icon={ShoppingBasket} label={tr('reports.expenses')} value={taka(t.expenses)} note={tr('reports.entriesNote', { count: report.expensesByCategory.reduce((n, c) => n + c.count, 0) })} warm />
        <Tile icon={t.profit >= 0 ? TrendingUp : TrendingDown} label={t.profit >= 0 ? tr('reports.profit') : tr('reports.loss')} value={taka(t.profit)} note={tr('reports.profitNote')} tone={t.profit >= 0 ? 'good' : 'bad'} />
        <Tile icon={Wallet} label={tr('reports.unpaid')} value={taka(t.unpaid)} note={tr(t.cancelled === 1 ? 'reports.cancelledNoteOne' : 'reports.cancelledNoteMany', { count: t.cancelled })} warm={t.unpaid > 0} />
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-[#e3e8e1] bg-white p-5 sm:p-6">
          <h3 className="font-serif text-lg font-bold">{multiDay ? tr('reports.dayByDay') : tr('reports.byOrderType')}</h3>
          {multiDay ? (report.daily.length === 0 ? <Empty text={tr('reports.noActivity')} /> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[480px] text-sm">
            <thead><tr className="border-b border-[#eef1ed] text-left text-[11px] uppercase tracking-wide text-[#9aa39c]"><th className="py-2 font-semibold">{tr('reports.date')}</th><th className="py-2 text-right font-semibold">{tr('reports.orders')}</th><th className="py-2 text-right font-semibold">{tr('reports.sales')}</th><th className="py-2 text-right font-semibold">{tr('reports.expenses')}</th><th className="py-2 text-right font-semibold">{tr('reports.profit')}</th></tr></thead>
            <tbody className="divide-y divide-[#f3f5f2]">{report.daily.map(d => <tr key={d.date}><td className="py-2.5 font-medium">{formatDay(d.date, locale)}</td><td className="py-2.5 text-right text-[#5f6b62]">{d.orders}</td><td className="py-2.5 text-right">{taka(d.sales)}</td><td className="py-2.5 text-right text-[#b4472c]">{d.expenses ? taka(d.expenses) : '–'}</td><td className={`py-2.5 text-right font-semibold ${d.profit < 0 ? 'text-[#b4472c]' : 'text-[#2f8a5b]'}`}>{taka(d.profit)}</td></tr>)}</tbody>
            <tfoot><tr className="border-t-2 border-[#e3e8e1] font-bold"><td className="py-2.5">{tr('common.total')}</td><td className="py-2.5 text-right">{t.orders}</td><td className="py-2.5 text-right">{taka(t.sales)}</td><td className="py-2.5 text-right text-[#b4472c]">{taka(t.expenses)}</td><td className={`py-2.5 text-right ${t.profit < 0 ? 'text-[#b4472c]' : 'text-[#2f8a5b]'}`}>{taka(t.profit)}</td></tr></tfoot>
          </table></div>)
            : report.byType.length === 0 ? <Empty text={tr('reports.noSalesDay')} /> : <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">{report.byType.map(row => <div key={row.type} className="rounded-xl bg-[#f7f8f6] p-4"><p className="text-xs font-medium text-[#87928a]">{label(tr, row.type)}</p><p className="mt-1 font-serif text-xl font-bold">{taka(row.sales)}</p><p className="text-[11px] text-[#9aa39c]">{tr('reports.salesNote', { count: row.orders })}</p></div>)}</div>}
        </section>

        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-[#e3e8e1] bg-white p-5 sm:p-6">
            <h3 className="font-serif text-lg font-bold">{tr('reports.moneyReceived')}</h3>
            {report.byPayment.length === 0 ? <Empty text={tr('reports.noPaid')} /> : <ul className="mt-4 grid grid-cols-2 gap-2.5">{report.byPayment.map(p => <li key={p.method} className="rounded-xl bg-[#f7f8f6] p-3"><p className="text-xs font-medium text-[#87928a]">{label(tr, p.method)}</p><p className="mt-0.5 font-serif text-lg font-bold">{taka(p.amount)}</p><p className="text-[11px] text-[#9aa39c]">{tr(p.orders === 1 ? 'reports.orderOne' : 'reports.orderMany', { count: p.orders })}</p></li>)}</ul>}
          </section>
          <section className="rounded-2xl border border-[#e3e8e1] bg-white p-5 sm:p-6">
            <h3 className="font-serif text-lg font-bold">{tr('reports.bestSellers')}</h3>
            {report.topItems.length === 0 ? <Empty text={tr('reports.nothingSold')} /> : <ol className="mt-4 flex flex-col gap-2.5">{report.topItems.map((item, i) => <li key={item.id} className="flex items-center gap-3 text-sm"><span className="w-5 text-xs font-bold text-[#a0aaa2]">{i + 1}</span><span className="min-w-0 flex-1 truncate font-medium">{item.name}</span><span className="text-xs text-[#87928a]">{tr('reports.sold', { count: item.qty })}</span><span className="w-24 text-right font-semibold">{taka(item.revenue)}</span></li>)}</ol>}
          </section>
          <section className="rounded-2xl border border-[#e3e8e1] bg-white p-5 sm:p-6">
            <h3 className="font-serif text-lg font-bold">{tr('reports.whereMoneyWent')}</h3>
            {report.expensesByCategory.length === 0 ? <Empty text={tr('reports.noExpenses')} /> : <ul className="mt-4 flex flex-col gap-2.5">{report.expensesByCategory.map(c => <li key={c.category} className="flex items-center gap-3 text-sm"><span className="w-28 shrink-0 font-medium">{c.category}</span><div className="h-2 flex-1 rounded-full bg-[#f1f3f0]"><div className="h-2 rounded-full bg-[#d38a51]" style={{ width: `${(c.amount / t.expenses) * 100}%` }} /></div><span className="w-24 text-right font-semibold">{taka(c.amount)}</span></li>)}</ul>}
          </section>
        </div>
      </div>
    </div>}

    {printing && report && createPortal(<div className="print-root hidden print:block"><ReportSheet report={report} range={range} /></div>, document.body)}
  </div>
}

function ReportSheet({ report, range }: { report: Report; range: DateRange }) {
  const tr = useT()
  const locale = useIntlLocale()
  const t = report.totals
  const cell = 'border border-black/30 px-2 py-1'
  return <div className="text-[10pt] text-black">
    <h1 className="text-center text-[16pt] font-bold">{SHOP.name}</h1>
    <p className="text-center">{tr('reports.sheetTitle', { range: describeRange(range, locale) })}</p>
    <table className="mt-4 w-full border-collapse"><tbody>
      {[[tr('reports.orders'), String(t.orders)], [tr('reports.sales'), taka(t.sales)], [tr('reports.expenses'), taka(t.expenses)], [t.profit >= 0 ? tr('reports.profit') : tr('reports.loss'), taka(t.profit)], [tr('reports.unpaid'), taka(t.unpaid)], [tr('reports.cancelledOrders'), String(t.cancelled)]].map(([k, v]) => <tr key={k}><td className={cell}>{k}</td><td className={`${cell} text-right font-semibold`}>{v}</td></tr>)}
    </tbody></table>
    {report.daily.length > 1 && <><h2 className="mt-4 font-bold">{tr('reports.dayByDay')}</h2><table className="mt-1 w-full border-collapse"><thead><tr>{[tr('reports.date'), tr('reports.orders'), tr('reports.sales'), tr('reports.expenses'), tr('reports.profit')].map(h => <th key={h} className={`${cell} text-left`}>{h}</th>)}</tr></thead><tbody>{[...report.daily].reverse().map(d => <tr key={d.date}><td className={cell}>{formatDay(d.date, locale)}</td><td className={cell}>{d.orders}</td><td className={cell}>{taka(d.sales)}</td><td className={cell}>{taka(d.expenses)}</td><td className={cell}>{taka(d.profit)}</td></tr>)}</tbody></table></>}
    <div className="mt-4 grid grid-cols-2 gap-4">
      <div><h2 className="font-bold">{tr('reports.moneyReceived')}</h2><table className="mt-1 w-full border-collapse"><tbody>{report.byPayment.map(p => <tr key={p.method}><td className={cell}>{label(tr, p.method)}</td><td className={cell}>{p.orders}</td><td className={`${cell} text-right`}>{taka(p.amount)}</td></tr>)}</tbody></table></div>
      <div><h2 className="font-bold">{tr('reports.bestSellers')}</h2><table className="mt-1 w-full border-collapse"><tbody>{report.topItems.map(i => <tr key={i.id}><td className={cell}>{i.name}</td><td className={cell}>{i.qty}</td><td className={`${cell} text-right`}>{taka(i.revenue)}</td></tr>)}</tbody></table></div>
      <div><h2 className="font-bold">{tr('reports.expenses')}</h2><table className="mt-1 w-full border-collapse"><tbody>{report.expensesByCategory.map(c => <tr key={c.category}><td className={cell}>{c.category}</td><td className={`${cell} text-right`}>{taka(c.amount)}</td></tr>)}</tbody></table></div>
    </div>
    <p className="mt-4 text-[8pt]">{tr('reports.printed', { time: new Date().toLocaleString(locale, { timeZone: 'Asia/Dhaka' }) })}</p>
  </div>
}

function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-xs text-[#89938b]">{text}</p>
}

function Tile({ icon: Icon, label, value, note, warm, tone }: { icon: typeof ClipboardList; label: string; value: string; note: string; warm?: boolean; tone?: 'good' | 'bad' }) {
  const valueColor = tone === 'good' ? 'text-[#2f8a5b]' : tone === 'bad' ? 'text-[#b4472c]' : ''
  return <div className="rounded-2xl border border-[#e3e8e1] bg-white p-4 sm:p-5"><div className={`flex size-9 items-center justify-center rounded-xl ${warm ? 'bg-[#fff0df] text-[#c7773d]' : 'bg-[#eaf2eb] text-[#174d3c]'}`}><Icon className="size-[18px]" /></div><p className="mt-3 text-xs font-medium text-[#87928a] sm:mt-4">{label}</p><p className={`mt-1 font-serif text-xl font-bold tracking-tight sm:text-2xl ${valueColor}`}>{value}</p><p className="mt-1 text-[11px] text-[#9aa39c]">{note}</p></div>
}
