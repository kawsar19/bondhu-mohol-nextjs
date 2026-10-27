'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import { AlertTriangle, Check, Download, Grid2X2, Loader2, Printer, QrCode } from 'lucide-react'

type DiningTable = { _id: string; number: number; name: string; isActive: boolean }
// `null` is the counter/takeaway code, which opens the menu without a table.
type Target = { key: string; table: number | null; title: string; subtitle: string }

const BASE_KEY = 'bm_qr_base'
const pad = (n: number) => String(n).padStart(2, '0')

function defaultBase() {
  try { const saved = localStorage.getItem(BASE_KEY); if (saved) return saved } catch { /* storage blocked */ }
  return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
}

function linkFor(base: string, table: number | null) {
  const root = base.replace(/\/+$/, '')
  return table ? `${root}/?table=${table}` : `${root}/`
}

export function QrManager({ onGoToTables }: { onGoToTables: () => void }) {
  const [tables, setTables] = useState<DiningTable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [base, setBase] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [codes, setCodes] = useState<Record<string, string>>({})
  const [printing, setPrinting] = useState<Target[] | null>(null)

  useEffect(() => { setBase(defaultBase()) }, [])

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/tables', { cache: 'no-store' })
        if (res.status === 401) { window.location.href = '/admin/login'; return }
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Could not load tables')
        setTables(data.tables)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load tables')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const targets = useMemo<Target[]>(() => [
    { key: 'counter', table: null, title: 'Order here', subtitle: 'Counter & takeaway' },
    ...tables.filter(t => t.isActive).map(t => ({ key: t._id, table: t.number, title: `Table ${pad(t.number)}`, subtitle: t.name })),
  ], [tables])

  // Select every table by default once loaded.
  useEffect(() => { setSelected(new Set(targets.filter(t => t.table !== null).map(t => t.key))) }, [targets])

  const baseValid = /^https?:\/\/[^\s/]+/i.test(base)
  const isLocal = /^https?:\/\/(localhost|127\.|0\.0\.0\.0)/i.test(base)

  // Regenerate the codes whenever the link changes.
  useEffect(() => {
    if (!baseValid) return
    let cancelled = false
    Promise.all(targets.map(async t => [t.key, await QRCode.toString(linkFor(base, t.table), { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#111814', light: '#ffffff' } })] as const))
      .then(entries => { if (!cancelled) setCodes(Object.fromEntries(entries)) })
    return () => { cancelled = true }
  }, [base, baseValid, targets])

  const saveBase = (value: string) => {
    setBase(value)
    try { localStorage.setItem(BASE_KEY, value) } catch { /* storage blocked */ }
  }

  const toggle = (key: string) => setSelected(current => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next })
  const allSelected = targets.length > 0 && targets.every(t => selected.has(t.key))

  const print = useCallback((list: Target[]) => setPrinting(list), [])
  // Print once the sheet is in the DOM, then remove it.
  useEffect(() => {
    if (!printing) return
    const done = () => setPrinting(null)
    window.addEventListener('afterprint', done, { once: true })
    const timer = setTimeout(() => window.print(), 50)
    return () => { clearTimeout(timer); window.removeEventListener('afterprint', done) }
  }, [printing])

  const download = async (target: Target) => {
    const url = await QRCode.toDataURL(linkFor(base, target.table), { width: 1024, margin: 2, errorCorrectionLevel: 'M' })
    const a = document.createElement('a')
    a.href = url
    a.download = target.table ? `bondhu-mohol-table-${pad(target.table)}.png` : 'bondhu-mohol-counter.png'
    a.click()
  }

  const chosen = targets.filter(t => selected.has(t.key))

  return <div>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[.17em] text-[#bc7843]">QR ordering</p><h2 className="font-serif text-3xl font-bold tracking-tight">Table QR codes</h2></div><button onClick={() => print(chosen)} disabled={chosen.length === 0 || !baseValid} className="flex items-center gap-2 rounded-xl bg-[#174d3c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123f31] disabled:opacity-50"><Printer className="size-4" /> Print {chosen.length > 0 ? `${chosen.length} ${chosen.length === 1 ? 'card' : 'cards'}` : ''}</button></div>

    <section className="rounded-2xl border border-[#e3e8e1] bg-white p-5">
      <label htmlFor="qr-base" className="block text-xs font-semibold text-[#5f6b62]">Menu link (your website address)</label>
      <input id="qr-base" value={base} onChange={e => saveBase(e.target.value.trim())} placeholder="https://bondhumohol.com" className="mt-1.5 h-11 w-full max-w-xl rounded-xl border border-[#e2e7e1] bg-[#fbfcfb] px-3 text-sm outline-none focus:border-[#8eaf9b]" />
      <p className="mt-2 text-xs text-[#87928a]">Each table&apos;s code opens <span className="font-mono text-[#5f6b62]">{baseValid ? linkFor(base, 5) : '…'}</span> with the table filled in.</p>
      {!baseValid && <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#fdf0ec] px-3 py-2.5 text-xs font-medium text-[#b4472c]"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> Enter a full address starting with https://</p>}
      {baseValid && isLocal && <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#fff6e6] px-3 py-2.5 text-xs font-medium text-[#946013]"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> Guests&apos; phones can&apos;t open &quot;localhost&quot;. Use your live website address before printing. For testing on the same Wi-Fi, use this computer&apos;s network address (e.g. http://192.168.0.110:3000).</p>}
    </section>

    {error && <p role="alert" className="mt-5 rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{error}</p>}

    {loading ? <div className="mt-10 flex justify-center text-[#87928a]"><Loader2 className="size-6 animate-spin" /></div> : <>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold">{tables.length === 0 ? 'No tables yet' : `${chosen.length} of ${targets.length} selected`}</p><div className="flex gap-2">{tables.length === 0 && <button onClick={onGoToTables} className="flex items-center gap-2 rounded-xl bg-[#eef4ed] px-3.5 py-2 text-xs font-bold text-[#174d3c] hover:bg-[#dfece0]"><Grid2X2 className="size-4" /> Add tables</button>}{targets.length > 1 && <button onClick={() => setSelected(allSelected ? new Set() : new Set(targets.map(t => t.key)))} className="rounded-xl border border-[#e2e7e1] bg-white px-3.5 py-2 text-xs font-semibold text-[#5f6b62] hover:bg-[#f5f7f4]">{allSelected ? 'Clear selection' : 'Select all'}</button>}</div></div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{targets.map(target => { const on = selected.has(target.key); return <div key={target.key} className={`rounded-2xl border bg-white p-4 transition ${on ? 'border-[#174d3c] ring-1 ring-[#174d3c]' : 'border-[#e3e8e1]'}`}>
        <button onClick={() => toggle(target.key)} aria-pressed={on} className="block w-full text-left"><span className="mb-3 flex items-center gap-2 text-xs font-semibold text-[#5f6b62]"><span className={`flex size-5 items-center justify-center rounded-md border ${on ? 'border-[#174d3c] bg-[#174d3c] text-white' : 'border-[#cfd6ce]'}`}>{on && <Check className="size-3.5" />}</span>{on ? 'Will print' : 'Tap to include'}</span><QrCard target={target} svg={codes[target.key]} url={baseValid ? linkFor(base, target.table) : ''} /></button>
        <div className="mt-3 flex gap-2"><button onClick={() => print([target])} disabled={!baseValid} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#e2e7e1] text-xs font-semibold text-[#5f6b62] hover:bg-[#f5f7f4] disabled:opacity-50"><Printer className="size-3.5" /> Print</button><button onClick={() => download(target)} disabled={!baseValid} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#e2e7e1] text-xs font-semibold text-[#5f6b62] hover:bg-[#f5f7f4] disabled:opacity-50"><Download className="size-3.5" /> PNG</button></div>
      </div> })}</div>
    </>}

    {printing && createPortal(<div className="print-root hidden print:block"><div className="grid grid-cols-2 gap-[6mm]">{printing.map(target => <div key={target.key} className="break-inside-avoid rounded-[4mm] border border-dashed border-[#9aa39c] p-[6mm]"><QrCard target={target} svg={codes[target.key]} url={linkFor(base, target.table)} print /></div>)}</div></div>, document.body)}
  </div>
}

function QrCard({ target, svg, url, print }: { target: Target; svg?: string; url: string; print?: boolean }) {
  return <div className="flex flex-col items-center text-center text-[#202521]">
    <p className={`font-serif font-bold text-[#174d3c] ${print ? 'text-[16pt]' : 'text-base'}`}>Bondhu Mohol</p>
    <p className={`font-serif font-bold leading-tight ${print ? 'mt-[1mm] text-[30pt]' : 'mt-1 text-3xl'}`}>{target.title}</p>
    {target.subtitle && <p className={`text-[#87928a] ${print ? 'text-[10pt]' : 'text-[11px]'}`}>{target.subtitle}</p>}
    <div className={`my-3 flex aspect-square items-center justify-center bg-white ${print ? 'w-[55mm]' : 'w-40'}`}>{svg ? <div className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} /> : <QrCode className="size-10 text-[#d5dbd4]" />}</div>
    <p className={`font-bold ${print ? 'text-[15pt]' : 'text-sm'}`}>Scan to order</p>
    <p className={`font-semibold text-[#5f6b62] ${print ? 'text-[13pt]' : 'text-xs'}`}>স্ক্যান করে অর্ডার দিন</p>
    {url && <p className={`mt-1.5 break-all font-mono text-[#a0aaa2] ${print ? 'text-[7pt]' : 'text-[10px]'}`}>{url}</p>}
  </div>
}
