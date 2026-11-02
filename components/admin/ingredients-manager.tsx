'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AlertTriangle, BookOpen, Camera, Eye, EyeOff, Loader2, Package, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { useT } from '@/components/i18n-provider'
import type { TFunction } from '@/lib/i18n'
import { resizeImage } from '@/lib/resize-image'
import { IngredientCatalogPicker } from './ingredient-catalog-picker'

const UNITS = ['kg', 'litre', 'piece', 'packet'] as const
type Unit = (typeof UNITS)[number]
// `stock` is what the mother store has now.
type Ingredient = { _id: string; name: string; unit: Unit; isActive: boolean; lowStock: number | null; image: string; stock: number }
type Draft = { name: string; unit: Unit; lowStock: string; image: string }

const emptyDraft: Draft = { name: '', unit: 'kg', lowStock: '', image: '' }
const toBody = (d: Draft) => ({ name: d.name, unit: d.unit, lowStock: d.lowStock === '' ? null : Number(d.lowStock), image: d.image })
const amount = (n: number) => Number(n.toFixed(3)).toLocaleString('en-IN')
export const isLow = (i: { lowStock: number | null; stock: number; isActive: boolean }) => i.isActive && i.lowStock !== null && i.stock <= i.lowStock

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
  const [adding, setAdding] = useState<Draft>(emptyDraft)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [notice, setNotice] = useState('')

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
  const lowCount = ingredients.filter(isLow).length

  const run = async (id: string, action: () => Promise<void>) => {
    setBusyId(id)
    setError('')
    try { await action() } catch (err) { setError(err instanceof Error ? err.message : t('common.somethingWentWrong')) } finally { setBusyId(null) }
  }
  // Edits don't change stock, so the stock already shown is kept.
  const patch = (i: Ingredient, body: object) => run(i._id, async () => {
    const { ingredient } = await api<{ ingredient: Omit<Ingredient, 'stock'> }>(t, `/api/ingredients/${i._id}`, { method: 'PATCH', body: JSON.stringify(body) })
    setIngredients(current => current.map(x => x._id === ingredient._id ? { ...ingredient, stock: x.stock } : x).sort(byName))
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
      const { ingredient } = await api<{ ingredient: Ingredient }>(t, '/api/ingredients', { method: 'POST', body: JSON.stringify(toBody(adding)) })
      setIngredients(current => [...current, ingredient].sort(byName))
      // Keep the unit: the next item off the bazar list is often counted the same way.
      setAdding(a => ({ ...emptyDraft, unit: a.unit }))
    })
  }

  const iconButton = 'flex size-9 items-center justify-center rounded-lg text-[#68756b] hover:bg-[#f5f7f4] disabled:opacity-30'

  return <div>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[.17em] text-[#bc7843]">{t('ingredients.eyebrow')}</p><h2 className="font-serif text-3xl font-bold tracking-tight">{t('ingredients.title')}</h2><p className="mt-1 max-w-xl text-xs text-[#89938b]">{t('ingredients.subtitle')}</p></div><div className="flex gap-2"><button onClick={load} aria-label={t('ingredients.refresh')} className="flex size-10 items-center justify-center rounded-xl border border-[#e0e5df] bg-white text-[#68756b] hover:bg-[#f5f7f4]"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button><button onClick={() => setPicking(true)} className="flex h-10 items-center gap-2 rounded-xl border border-[#174d3c] bg-white px-4 text-sm font-semibold text-[#174d3c] hover:bg-[#f4f8f5]"><BookOpen className="size-4" /> {t('ingredients.catalog.open')}</button></div></div>

    <form onSubmit={add} className="max-w-2xl rounded-2xl border border-[#e3e8e1] bg-white p-3">
      <DraftFields idPrefix="ing-new" draft={adding} onChange={setAdding} onPhotoError={setError} />
      <div className="mt-3 flex justify-end"><button disabled={busyId === 'new'} className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#174d3c] px-4 text-sm font-semibold text-white hover:bg-[#123f31] disabled:opacity-70">{busyId === 'new' ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} {t('ingredients.add')}</button></div>
    </form>

    <div className="mt-4 flex flex-wrap items-center gap-3">
      {ingredients.length > 8 && <div className="relative w-full max-w-xs"><Search className="absolute left-3 top-2.5 size-4 text-[#a0aaa2]" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('ingredients.searchPlaceholder')} aria-label={t('ingredients.searchPlaceholder')} className="h-9 w-full rounded-lg border border-[#e2e7e1] bg-white pl-9 pr-3 text-xs outline-none focus:border-[#8eaf9b]" /></div>}
      {lowCount > 0 && <p className="flex items-center gap-1.5 rounded-full bg-[#fff0df] px-3 py-1.5 text-xs font-semibold text-[#a8622f]"><AlertTriangle className="size-3.5" /> {t('store.lowCount', { count: lowCount })}</p>}
    </div>

    {notice && <p role="status" className="mt-5 max-w-2xl rounded-xl bg-[#e9f4ec] px-4 py-3 text-xs font-medium text-[#2f7a55]">{notice}</p>}
    {picking && <IngredientCatalogPicker onClose={() => setPicking(false)} onAdded={result => { setPicking(false); setNotice(t('ingredients.catalog.done', { added: result.added })); load() }} />}
    {error && <p role="alert" className="mt-5 max-w-2xl rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{error}</p>}

    {loading && ingredients.length === 0 ? <div className="mt-10 flex justify-center text-[#87928a]"><Loader2 className="size-6 animate-spin" /></div>
      : ingredients.length === 0 ? <div className="mt-6 flex max-w-2xl flex-col items-center rounded-2xl border border-dashed border-[#d9e0d8] bg-white px-6 py-14 text-center"><Package className="size-10 text-[#c7d1c7]" /><p className="mt-4 font-semibold">{t('ingredients.emptyTitle')}</p><p className="mt-1 text-xs text-[#89938b]">{t('ingredients.emptyHint')}</p><button onClick={() => setPicking(true)} className="mt-4 flex h-10 items-center gap-2 rounded-xl bg-[#174d3c] px-4 text-sm font-semibold text-white hover:bg-[#123f31]"><BookOpen className="size-4" /> {t('ingredients.catalog.open')}</button></div>
      : visible.length === 0 ? <p className="mt-8 text-sm text-[#89938b]">{t('ingredients.noMatch')}</p>
      : <ul className="mt-5 max-w-2xl divide-y divide-[#f0f2ef] rounded-2xl border border-[#e3e8e1] bg-white px-4">{visible.map(i => {
        const unit = t(`ingredients.units.${i.unit}`)
        const low = isLow(i)
        return <li key={i._id} className="py-3">
          {editingId === i._id ? <form onSubmit={e => { e.preventDefault(); patch(i, toBody(draft)) }}>
            <DraftFields idPrefix={`ing-${i._id}`} draft={draft} onChange={setDraft} onPhotoError={setError} autoFocus />
            <div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => setEditingId(null)} className="h-9 rounded-lg px-3 text-xs font-semibold text-[#68756b] hover:bg-[#f5f7f4]">{t('common.cancel')}</button><button disabled={busyId === i._id} className="h-9 rounded-lg bg-[#174d3c] px-3 text-xs font-semibold text-white">{t('common.save')}</button></div>
          </form>
            : <div className="flex items-center gap-3">
              <Thumb image={i.image} name={i.name} />
              <div className={`min-w-0 flex-1 ${i.isActive ? '' : 'opacity-60'}`}>
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold"><span className="truncate">{i.name}</span><span className="rounded-full bg-[#f3efe6] px-2 py-0.5 text-[11px] font-semibold text-[#8a5a24]">{unit}</span>{low && <span className="flex items-center gap-1 rounded-full bg-[#fff0df] px-2 py-0.5 text-[11px] font-bold text-[#a8622f]"><AlertTriangle className="size-3" />{t('ingredients.lowStockBadge')}</span>}{!i.isActive && <span className="text-[11px] font-medium text-[#a0aaa2]">{t('ingredients.hidden')}</span>}</p>
                <p className={`mt-0.5 text-[11px] ${low ? 'font-semibold text-[#a8622f]' : 'text-[#89938b]'}`}>{t('ingredients.stockNow', { qty: amount(i.stock), unit })}{i.lowStock !== null && <span className="font-normal text-[#9aa39c]"> · {t('ingredients.warnAt', { qty: amount(i.lowStock), unit })}</span>}</p>
              </div>
              {confirmDelete === i._id ? <div className="flex gap-1.5"><button onClick={() => setConfirmDelete(null)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#68756b] hover:bg-[#f5f7f4]">{t('common.cancel')}</button><button onClick={() => remove(i)} disabled={busyId === i._id} className="rounded-lg bg-[#b4472c] px-2.5 py-1.5 text-xs font-semibold text-white">{t('common.delete')}</button></div>
                : <div className="flex">
                  <button onClick={() => { setEditingId(i._id); setDraft({ name: i.name, unit: i.unit, lowStock: i.lowStock === null ? '' : String(i.lowStock), image: i.image }) }} aria-label={t('ingredients.edit', { name: i.name })} className={iconButton}><Pencil className="size-3.5" /></button>
                  <button onClick={() => patch(i, { isActive: !i.isActive })} disabled={busyId === i._id} aria-label={i.isActive ? t('ingredients.hide', { name: i.name }) : t('ingredients.show', { name: i.name })} title={i.isActive ? t('ingredients.hideHint') : t('ingredients.showHint')} className={iconButton}>{i.isActive ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</button>
                  <button onClick={() => setConfirmDelete(i._id)} aria-label={t('ingredients.deleteLabel', { name: i.name })} className={`${iconButton} text-[#b4472c] hover:bg-[#fdf0ec]`}><Trash2 className="size-3.5" /></button>
                </div>}
            </div>}
        </li>
      })}</ul>}
  </div>
}

export function Thumb({ image, size = 'size-11' }: { image: string; name?: string; size?: string }) {
  return image
    ? <img src={image} alt="" className={`${size} shrink-0 rounded-xl object-cover`} />
    : <span aria-hidden className={`flex ${size} shrink-0 items-center justify-center rounded-xl bg-[#f3efe6] text-[#c9a978]`}><Package className="size-4" /></span>
}

/** Name, unit, low-stock warning and photo: the same fields for adding and editing. */
function DraftFields({ idPrefix, draft, onChange, onPhotoError, autoFocus }: { idPrefix: string; draft: Draft; onChange: (update: (d: Draft) => Draft) => void; onPhotoError: (message: string) => void; autoFocus?: boolean }) {
  const t = useT()
  const fileInput = useRef<HTMLInputElement>(null)
  const [resizing, setResizing] = useState(false)
  const field = 'h-11 rounded-xl border border-[#e2e7e1] bg-white px-3 text-sm outline-none focus:border-[#8eaf9b]'
  const set = (patch: Partial<Draft>) => onChange(d => ({ ...d, ...patch }))

  const pick = async (file: File | undefined) => {
    if (!file) return
    setResizing(true)
    try {
      set({ image: await resizeImage(file) })
    } catch {
      onPhotoError(t('ingredients.photoFailed'))
    } finally {
      setResizing(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return <div className="flex flex-wrap items-start gap-2">
    <div className="relative">
      <button type="button" onClick={() => fileInput.current?.click()} aria-label={draft.image ? t('ingredients.changePhoto') : t('ingredients.addPhoto')} title={draft.image ? t('ingredients.changePhoto') : t('ingredients.addPhoto')} className="flex size-11 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#cdd6cd] bg-[#fbfcfb] text-[#89938b] hover:border-[#8eaf9b]">
        {resizing ? <Loader2 className="size-4 animate-spin" /> : draft.image ? <img src={draft.image} alt="" className="size-full object-cover" /> : <Camera className="size-4" />}
      </button>
      {draft.image && <button type="button" onClick={() => set({ image: '' })} aria-label={t('ingredients.removePhoto')} className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-[#202521] text-white"><X className="size-3" /></button>}
      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={e => pick(e.target.files?.[0])} />
    </div>
    <label className="sr-only" htmlFor={`${idPrefix}-name`}>{t('ingredients.name')}</label>
    <input id={`${idPrefix}-name`} autoFocus={autoFocus} required maxLength={40} placeholder={t('ingredients.namePlaceholder')} value={draft.name} onChange={e => set({ name: e.target.value })} className={`${field} min-w-0 flex-1 basis-40`} />
    <label className="sr-only" htmlFor={`${idPrefix}-unit`}>{t('ingredients.unit')}</label>
    <select id={`${idPrefix}-unit`} value={draft.unit} onChange={e => set({ unit: e.target.value as Unit })} className={field}>{UNITS.map(u => <option key={u} value={u}>{t(`ingredients.units.${u}`)}</option>)}</select>
    <div className="flex items-center gap-1.5">
      <label htmlFor={`${idPrefix}-low`} className="whitespace-nowrap text-xs font-semibold text-[#5f6b62]">{t('ingredients.lowStock')}</label>
      <input id={`${idPrefix}-low`} type="number" inputMode="decimal" min={0} step="any" placeholder="—" title={t('ingredients.lowStockHint')} value={draft.lowStock} onChange={e => set({ lowStock: e.target.value })} className={`${field} w-24`} />
    </div>
    <p className="w-full text-[11px] text-[#9aa39c]">{t('ingredients.lowStockHint')}</p>
  </div>
}
