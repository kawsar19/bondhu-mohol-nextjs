'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Eye, EyeOff, Loader2, Package, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { useT } from '@/components/i18n-provider'
import type { TFunction } from '@/lib/i18n'

const UNITS = ['kg', 'litre', 'piece', 'packet'] as const
type Unit = (typeof UNITS)[number]
type Ingredient = { _id: string; name: string; unit: Unit; isActive: boolean }
type Draft = { name: string; unit: Unit }

async function api<T>(t: TFunction, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) window.location.href = '/admin/login'
  if (!res.ok) throw new Error(data.error ?? t('common.somethingWentWrong'))
  return data as T
}

const byName = (a: Ingredient, b: Ingredient) => a.name.localeCompare(b.name)

export function IngredientsManager() {
  const t = useT()
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState<Draft>({ name: '', unit: 'kg' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>({ name: '', unit: 'kg' })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setIngredients((await api<{ ingredients: Ingredient[] }>(t, '/api/ingredients')).ingredients)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ingredients.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? ingredients.filter(i => i.name.toLowerCase().includes(q)) : ingredients
  }, [ingredients, search])

  const run = async (id: string, action: () => Promise<void>) => {
    setBusyId(id)
    setError('')
    try { await action() } catch (err) { setError(err instanceof Error ? err.message : t('common.somethingWentWrong')) } finally { setBusyId(null) }
  }
  const patch = (i: Ingredient, body: Partial<Ingredient>) => run(i._id, async () => {
    const { ingredient } = await api<{ ingredient: Ingredient }>(t, `/api/ingredients/${i._id}`, { method: 'PATCH', body: JSON.stringify(body) })
    setIngredients(current => current.map(x => x._id === ingredient._id ? ingredient : x).sort(byName))
    setEditingId(null)
  })
  const remove = (i: Ingredient) => run(i._id, async () => {
    await api(t, `/api/ingredients/${i._id}`, { method: 'DELETE' })
    setIngredients(current => current.filter(x => x._id !== i._id))
    setConfirmDelete(null)
  })
  const add = (event: FormEvent) => {
    event.preventDefault()
    run('new', async () => {
      const { ingredient } = await api<{ ingredient: Ingredient }>(t, '/api/ingredients', { method: 'POST', body: JSON.stringify(adding) })
      setIngredients(current => [...current, ingredient].sort(byName))
      // Keep the unit: the next item off the bazar list is often counted the same way.
      setAdding(a => ({ ...a, name: '' }))
    })
  }

  const field = 'h-11 rounded-xl border border-[#e2e7e1] bg-white px-3 text-sm outline-none focus:border-[#8eaf9b]'
  const small = 'h-9 rounded-lg border border-[#e2e7e1] bg-white px-2.5 text-sm outline-none focus:border-[#8eaf9b]'
  const iconButton = 'flex size-9 items-center justify-center rounded-lg text-[#68756b] hover:bg-[#f5f7f4] disabled:opacity-30'
  const unitOptions = UNITS.map(u => <option key={u} value={u}>{t(`ingredients.units.${u}`)}</option>)

  return <div>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[.17em] text-[#bc7843]">{t('ingredients.eyebrow')}</p><h2 className="font-serif text-3xl font-bold tracking-tight">{t('ingredients.title')}</h2><p className="mt-1 max-w-xl text-xs text-[#89938b]">{t('ingredients.subtitle')}</p></div><button onClick={load} aria-label={t('ingredients.refresh')} className="flex size-10 items-center justify-center rounded-xl border border-[#e0e5df] bg-white text-[#68756b] hover:bg-[#f5f7f4]"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button></div>

    <form onSubmit={add} className="flex max-w-2xl flex-wrap gap-2"><label className="sr-only" htmlFor="ing-new-name">{t('ingredients.name')}</label><input id="ing-new-name" required maxLength={40} placeholder={t('ingredients.namePlaceholder')} value={adding.name} onChange={e => setAdding(a => ({ ...a, name: e.target.value }))} className={`${field} min-w-0 flex-1`} /><label className="sr-only" htmlFor="ing-new-unit">{t('ingredients.unit')}</label><select id="ing-new-unit" value={adding.unit} onChange={e => setAdding(a => ({ ...a, unit: e.target.value as Unit }))} className={field}>{unitOptions}</select><button disabled={busyId === 'new'} className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#174d3c] px-4 text-sm font-semibold text-white hover:bg-[#123f31] disabled:opacity-70">{busyId === 'new' ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} {t('ingredients.add')}</button></form>

    {ingredients.length > 8 && <div className="relative mt-4 max-w-xs"><Search className="absolute left-3 top-2.5 size-4 text-[#a0aaa2]" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('ingredients.searchPlaceholder')} aria-label={t('ingredients.searchPlaceholder')} className="h-9 w-full rounded-lg border border-[#e2e7e1] bg-white pl-9 pr-3 text-xs outline-none focus:border-[#8eaf9b]" /></div>}

    {error && <p role="alert" className="mt-5 max-w-2xl rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{error}</p>}

    {loading && ingredients.length === 0 ? <div className="mt-10 flex justify-center text-[#87928a]"><Loader2 className="size-6 animate-spin" /></div>
      : ingredients.length === 0 ? <div className="mt-6 flex max-w-2xl flex-col items-center rounded-2xl border border-dashed border-[#d9e0d8] bg-white px-6 py-14 text-center"><Package className="size-10 text-[#c7d1c7]" /><p className="mt-4 font-semibold">{t('ingredients.emptyTitle')}</p><p className="mt-1 text-xs text-[#89938b]">{t('ingredients.emptyHint')}</p></div>
      : visible.length === 0 ? <p className="mt-8 text-sm text-[#89938b]">{t('ingredients.noMatch')}</p>
      : <ul className="mt-5 max-w-2xl divide-y divide-[#f0f2ef] rounded-2xl border border-[#e3e8e1] bg-white px-4">{visible.map(i => <li key={i._id} className="py-3">
        {editingId === i._id ? <form onSubmit={e => { e.preventDefault(); patch(i, draft) }} className="flex flex-wrap gap-2"><label className="sr-only" htmlFor={`ing-name-${i._id}`}>{t('ingredients.name')}</label><input id={`ing-name-${i._id}`} autoFocus required maxLength={40} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} className={`${small} min-w-0 flex-1`} /><label className="sr-only" htmlFor={`ing-unit-${i._id}`}>{t('ingredients.unit')}</label><select id={`ing-unit-${i._id}`} value={draft.unit} onChange={e => setDraft(d => ({ ...d, unit: e.target.value as Unit }))} className={small}>{unitOptions}</select><button type="button" onClick={() => setEditingId(null)} className="rounded-lg px-3 text-xs font-semibold text-[#68756b] hover:bg-[#f5f7f4]">{t('common.cancel')}</button><button disabled={busyId === i._id} className="rounded-lg bg-[#174d3c] px-3 text-xs font-semibold text-white">{t('common.save')}</button></form>
          : <div className="flex items-center gap-1">
            <div className={`flex min-w-0 flex-1 items-center gap-2 ${i.isActive ? '' : 'opacity-60'}`}><p className="truncate text-sm font-semibold">{i.name}</p><span className="rounded-full bg-[#f3efe6] px-2 py-0.5 text-[11px] font-semibold text-[#8a5a24]">{t(`ingredients.units.${i.unit}`)}</span>{!i.isActive && <span className="text-[11px] font-medium text-[#a0aaa2]">{t('ingredients.hidden')}</span>}</div>
            {confirmDelete === i._id ? <div className="flex gap-1.5"><button onClick={() => setConfirmDelete(null)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#68756b] hover:bg-[#f5f7f4]">{t('common.cancel')}</button><button onClick={() => remove(i)} disabled={busyId === i._id} className="rounded-lg bg-[#b4472c] px-2.5 py-1.5 text-xs font-semibold text-white">{t('common.delete')}</button></div>
              : <>
                <button onClick={() => { setEditingId(i._id); setDraft({ name: i.name, unit: i.unit }) }} aria-label={t('ingredients.edit', { name: i.name })} className={iconButton}><Pencil className="size-3.5" /></button>
                <button onClick={() => patch(i, { isActive: !i.isActive })} disabled={busyId === i._id} aria-label={i.isActive ? t('ingredients.hide', { name: i.name }) : t('ingredients.show', { name: i.name })} title={i.isActive ? t('ingredients.hideHint') : t('ingredients.showHint')} className={iconButton}>{i.isActive ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</button>
                <button onClick={() => setConfirmDelete(i._id)} aria-label={t('ingredients.deleteLabel', { name: i.name })} className={`${iconButton} text-[#b4472c] hover:bg-[#fdf0ec]`}><Trash2 className="size-3.5" /></button>
              </>}
          </div>}
      </li>)}</ul>}
  </div>
}
