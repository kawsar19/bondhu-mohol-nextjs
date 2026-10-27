'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Armchair, Loader2, Pencil, Plus, RefreshCw, Trash2, Users, X } from 'lucide-react'
import { useT } from '@/components/i18n-provider'
import type { TFunction } from '@/lib/i18n'

const STATUSES = ['Available', 'Occupied', 'Reserved'] as const
const STATUS_KEY = { Available: 'common.tableStatus.Available', Occupied: 'common.tableStatus.Occupied', Reserved: 'common.tableStatus.Reserved' } as const
type Status = (typeof STATUSES)[number]
type DiningTable = { _id: string; number: number; name: string; capacity: number; status: Status; isActive: boolean }
type FormState = { number: string; name: string; capacity: string; status: Status; isActive: boolean }

const emptyForm: FormState = { number: '', name: '', capacity: '4', status: 'Available', isActive: true }
const statusStyles: Record<Status, string> = { Available: 'bg-emerald-50 text-emerald-700', Occupied: 'bg-orange-50 text-orange-700', Reserved: 'bg-blue-50 text-blue-700' }

async function api<T>(t: TFunction, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) window.location.href = '/admin/login'
  if (!res.ok) throw new Error(data.error ?? t('common.somethingWentWrong'))
  return data as T
}

export function TablesManager() {
  const t = useT()
  const [tables, setTables] = useState<DiningTable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<DiningTable | 'new' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setTables((await api<{ tables: DiningTable[] }>(t, '/api/tables')).tables)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('tables.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  const visible = tables
  const counts = useMemo(() => ({ total: tables.length, available: tables.filter(t => t.status === 'Available' && t.isActive).length, occupied: tables.filter(t => t.status === 'Occupied').length, seats: tables.filter(t => t.isActive).reduce((sum, t) => sum + t.capacity, 0) }), [tables])

  const patch = async (table: DiningTable, changes: Partial<DiningTable>) => {
    setBusyId(table._id)
    setError('')
    try {
      const { table: updated } = await api<{ table: DiningTable }>(t, `/api/tables/${table._id}`, { method: 'PATCH', body: JSON.stringify(changes) })
      setTables(current => current.map(t => t._id === updated._id ? updated : t))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('tables.updateFailed'))
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (table: DiningTable) => {
    setBusyId(table._id)
    setError('')
    try {
      await api(t, `/api/tables/${table._id}`, { method: 'DELETE' })
      setTables(current => current.filter(t => t._id !== table._id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('tables.deleteFailed'))
    } finally {
      setBusyId(null)
      setConfirmDelete(null)
    }
  }

  const saved = (table: DiningTable) => {
    setTables(current => (current.some(t => t._id === table._id) ? current.map(t => t._id === table._id ? table : t) : [...current, table]).sort((a, b) => a.number - b.number))
    setEditing(null)
  }

  return <div>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[.17em] text-[#bc7843]">{t('tables.eyebrow')}</p><h2 className="font-serif text-3xl font-bold tracking-tight">{t('tables.title')}</h2></div><div className="flex gap-2"><button onClick={load} aria-label={t('tables.refresh')} className="flex size-10 items-center justify-center rounded-xl border border-[#e0e5df] bg-white text-[#68756b] hover:bg-[#f5f7f4]"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button><button onClick={() => setEditing('new')} className="flex items-center gap-2 rounded-xl bg-[#174d3c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123f31]"><Plus className="size-4" /> {t('tables.add')}</button></div></div>

    <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <Stat label={t('tables.stats.total')} value={counts.total} />
      <Stat label={t('tables.stats.available')} value={counts.available} />
      <Stat label={t('tables.stats.occupied')} value={counts.occupied} warm />
      <Stat label={t('tables.stats.seats')} value={counts.seats} />
    </section>

    {error && <p role="alert" className="mt-5 rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{error}</p>}

    {loading && tables.length === 0 ? <div className="mt-10 flex justify-center text-[#87928a]"><Loader2 className="size-6 animate-spin" /></div>
      : visible.length === 0 ? <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-[#d9e0d8] bg-white px-6 py-14 text-center"><Armchair className="size-10 text-[#c7d1c7]" /><p className="mt-4 font-semibold">{t('tables.emptyTitle')}</p><p className="mt-1 text-xs text-[#89938b]">{t('tables.emptyHint')}</p><button onClick={() => setEditing('new')} className="mt-5 flex items-center gap-2 rounded-xl bg-[#eef4ed] px-4 py-2.5 text-xs font-bold text-[#174d3c] hover:bg-[#dfece0]"><Plus className="size-4" /> {t('tables.add')}</button></div>
      : <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{visible.map(table => <article key={table._id} className={`rounded-2xl border border-[#e3e8e1] bg-white p-5 transition ${table.isActive ? '' : 'opacity-60'}`}>
        <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className={`flex size-12 items-center justify-center rounded-xl font-serif text-lg font-bold bg-[#eaf2eb] text-[#174d3c]`}>{String(table.number).padStart(2, '0')}</div><div><p className="text-sm font-semibold">{table.name || t('common.table', { number: String(table.number).padStart(2, '0') })}</p><p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#8a968d]"><Users className="size-3" /> {t(table.capacity === 1 ? 'tables.seatOne' : 'tables.seatMany', { count: table.capacity })}</p></div></div><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[table.status]}`}><span className="size-1.5 rounded-full bg-current" />{t(STATUS_KEY[table.status])}</span></div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`status-${table._id}`}>{t('tables.status')}</label>
          <select id={`status-${table._id}`} value={table.status} disabled={busyId === table._id} onChange={e => patch(table, { status: e.target.value as Status })} className="h-9 flex-1 rounded-lg border border-[#e2e7e1] bg-[#fbfcfb] px-2 text-xs font-medium outline-none focus:border-[#8eaf9b]">{STATUSES.map(s => <option key={s} value={s}>{t(STATUS_KEY[s])}</option>)}</select>
          <button onClick={() => patch(table, { isActive: !table.isActive })} disabled={busyId === table._id} className="h-9 rounded-lg border border-[#e2e7e1] px-3 text-xs font-medium text-[#68756b] hover:bg-[#f5f7f4]">{table.isActive ? t('tables.disable') : t('tables.enable')}</button>
          <button onClick={() => setEditing(table)} aria-label={t('tables.editLabel', { number: table.number })} className="flex size-9 items-center justify-center rounded-lg border border-[#e2e7e1] text-[#68756b] hover:bg-[#f5f7f4]"><Pencil className="size-3.5" /></button>
          <button onClick={() => setConfirmDelete(table._id)} aria-label={t('tables.deleteLabel', { number: table.number })} className="flex size-9 items-center justify-center rounded-lg border border-[#e2e7e1] text-[#b4472c] hover:bg-[#fdf0ec]"><Trash2 className="size-3.5" /></button>
        </div>
        {confirmDelete === table._id && <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-[#fdf0ec] px-3 py-2.5"><p className="text-xs font-medium text-[#b4472c]">{t('tables.confirmDelete')}</p><div className="flex gap-1.5"><button onClick={() => setConfirmDelete(null)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#68756b] hover:bg-white">{t('common.cancel')}</button><button onClick={() => remove(table)} disabled={busyId === table._id} className="rounded-lg bg-[#b4472c] px-2.5 py-1.5 text-xs font-semibold text-white">{t('common.delete')}</button></div></div>}
      </article>)}</div>}

    {editing && <TableForm table={editing === 'new' ? null : editing} nextNumber={Math.max(0, ...tables.map(t => t.number)) + 1} onClose={() => setEditing(null)} onSaved={saved} />}
  </div>
}

function TableForm({ table, nextNumber, onClose, onSaved }: { table: DiningTable | null; nextNumber: number; onClose: () => void; onSaved: (table: DiningTable) => void }) {
  const [form, setForm] = useState<FormState>(table ? { number: String(table.number), name: table.name, capacity: String(table.capacity), status: table.status, isActive: table.isActive } : { ...emptyForm, number: String(nextNumber) })
  const t = useT()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(current => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const body = JSON.stringify({ ...form, number: Number(form.number), capacity: Number(form.capacity) })
      const { table: result } = table
        ? await api<{ table: DiningTable }>(t, `/api/tables/${table._id}`, { method: 'PATCH', body })
        : await api<{ table: DiningTable }>(t, '/api/tables', { method: 'POST', body })
      onSaved(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('tables.saveFailed'))
      setSaving(false)
    }
  }

  const input = 'mt-1.5 h-11 w-full rounded-xl border border-[#e2e7e1] bg-[#fbfcfb] px-3 text-sm outline-none focus:border-[#8eaf9b]'
  const label = 'block text-xs font-semibold text-[#5f6b62]'

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#202521]/30 p-0 sm:items-center sm:p-4" onClick={onClose}>
    <form onSubmit={submit} onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl">
      <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.16em] text-[#b86f3c]">{table ? t('tables.form.editEyebrow') : t('tables.form.newEyebrow')}</p><h3 className="mt-1 font-serif text-2xl font-bold">{table ? t('common.table', { number: String(table.number).padStart(2, '0') }) : t('tables.form.addTitle')}</h3></div><button type="button" aria-label={t('common.close')} onClick={onClose} className="rounded-full p-2 hover:bg-[#f2f4f0]"><X className="size-5" /></button></div>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div><label className={label} htmlFor="t-number">{t('tables.form.number')}</label><input id="t-number" type="number" min={1} required value={form.number} onChange={e => set('number', e.target.value)} className={input} /></div>
        <div><label className={label} htmlFor="t-capacity">{t('tables.form.seats')}</label><input id="t-capacity" type="number" min={1} max={50} required value={form.capacity} onChange={e => set('capacity', e.target.value)} className={input} /></div>
        <div className="col-span-2"><label className={label} htmlFor="t-name">{t('tables.form.name')} <span className="font-normal text-[#a0aaa2]">{t('common.optional')}</span></label><input id="t-name" maxLength={60} placeholder={t('tables.form.namePlaceholder')} value={form.name} onChange={e => set('name', e.target.value)} className={input} /></div>
        <div className="col-span-2"><label className={label} htmlFor="t-status">{t('tables.form.status')}</label><select id="t-status" value={form.status} onChange={e => set('status', e.target.value as Status)} className={input}>{STATUSES.map(s => <option key={s} value={s}>{t(STATUS_KEY[s])}</option>)}</select></div>
        <label className="col-span-2 flex items-center gap-2.5 text-xs font-medium text-[#5f6b62]"><input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="size-4 accent-[#174d3c]" /> {t('tables.form.active')}</label>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-[#fdf0ec] px-3 py-2 text-xs font-medium text-[#b4472c]">{error}</p>}
      <div className="mt-6 flex gap-2"><button type="button" onClick={onClose} className="h-11 flex-1 rounded-xl border border-[#e2e7e1] text-sm font-semibold text-[#68756b] hover:bg-[#f5f7f4]">{t('common.cancel')}</button><button disabled={saving} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#174d3c] text-sm font-semibold text-white hover:bg-[#123f31] disabled:opacity-70">{saving && <Loader2 className="size-4 animate-spin" />}{table ? t('common.saveChanges') : t('tables.add')}</button></div>
    </form>
  </div>
}

function Stat({ label, value, warm }: { label: string; value: number; warm?: boolean }) {
  return <div className="rounded-2xl border border-[#e3e8e1] bg-white p-5"><p className="text-xs font-medium text-[#87928a]">{label}</p><p className={`mt-1 font-serif text-2xl font-bold tracking-tight ${warm ? 'text-[#c7773d]' : ''}`}>{value}</p></div>
}
