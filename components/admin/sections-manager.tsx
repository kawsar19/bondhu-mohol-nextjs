'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, ChefHat, Eye, EyeOff, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useT } from '@/components/i18n-provider'
import type { TFunction } from '@/lib/i18n'

export type KitchenSection = { _id: string; name: string; sortOrder: number; isActive: boolean; itemCount: number }

async function api<T>(t: TFunction, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) window.location.href = '/admin/login'
  if (!res.ok) throw new Error(data.error ?? t('common.somethingWentWrong'))
  return data as T
}

export function SectionsManager() {
  const t = useT()
  const [sections, setSections] = useState<KitchenSection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setSections((await api<{ sections: KitchenSection[] }>(t, '/api/sections')).sections)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sections.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  const run = async (id: string, action: () => Promise<void>) => {
    setBusyId(id)
    setError('')
    try { await action() } catch (err) { setError(err instanceof Error ? err.message : t('common.somethingWentWrong')) } finally { setBusyId(null) }
  }
  const replace = (s: KitchenSection) => setSections(current => current.map(x => x._id === s._id ? s : x).sort((a, b) => a.sortOrder - b.sortOrder))
  const patch = (s: KitchenSection, body: Partial<KitchenSection>) => api<{ section: KitchenSection }>(t, `/api/sections/${s._id}`, { method: 'PATCH', body: JSON.stringify(body) }).then(r => replace(r.section))

  const add = (event: FormEvent) => {
    event.preventDefault()
    run('new', async () => {
      const { section } = await api<{ section: KitchenSection }>(t, '/api/sections', { method: 'POST', body: JSON.stringify({ name: adding }) })
      setSections(current => [...current, section])
      setAdding('')
    })
  }
  const rename = (s: KitchenSection) => run(s._id, async () => { await patch(s, { name: draft }); setEditingId(null) })
  const remove = (s: KitchenSection) => run(s._id, async () => {
    await api(t, `/api/sections/${s._id}`, { method: 'DELETE' })
    setSections(current => current.filter(x => x._id !== s._id))
  })
  // Swaps places with the neighbour above or below.
  const move = (index: number, step: -1 | 1) => {
    const a = sections[index]
    const b = sections[index + step]
    if (!b) return
    run(a._id, async () => { await Promise.all([patch(a, { sortOrder: b.sortOrder }), patch(b, { sortOrder: a.sortOrder })]) })
  }

  const iconButton = 'flex size-9 items-center justify-center rounded-lg text-[#68756b] hover:bg-[#f5f7f4] disabled:cursor-not-allowed disabled:opacity-30'

  return <div>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[.17em] text-[#bc7843]">{t('sections.eyebrow')}</p><h2 className="font-serif text-3xl font-bold tracking-tight">{t('sections.title')}</h2><p className="mt-1 max-w-xl text-xs text-[#89938b]">{t('sections.subtitle')}</p></div><button onClick={load} aria-label={t('sections.refresh')} className="flex size-10 items-center justify-center rounded-xl border border-[#e0e5df] bg-white text-[#68756b] hover:bg-[#f5f7f4]"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button></div>

    <form onSubmit={add} className="flex max-w-2xl gap-2"><label className="sr-only" htmlFor="section-new">{t('sections.name')}</label><input id="section-new" required maxLength={40} placeholder={t('sections.namePlaceholder')} value={adding} onChange={e => setAdding(e.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-[#e2e7e1] bg-white px-3 text-sm outline-none focus:border-[#8eaf9b]" /><button disabled={busyId === 'new'} className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#174d3c] px-4 text-sm font-semibold text-white hover:bg-[#123f31] disabled:opacity-70">{busyId === 'new' ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} {t('sections.add')}</button></form>

    {error && <p role="alert" className="mt-5 max-w-2xl rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{error}</p>}

    {loading && sections.length === 0 ? <div className="mt-10 flex justify-center text-[#87928a]"><Loader2 className="size-6 animate-spin" /></div>
      : sections.length === 0 ? <div className="mt-6 flex max-w-2xl flex-col items-center rounded-2xl border border-dashed border-[#d9e0d8] bg-white px-6 py-14 text-center"><ChefHat className="size-10 text-[#c7d1c7]" /><p className="mt-4 font-semibold">{t('sections.emptyTitle')}</p><p className="mt-1 text-xs text-[#89938b]">{t('sections.emptyHint')}</p></div>
      : <ul className="mt-5 max-w-2xl divide-y divide-[#f0f2ef] rounded-2xl border border-[#e3e8e1] bg-white px-4">{sections.map((s, i) => <li key={s._id} className="py-3">
        {editingId === s._id ? <form onSubmit={e => { e.preventDefault(); rename(s) }} className="flex gap-2"><label className="sr-only" htmlFor={`section-name-${s._id}`}>{t('sections.name')}</label><input id={`section-name-${s._id}`} autoFocus required maxLength={40} value={draft} onChange={e => setDraft(e.target.value)} className="h-9 min-w-0 flex-1 rounded-lg border border-[#e2e7e1] px-2.5 text-sm outline-none focus:border-[#8eaf9b]" /><button type="button" onClick={() => setEditingId(null)} className="rounded-lg px-3 text-xs font-semibold text-[#68756b] hover:bg-[#f5f7f4]">{t('common.cancel')}</button><button disabled={busyId === s._id} className="rounded-lg bg-[#174d3c] px-3 text-xs font-semibold text-white">{t('common.save')}</button></form>
          : <div className="flex items-center gap-1">
            <div className={`min-w-0 flex-1 ${s.isActive ? '' : 'opacity-60'}`}><p className="text-sm font-semibold">{s.name}{!s.isActive && <span className="ml-1.5 text-[11px] font-medium text-[#a0aaa2]">{t('sections.closed')}</span>}</p><p className="text-[11px] text-[#89938b]">{t(s.itemCount === 1 ? 'sections.itemOne' : 'sections.itemMany', { count: s.itemCount })}</p></div>
            <button onClick={() => move(i, -1)} disabled={i === 0 || busyId !== null} aria-label={t('sections.moveUp', { name: s.name })} className={iconButton}><ArrowUp className="size-3.5" /></button>
            <button onClick={() => move(i, 1)} disabled={i === sections.length - 1 || busyId !== null} aria-label={t('sections.moveDown', { name: s.name })} className={iconButton}><ArrowDown className="size-3.5" /></button>
            <button onClick={() => { setEditingId(s._id); setDraft(s.name) }} aria-label={t('sections.rename', { name: s.name })} className={iconButton}><Pencil className="size-3.5" /></button>
            <button onClick={() => run(s._id, () => patch(s, { isActive: !s.isActive }))} disabled={busyId === s._id} aria-label={s.isActive ? t('sections.close', { name: s.name }) : t('sections.open', { name: s.name })} title={s.isActive ? t('sections.closeHint') : t('sections.openHint')} className={iconButton}>{s.isActive ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</button>
            <button onClick={() => remove(s)} disabled={s.itemCount > 0 || busyId === s._id} aria-label={t('sections.deleteLabel', { name: s.name })} title={s.itemCount > 0 ? t('sections.inUseCloseInstead') : t('common.delete')} className={`${iconButton} text-[#b4472c] hover:bg-[#fdf0ec]`}><Trash2 className="size-3.5" /></button>
          </div>}
      </li>)}</ul>}
  </div>
}
