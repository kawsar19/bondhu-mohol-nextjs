'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CircleDollarSign, ClipboardList, Download, Loader2, Printer, RefreshCw, ShoppingBasket, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { SHOP } from '@/lib/shop'
import { DateRangePicker, describeRange, formatDay, PRESETS, type DateRange } from './date-range-picker'

type Totals = { orders: number; sales: number; unpaid: number; cancelled: number; expenses: number; profit: number }
type Day = { date: string; orders: number; sales: number; expenses: number; profit: number }
type Report = {
  totals: Totals
  byType: { type: string; orders: number; sales: number }[]
  daily: Day[]
  topItems: { id: string; name: string; qty: number; revenue: number }[]
  expensesByCategory: { category: string; amount: number; count: number }[]
}

const taka = (n: number) => `${n < 0 ? '−' : ''}৳ ${Math.abs(n).toLocaleString('en-IN')}`

function downloadCsv(report: Report, range: DateRange) {
  const rows = [['Date', 'Orders', 'Sales', 'Expenses', 'Profit'], ...[...report.daily].reverse().map(d => [d.date, d.orders, d.sales, d.expenses, d.profit]), ['Total', report.totals.orders, report.totals.sales, report.totals.expenses, report.totals.profit]]
  // BOM so Excel opens it as UTF-8.
  const blob = new Blob(['﻿' + rows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `report-${range.from}-to-${range.to}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

export function Reports() {
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
      if (!res.ok) throw new Error(data.error ?? 'Could not load the report')
      setReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the report')
    } finally {
      setLoading(false)
    }
  }, [range])

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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[.17em] text-[#bc7843]">Reports</p><h2 className="font-serif text-3xl font-bold tracking-tight">Sales &amp; profit</h2><p className="mt-1 text-xs text-[#89938b]">{describeRange(range)}</p></div><div className="flex gap-2"><button onClick={load} aria-label="Refresh report" className="flex size-10 items-center justify-center rounded-xl border border-[#e0e5df] bg-white text-[#68756b] hover:bg-[#f5f7f4]"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button><button onClick={() => report && downloadCsv(report, range)} disabled={!report} className="flex items-center gap-2 rounded-xl border border-[#e0e5df] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#5f6b62] hover:bg-[#f5f7f4] disabled:opacity-50"><Download className="size-4" /> CSV</button><button onClick={() => setPrinting(true)} disabled={!report} className="flex items-center gap-2 rounded-xl bg-[#174d3c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123f31] disabled:opacity-50"><Printer className="size-4" /> Print</button></div></div>

    <DateRangePicker value={range} onChange={setRange} />

    {error && <p role="alert" className="mt-5 rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{error}</p>}

    {!report || !t ? (loading && <div className="mt-10 flex justify-center text-[#87928a]"><Loader2 className="size-6 animate-spin" /></div>) : <div className={loading ? 'opacity-60 transition' : 'transition'}>
      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile icon={CircleDollarSign} label="Sales" value={taka(t.sales)} note={`${t.orders} orders${t.orders ? ` · avg ${taka(Math.round(t.sales / t.orders))}` : ''}`} />
        <Tile icon={ShoppingBasket} label="Expenses" value={taka(t.expenses)} note={`${report.expensesByCategory.reduce((n, c) => n + c.count, 0)} entries`} warm />
        <Tile icon={t.profit >= 0 ? TrendingUp : TrendingDown} label={t.profit >= 0 ? 'Profit' : 'Loss'} value={taka(t.profit)} note="Sales minus expenses" tone={t.profit >= 0 ? 'good' : 'bad'} />
        <Tile icon={Wallet} label="Unpaid" value={taka(t.unpaid)} note={`${t.cancelled} cancelled ${t.cancelled === 1 ? 'order' : 'orders'} not counted`} warm={t.unpaid > 0} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-[#e3e8e1] bg-white p-5 sm:p-6">
          <h3 className="font-serif text-lg font-bold">{multiDay ? 'Day by day' : 'Sales by order type'}</h3>
          {multiDay ? (report.daily.length === 0 ? <Empty text="No sales or expenses in this period." /> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[480px] text-sm">
            <thead><tr className="border-b border-[#eef1ed] text-left text-[11px] uppercase tracking-wide text-[#9aa39c]"><th className="py-2 font-semibold">Date</th><th className="py-2 text-right font-semibold">Orders</th><th className="py-2 text-right font-semibold">Sales</th><th className="py-2 text-right font-semibold">Expenses</th><th className="py-2 text-right font-semibold">Profit</th></tr></thead>
            <tbody className="divide-y divide-[#f3f5f2]">{report.daily.map(d => <tr key={d.date}><td className="py-2.5 font-medium">{formatDay(d.date)}</td><td className="py-2.5 text-right text-[#5f6b62]">{d.orders}</td><td className="py-2.5 text-right">{taka(d.sales)}</td><td className="py-2.5 text-right text-[#b4472c]">{d.expenses ? taka(d.expenses) : '–'}</td><td className={`py-2.5 text-right font-semibold ${d.profit < 0 ? 'text-[#b4472c]' : 'text-[#2f8a5b]'}`}>{taka(d.profit)}</td></tr>)}</tbody>
            <tfoot><tr className="border-t-2 border-[#e3e8e1] font-bold"><td className="py-2.5">Total</td><td className="py-2.5 text-right">{t.orders}</td><td className="py-2.5 text-right">{taka(t.sales)}</td><td className="py-2.5 text-right text-[#b4472c]">{taka(t.expenses)}</td><td className={`py-2.5 text-right ${t.profit < 0 ? 'text-[#b4472c]' : 'text-[#2f8a5b]'}`}>{taka(t.profit)}</td></tr></tfoot>
          </table></div>)
            : report.byType.length === 0 ? <Empty text="No sales on this day." /> : <div className="mt-4 grid gap-3 sm:grid-cols-2">{report.byType.map(row => <div key={row.type} className="rounded-xl bg-[#f7f8f6] p-4"><p className="text-xs font-medium text-[#87928a]">{row.type}</p><p className="mt-1 font-serif text-xl font-bold">{taka(row.sales)}</p><p className="text-[11px] text-[#9aa39c]">{row.orders} orders</p></div>)}</div>}
        </section>

        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-[#e3e8e1] bg-white p-5 sm:p-6">
            <h3 className="font-serif text-lg font-bold">Best sellers</h3>
            {report.topItems.length === 0 ? <Empty text="Nothing sold in this period." /> : <ol className="mt-4 flex flex-col gap-2.5">{report.topItems.map((item, i) => <li key={item.id} className="flex items-center gap-3 text-sm"><span className="w-5 text-xs font-bold text-[#a0aaa2]">{i + 1}</span><span className="min-w-0 flex-1 truncate font-medium">{item.name}</span><span className="text-xs text-[#87928a]">{item.qty} sold</span><span className="w-24 text-right font-semibold">{taka(item.revenue)}</span></li>)}</ol>}
          </section>
          <section className="rounded-2xl border border-[#e3e8e1] bg-white p-5 sm:p-6">
            <h3 className="font-serif text-lg font-bold">Where the money went</h3>
            {report.expensesByCategory.length === 0 ? <Empty text="No expenses written down for this period." /> : <ul className="mt-4 flex flex-col gap-2.5">{report.expensesByCategory.map(c => <li key={c.category} className="flex items-center gap-3 text-sm"><span className="w-28 shrink-0 font-medium">{c.category}</span><div className="h-2 flex-1 rounded-full bg-[#f1f3f0]"><div className="h-2 rounded-full bg-[#d38a51]" style={{ width: `${(c.amount / t.expenses) * 100}%` }} /></div><span className="w-24 text-right font-semibold">{taka(c.amount)}</span></li>)}</ul>}
          </section>
        </div>
      </div>
    </div>}

    {printing && report && createPortal(<div className="print-root hidden print:block"><ReportSheet report={report} range={range} /></div>, document.body)}
  </div>
}

function ReportSheet({ report, range }: { report: Report; range: DateRange }) {
  const t = report.totals
  const cell = 'border border-black/30 px-2 py-1'
  return <div className="text-[10pt] text-black">
    <h1 className="text-center text-[16pt] font-bold">{SHOP.name}</h1>
    <p className="text-center">Sales &amp; profit report · {describeRange(range)}</p>
    <table className="mt-4 w-full border-collapse"><tbody>
      {[['Orders', String(t.orders)], ['Sales', taka(t.sales)], ['Expenses', taka(t.expenses)], [t.profit >= 0 ? 'Profit' : 'Loss', taka(t.profit)], ['Unpaid', taka(t.unpaid)], ['Cancelled orders', String(t.cancelled)]].map(([k, v]) => <tr key={k}><td className={cell}>{k}</td><td className={`${cell} text-right font-semibold`}>{v}</td></tr>)}
    </tbody></table>
    {report.daily.length > 1 && <><h2 className="mt-4 font-bold">Day by day</h2><table className="mt-1 w-full border-collapse"><thead><tr>{['Date', 'Orders', 'Sales', 'Expenses', 'Profit'].map(h => <th key={h} className={`${cell} text-left`}>{h}</th>)}</tr></thead><tbody>{[...report.daily].reverse().map(d => <tr key={d.date}><td className={cell}>{formatDay(d.date)}</td><td className={cell}>{d.orders}</td><td className={cell}>{taka(d.sales)}</td><td className={cell}>{taka(d.expenses)}</td><td className={cell}>{taka(d.profit)}</td></tr>)}</tbody></table></>}
    <div className="mt-4 grid grid-cols-2 gap-4">
      <div><h2 className="font-bold">Best sellers</h2><table className="mt-1 w-full border-collapse"><tbody>{report.topItems.map(i => <tr key={i.id}><td className={cell}>{i.name}</td><td className={cell}>{i.qty}</td><td className={`${cell} text-right`}>{taka(i.revenue)}</td></tr>)}</tbody></table></div>
      <div><h2 className="font-bold">Expenses</h2><table className="mt-1 w-full border-collapse"><tbody>{report.expensesByCategory.map(c => <tr key={c.category}><td className={cell}>{c.category}</td><td className={`${cell} text-right`}>{taka(c.amount)}</td></tr>)}</tbody></table></div>
    </div>
    <p className="mt-4 text-[8pt]">Printed {new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}</p>
  </div>
}

function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-xs text-[#89938b]">{text}</p>
}

function Tile({ icon: Icon, label, value, note, warm, tone }: { icon: typeof ClipboardList; label: string; value: string; note: string; warm?: boolean; tone?: 'good' | 'bad' }) {
  const valueColor = tone === 'good' ? 'text-[#2f8a5b]' : tone === 'bad' ? 'text-[#b4472c]' : ''
  return <div className="rounded-2xl border border-[#e3e8e1] bg-white p-5"><div className={`flex size-9 items-center justify-center rounded-xl ${warm ? 'bg-[#fff0df] text-[#c7773d]' : 'bg-[#eaf2eb] text-[#174d3c]'}`}><Icon className="size-[18px]" /></div><p className="mt-4 text-xs font-medium text-[#87928a]">{label}</p><p className={`mt-1 font-serif text-2xl font-bold tracking-tight ${valueColor}`}>{value}</p><p className="mt-1 text-[11px] text-[#9aa39c]">{note}</p></div>
}
