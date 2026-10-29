'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2, Printer, RefreshCw, Warehouse } from 'lucide-react'
import { businessDateString } from '@/lib/time'
import type { MessageKey } from '@/lib/i18n'
import { useIntlLocale, useT } from '@/components/i18n-provider'
import { addDays, formatDay } from './date-range-picker'

type Unit = 'kg' | 'litre' | 'piece' | 'packet'
type StockLine = { name: string; unit: Unit; quantity: number; value: number }
type SectionRow = {
  _id: string; name: string; sales: number; itemsSold: number; usedCost: number; entered: boolean
  used: { name: string; unit: Unit; quantity: number; cost: number }[]
  production: { name: string; quantity: number }[]
  ownersShare: { item: string; quantity: string; takenBy: string }[]
  stock: StockLine[]
}
type Report = {
  totals: { orders: number; sales: number; unpaid: number; expenses: number; bazar: number; profit: number; usedCost: number }
  byPayment: { method: string; amount: number }[]
  sections: SectionRow[]
  unassignedSales: { sales: number; itemsSold: number } | null
  motherStock: StockLine[]
}

const taka = (n: number) => `৳ ${Math.round(n).toLocaleString('en-IN')}`
const amount = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 3 })

export function DayEndReport() {
  const t = useT()
  const locale = useIntlLocale()
  const today = businessDateString()
  const [date, setDate] = useState(today)
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/reports/day-end?date=${date}`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) window.location.href = '/admin/login'
      if (!res.ok) throw new Error(data.error || t('dayEnd.loadFailed'))
      setReport(data)
    } catch (err) {
      setReport(null)
      setError(err instanceof Error ? err.message : t('dayEnd.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [date, t])

  useEffect(() => { load() }, [load])

  const [printing, setPrinting] = useState(false)
  useEffect(() => {
    if (!printing) return
    const done = () => setPrinting(false)
    window.addEventListener('afterprint', done, { once: true })
    // Wait a tick so the print copy is on the page first.
    const timer = setTimeout(() => window.print(), 50)
    return () => { clearTimeout(timer); window.removeEventListener('afterprint', done) }
  }, [printing])

  const unit = (u: Unit) => t(`ingredients.units.${u}`)
  const chip = (on: boolean) => `h-9 rounded-full px-3.5 text-xs font-semibold transition ${on ? 'bg-[#174d3c] text-white' : 'border border-[#e2e7e1] bg-white text-[#5f6b62] hover:bg-[#f5f7f4]'}`
  const card = 'rounded-2xl border border-[#e3e8e1] bg-white p-5 print:break-inside-avoid print:rounded-none print:border-[#ccc] print:p-3'
  const small = 'text-[11px] font-bold uppercase tracking-[.12em] text-[#a0aaa2]'
  const shares = report?.sections.flatMap(s => s.ownersShare.map(o => ({ ...o, section: s.name }))) ?? []

  const sheet = report && <>
      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
        <Tile label={t('dayEnd.sales')} value={taka(report.totals.sales)} note={`${t('dayEnd.ordersNote', { count: report.totals.orders })} · ${report.totals.unpaid > 0 ? t('dayEnd.unpaidNote', { amount: Math.round(report.totals.unpaid).toLocaleString('en-IN') }) : t('dayEnd.allPaid')}`} tone="text-[#174d3c]" />
        <Tile label={t('dayEnd.expenses')} value={taka(report.totals.expenses)} note={t('dayEnd.bazarNote', { amount: Math.round(report.totals.bazar).toLocaleString('en-IN') })} tone="text-[#b4472c]" />
        <Tile label={t('dayEnd.profit')} value={taka(report.totals.profit)} note={report.byPayment.map(p => `${t(`reports.paymentMethod.${p.method}` as MessageKey)} ${taka(p.amount)}`).join(' · ') || ' '} tone={report.totals.profit >= 0 ? 'text-[#174d3c]' : 'text-[#b4472c]'} />
        <Tile label={t('dayEnd.usedCost')} value={taka(report.totals.usedCost)} note={t('dayEnd.usedCostNote')} tone="text-[#8a5a24]" />
      </section>

      <h3 className="mt-8 font-serif text-xl font-bold">{t('dayEnd.sectionsTitle')}</h3>
      {report.sections.length === 0 ? <p className="mt-2 text-sm text-[#89938b]">{t('dayEnd.noSections')}</p> : <div className="mt-3 grid gap-4 lg:grid-cols-2 print:grid-cols-2">{report.sections.map(s => <section key={s._id} className={card}>
        <div className="flex items-start justify-between gap-3"><div><h4 className="text-base font-bold">{s.name}</h4><p className="text-[11px] text-[#89938b]">{t('dayEnd.itemsSold', { count: s.itemsSold })}</p></div>{!s.entered && <span className="flex items-center gap-1 rounded-full bg-[#fff0df] px-2 py-1 text-[11px] font-semibold text-[#a8622f]"><AlertTriangle className="size-3.5" /> {t('dayEnd.notEntered')}</span>}</div>
        <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-[#fafbf9] p-3 text-center print:bg-transparent">
          <div><dt className="text-[10px] text-[#89938b]">{t('dayEnd.sectionSales')}</dt><dd className="text-sm font-bold">{taka(s.sales)}</dd></div>
          <div><dt className="text-[10px] text-[#89938b]">{t('dayEnd.ingredientCost')}</dt><dd className="text-sm font-bold text-[#8a5a24]">{taka(s.usedCost)}</dd></div>
          <div><dt className="text-[10px] text-[#89938b]">{t('dayEnd.margin')}</dt><dd className={`text-sm font-bold ${s.sales - s.usedCost >= 0 ? 'text-[#174d3c]' : 'text-[#b4472c]'}`}>{taka(s.sales - s.usedCost)}</dd></div>
        </dl>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 print:grid-cols-2">
          <div><p className={small}>{t('dayEnd.usedTitle')}</p>{s.used.length === 0 ? <p className="mt-1 text-xs text-[#a0aaa2]">{t('dayEnd.nothing')}</p> : <ul className="mt-1 space-y-0.5 text-xs">{s.used.map(u => <li key={u.name} className="flex justify-between gap-2"><span>{u.name} <span className="text-[#89938b]">{amount(u.quantity)} {unit(u.unit)}</span></span><span className="font-semibold">{taka(u.cost)}</span></li>)}</ul>}</div>
          <div><p className={small}>{t('dayEnd.madeTitle')}</p>{s.production.length === 0 ? <p className="mt-1 text-xs text-[#a0aaa2]">{t('dayEnd.nothing')}</p> : <ul className="mt-1 space-y-0.5 text-xs">{s.production.map(p => <li key={p.name} className="flex justify-between gap-2"><span>{p.name}</span><span className="font-semibold">{amount(p.quantity)}</span></li>)}</ul>}</div>
          <div><p className={small}>{t('dayEnd.stockLeft')}</p>{s.stock.length === 0 ? <p className="mt-1 text-xs text-[#a0aaa2]">{t('dayEnd.nothing')}</p> : <ul className="mt-1 space-y-0.5 text-xs">{s.stock.map(l => <li key={l.name} className="flex justify-between gap-2"><span>{l.name}</span><span className={`font-semibold ${l.quantity < 0 ? 'text-[#b4472c]' : ''}`}>{amount(l.quantity)} {unit(l.unit)}</span></li>)}</ul>}</div>
          {s.ownersShare.length > 0 && <div><p className={small}>{t('dayEnd.shareTitle')}</p><ul className="mt-1 space-y-0.5 text-xs">{s.ownersShare.map((o, i) => <li key={i}>{o.item}{o.quantity && <span className="text-[#89938b]"> · {o.quantity}</span>}{o.takenBy && <span className="text-[#89938b]"> · {t('dayEnd.takenBy', { name: o.takenBy })}</span>}</li>)}</ul></div>}
        </div>
      </section>)}</div>}

      {report.unassignedSales && <div className="mt-4 rounded-2xl border border-dashed border-[#e3c9a8] bg-[#fffaf3] p-4 text-xs print:break-inside-avoid"><p className="font-semibold text-[#8a5a24]">{t('dayEnd.unassigned')}: {taka(report.unassignedSales.sales)} · {t('dayEnd.itemsSold', { count: report.unassignedSales.itemsSold })}</p><p className="mt-0.5 text-[#a0805a]">{t('dayEnd.unassignedHint')}</p></div>}

      <div className="mt-8 grid gap-4 lg:grid-cols-2 print:grid-cols-2">
        <section className={card}><h3 className="flex items-center gap-2 text-sm font-bold"><Warehouse className="size-4 text-[#8a5a24]" /> {t('dayEnd.motherStock')}</h3>{report.motherStock.length === 0 ? <p className="mt-2 text-xs text-[#a0aaa2]">{t('dayEnd.nothing')}</p> : <table className="mt-2 w-full text-xs"><tbody>{report.motherStock.map(l => <tr key={l.name} className="border-b border-[#f0f2ef] last:border-0"><td className="py-1.5">{l.name}</td><td className={`py-1.5 text-right font-semibold ${l.quantity < 0 ? 'text-[#b4472c]' : ''}`}>{amount(l.quantity)} {unit(l.unit)}</td><td className="py-1.5 pl-3 text-right text-[#89938b]">{taka(l.value)}</td></tr>)}</tbody><tfoot><tr><td className="pt-2 font-semibold">{t('dayEnd.value')}</td><td /><td className="pt-2 text-right font-bold">{taka(report.motherStock.reduce((sum, l) => sum + l.value, 0))}</td></tr></tfoot></table>}</section>
        <section className={card}><h3 className="text-sm font-bold">{t('dayEnd.ownersShareAll')}</h3>{shares.length === 0 ? <p className="mt-2 text-xs text-[#a0aaa2]">{t('dayEnd.nothing')}</p> : <ul className="mt-2 space-y-1 text-xs">{shares.map((o, i) => <li key={i} className="flex justify-between gap-2 border-b border-[#f0f2ef] pb-1 last:border-0"><span>{o.item}{o.quantity && <span className="text-[#89938b]"> · {o.quantity}</span>}<span className="text-[#a0aaa2]"> · {o.section}</span></span>{o.takenBy && <span className="text-[#5f6b62]">{o.takenBy}</span>}</li>)}</ul>}</section>
      </div>
    </>

  return <div className="max-w-5xl">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[.17em] text-[#bc7843] print:hidden">{t('dayEnd.eyebrow')}</p><h2 className="font-serif text-3xl font-bold tracking-tight">{t('dayEnd.title')}</h2><p className="mt-1 text-sm font-semibold text-[#5f6b62]">{formatDay(date, locale, true)}</p></div><div className="flex gap-2 print:hidden"><button onClick={load} aria-label={t('dayEnd.refresh')} className="flex size-10 items-center justify-center rounded-xl border border-[#e0e5df] bg-white text-[#68756b] hover:bg-[#f5f7f4]"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button><button onClick={() => setPrinting(true)} disabled={!report} className="flex items-center gap-2 rounded-xl border border-[#e0e5df] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#5f6b62] hover:bg-[#f5f7f4] disabled:opacity-50"><Printer className="size-4" /> {t('dayEnd.print')}</button></div></div>

    <div className="flex flex-wrap items-center gap-1.5 print:hidden"><button onClick={() => setDate(today)} className={chip(date === today)}>{t('dates.presets.today')}</button><button onClick={() => setDate(addDays(today, -1))} className={chip(date === addDays(today, -1))}>{t('dates.presets.yesterday')}</button><label className="sr-only" htmlFor="de-date">{t('daily.date')}</label><input id="de-date" type="date" max={today} value={date} onChange={e => e.target.value && setDate(e.target.value)} className="h-9 rounded-full border border-[#e2e7e1] bg-white px-3 text-xs font-medium outline-none focus:border-[#8eaf9b]" /></div>

    {error && <p role="alert" className="mt-5 rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{error}</p>}

    {loading && !report ? <div className="mt-10 flex justify-center text-[#87928a]"><Loader2 className="size-6 animate-spin" /></div> : sheet}

    {/* Only .print-root is printed (see globals.css), so the report is copied there while printing. */}
    {printing && report && createPortal(<div className="print-root hidden text-[#202521] print:block"><h1 className="text-xl font-bold">{t('dayEnd.title')} · {formatDay(date, locale, true)}</h1>{sheet}</div>, document.body)}
  </div>
}

function Tile({ label, value, note, tone }: { label: string; value: string; note: string; tone: string }) {
  return <div className="rounded-2xl border border-[#e3e8e1] bg-white p-4 print:rounded-none print:border-[#ccc] print:p-2"><p className="text-xs font-medium text-[#87928a]">{label}</p><p className={`mt-1 font-serif text-2xl font-bold tracking-tight ${tone}`}>{value}</p><p className="mt-1 text-[11px] text-[#9aa39c]">{note}</p></div>
}
