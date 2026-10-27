'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Coffee, ImageOff, Loader2, Pencil, Plus, RefreshCw, Search, Star, Trash2, UtensilsCrossed, X } from 'lucide-react'
import { useT } from '@/components/i18n-provider'
import type { TFunction } from '@/lib/i18n'

type MenuItem = { _id: string; name: string; description: string; price: number; category: string; image: string; isAvailable: boolean; isPopular: boolean }
type FormState = { name: string; description: string; price: string; category: string; image: string; isAvailable: boolean; isPopular: boolean }

const emptyForm: FormState = { name: '', description: '', price: '', category: '', image: '', isAvailable: true, isPopular: false }

async function api<T>(t: TFunction, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) window.location.href = '/admin/login'
  if (!res.ok) throw new Error(data.error ?? t('common.somethingWentWrong'))
  return data as T
}

// Tea and coffee items without a photo get a cup icon.
const isTea = (category: string) => /\b(tea|cha|chai|coffee)\b|চা|কফি/i.test(category)

const byMenuOrder = (a: MenuItem, b: MenuItem) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)

export function MenuManager() {
  const t = useT()
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<MenuItem | 'new' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems((await api<{ items: MenuItem[] }>(t, '/api/menu')).items)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('menu.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  const categories = useMemo(() => [...new Set(items.map(i => i.category))].sort(), [items])
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(i => (category === 'All' || i.category === category) && (!q || `${i.name} ${i.description} ${i.category}`.toLowerCase().includes(q)))
  }, [items, category, search])
  const counts = useMemo(() => ({ total: items.length, available: items.filter(i => i.isAvailable).length, out: items.filter(i => !i.isAvailable).length, categories: categories.length }), [items, categories])

  const patch = async (item: MenuItem, changes: Partial<MenuItem>) => {
    setBusyId(item._id)
    setError('')
    try {
      const { item: updated } = await api<{ item: MenuItem }>(t, `/api/menu/${item._id}`, { method: 'PATCH', body: JSON.stringify(changes) })
      setItems(current => current.map(i => i._id === updated._id ? updated : i))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('menu.updateFailed'))
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (item: MenuItem) => {
    setBusyId(item._id)
    setError('')
    try {
      await api(t, `/api/menu/${item._id}`, { method: 'DELETE' })
      setItems(current => current.filter(i => i._id !== item._id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('menu.deleteFailed'))
    } finally {
      setBusyId(null)
      setConfirmDelete(null)
    }
  }

  const saved = (item: MenuItem) => {
    setItems(current => (current.some(i => i._id === item._id) ? current.map(i => i._id === item._id ? item : i) : [...current, item]).sort(byMenuOrder))
    setEditing(null)
  }

  return <div>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[.17em] text-[#bc7843]">{t('menu.eyebrow')}</p><h2 className="font-serif text-3xl font-bold tracking-tight">{t('menu.title')}</h2></div><div className="flex gap-2"><button onClick={load} aria-label={t('menu.refresh')} className="flex size-10 items-center justify-center rounded-xl border border-[#e0e5df] bg-white text-[#68756b] hover:bg-[#f5f7f4]"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button><button onClick={() => setEditing('new')} className="flex items-center gap-2 rounded-xl bg-[#174d3c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123f31]"><Plus className="size-4" /> {t('menu.add')}</button></div></div>

    <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <Stat label={t('menu.stats.items')} value={counts.total} />
      <Stat label={t('menu.stats.available')} value={counts.available} />
      <Stat label={t('menu.stats.out')} value={counts.out} warm />
      <Stat label={t('menu.stats.categories')} value={counts.categories} />
    </section>

    <div className="mt-7 flex flex-wrap items-center gap-3">
      <div className="relative min-w-[200px] flex-1 sm:max-w-xs"><Search className="absolute left-3 top-2.5 size-4 text-[#a0aaa2]" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('menu.searchPlaceholder')} aria-label={t('menu.searchLabel')} className="h-9 w-full rounded-lg border border-[#e2e7e1] bg-white pl-9 pr-3 text-xs outline-none focus:border-[#8eaf9b]" /></div>
    </div>
    {categories.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{['All', ...categories].map(c => <button key={c} onClick={() => setCategory(c)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${category === c ? 'bg-[#f4ddca] text-[#a96438]' : 'bg-[#f1f4f0] text-[#728077] hover:bg-[#e7eee7]'}`}>{c === 'All' ? t('menu.allCategories') : c}</button>)}</div>}

    {error && <p role="alert" className="mt-5 rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{error}</p>}

    {loading && items.length === 0 ? <div className="mt-10 flex justify-center text-[#87928a]"><Loader2 className="size-6 animate-spin" /></div>
      : visible.length === 0 ? <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-[#d9e0d8] bg-white px-6 py-14 text-center"><UtensilsCrossed className="size-10 text-[#c7d1c7]" /><p className="mt-4 font-semibold">{items.length === 0 ? t('menu.emptyTitle') : t('menu.noMatchTitle')}</p><p className="mt-1 text-xs text-[#89938b]">{items.length === 0 ? t('menu.emptyHint') : t('menu.noMatchHint')}</p>{items.length === 0 && <button onClick={() => setEditing('new')} className="mt-5 flex items-center gap-2 rounded-xl bg-[#eef4ed] px-4 py-2.5 text-xs font-bold text-[#174d3c] hover:bg-[#dfece0]"><Plus className="size-4" /> {t('menu.add')}</button>}</div>
      : <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{visible.map(item => <article key={item._id} className="flex flex-col overflow-hidden rounded-2xl border border-[#e3e8e1] bg-white">
        <div className="relative h-36 bg-[#f1f4f0]">
          {item.image ? <img src={item.image} alt={item.name} className={`h-full w-full object-cover ${item.isAvailable ? '' : 'grayscale'}`} /> : <div className="flex h-full items-center justify-center text-[#b9c4ba]">{isTea(item.category) ? <Coffee className="size-9" /> : <ImageOff className="size-8" />}</div>}
          <div className="absolute left-3 top-3 flex gap-1.5">{item.isPopular && <span className="flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-[#b86f3c]"><Star className="size-3 fill-current" /> {t('menu.popular')}</span>}{!item.isAvailable && <span className="rounded-full bg-[#202521]/80 px-2 py-1 text-[10px] font-bold text-white">{t('menu.outOfStock')}</span>}</div>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-serif text-base font-bold">{item.name}</h3><p className="mt-0.5 text-[11px] text-[#8a968d]">{item.category}</p></div><span className="whitespace-nowrap text-sm font-bold text-[#b86f3c]">৳ {item.price}</span></div>
          {item.description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#89938b]">{item.description}</p>}
          <div className="mt-auto flex items-center gap-2 pt-4">
            <div className="flex flex-1 items-center gap-2 text-xs font-medium text-[#5f6b62]"><button type="button" role="switch" aria-checked={item.isAvailable} aria-label={t('menu.availableLabel', { name: item.name })} disabled={busyId === item._id} onClick={() => patch(item, { isAvailable: !item.isAvailable })} className={`relative h-5 w-9 rounded-full transition ${item.isAvailable ? 'bg-[#174d3c]' : 'bg-[#d5dbd4]'}`}><span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${item.isAvailable ? 'left-[18px]' : 'left-0.5'}`} /></button>{item.isAvailable ? t('menu.available') : t('menu.unavailable')}</div>
            <button onClick={() => setEditing(item)} aria-label={t('menu.editLabel', { name: item.name })} className="flex size-9 items-center justify-center rounded-lg border border-[#e2e7e1] text-[#68756b] hover:bg-[#f5f7f4]"><Pencil className="size-3.5" /></button>
            <button onClick={() => setConfirmDelete(item._id)} aria-label={t('menu.deleteLabel', { name: item.name })} className="flex size-9 items-center justify-center rounded-lg border border-[#e2e7e1] text-[#b4472c] hover:bg-[#fdf0ec]"><Trash2 className="size-3.5" /></button>
          </div>
          {confirmDelete === item._id && <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-[#fdf0ec] px-3 py-2.5"><p className="text-xs font-medium text-[#b4472c]">{t('menu.confirmDelete')}</p><div className="flex gap-1.5"><button onClick={() => setConfirmDelete(null)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#68756b] hover:bg-white">{t('common.cancel')}</button><button onClick={() => remove(item)} disabled={busyId === item._id} className="rounded-lg bg-[#b4472c] px-2.5 py-1.5 text-xs font-semibold text-white">{t('common.delete')}</button></div></div>}
        </div>
      </article>)}</div>}

    {editing && <MenuForm item={editing === 'new' ? null : editing} categories={categories} onClose={() => setEditing(null)} onSaved={saved} />}
  </div>
}

function MenuForm({ item, categories, onClose, onSaved }: { item: MenuItem | null; categories: string[]; onClose: () => void; onSaved: (item: MenuItem) => void }) {
  const [form, setForm] = useState<FormState>(item ? { name: item.name, description: item.description, price: String(item.price), category: item.category, image: item.image, isAvailable: item.isAvailable, isPopular: item.isPopular } : emptyForm)
  const t = useT()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [imageBroken, setImageBroken] = useState(false)
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(current => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const body = JSON.stringify({ ...form, price: Number(form.price) })
      const { item: result } = item
        ? await api<{ item: MenuItem }>(t, `/api/menu/${item._id}`, { method: 'PATCH', body })
        : await api<{ item: MenuItem }>(t, '/api/menu', { method: 'POST', body })
      onSaved(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('menu.saveFailed'))
      setSaving(false)
    }
  }

  const input = 'mt-1.5 h-11 w-full rounded-xl border border-[#e2e7e1] bg-[#fbfcfb] px-3 text-sm outline-none focus:border-[#8eaf9b]'
  const label = 'block text-xs font-semibold text-[#5f6b62]'

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#202521]/30 sm:items-center sm:p-4" onClick={onClose}>
    <form onSubmit={submit} onClick={e => e.stopPropagation()} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl">
      <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.16em] text-[#b86f3c]">{item ? t('menu.form.editEyebrow') : t('menu.form.newEyebrow')}</p><h3 className="mt-1 font-serif text-2xl font-bold">{item ? item.name : t('menu.form.addTitle')}</h3></div><button type="button" aria-label={t('common.close')} onClick={onClose} className="rounded-full p-2 hover:bg-[#f2f4f0]"><X className="size-5" /></button></div>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="col-span-2"><label className={label} htmlFor="m-name">{t('menu.form.name')}</label><input id="m-name" required maxLength={80} placeholder={t('menu.form.namePlaceholder')} value={form.name} onChange={e => set('name', e.target.value)} className={input} /></div>
        <div><label className={label} htmlFor="m-price">{t('menu.form.price')}</label><input id="m-price" type="number" min={0} step="any" required value={form.price} onChange={e => set('price', e.target.value)} className={input} /></div>
        <div><label className={label} htmlFor="m-category">{t('menu.form.category')}</label><input id="m-category" required maxLength={40} list="menu-categories" placeholder={t('menu.form.categoryPlaceholder')} value={form.category} onChange={e => set('category', e.target.value)} className={input} /><datalist id="menu-categories">{categories.map(c => <option key={c} value={c} />)}</datalist></div>
        <div className="col-span-2"><label className={label} htmlFor="m-description">{t('menu.form.description')} <span className="font-normal text-[#a0aaa2]">{t('common.optional')}</span></label><textarea id="m-description" maxLength={300} rows={2} value={form.description} onChange={e => set('description', e.target.value)} className={`${input} h-auto py-2.5`} /></div>
        <div className="col-span-2"><label className={label} htmlFor="m-image">{t('menu.form.image')} <span className="font-normal text-[#a0aaa2]">{t('common.optional')}</span></label><div className="mt-1.5 flex gap-3"><div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f1f4f0] text-[#b9c4ba]">{form.image && !imageBroken ? <img src={form.image} alt="" onError={() => setImageBroken(true)} className="size-full object-cover" /> : <ImageOff className="size-4" />}</div><input id="m-image" type="text" inputMode="url" placeholder="https://..." value={form.image} onChange={e => { set('image', e.target.value); setImageBroken(false) }} className={`${input} mt-0`} /></div></div>
        <label className="flex items-center gap-2.5 text-xs font-medium text-[#5f6b62]"><input type="checkbox" checked={form.isAvailable} onChange={e => set('isAvailable', e.target.checked)} className="size-4 accent-[#174d3c]" /> {t('menu.form.availableNow')}</label>
        <label className="flex items-center gap-2.5 text-xs font-medium text-[#5f6b62]"><input type="checkbox" checked={form.isPopular} onChange={e => set('isPopular', e.target.checked)} className="size-4 accent-[#174d3c]" /> {t('menu.form.markPopular')}</label>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-[#fdf0ec] px-3 py-2 text-xs font-medium text-[#b4472c]">{error}</p>}
      <div className="mt-6 flex gap-2"><button type="button" onClick={onClose} className="h-11 flex-1 rounded-xl border border-[#e2e7e1] text-sm font-semibold text-[#68756b] hover:bg-[#f5f7f4]">{t('common.cancel')}</button><button disabled={saving} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#174d3c] text-sm font-semibold text-white hover:bg-[#123f31] disabled:opacity-70">{saving && <Loader2 className="size-4 animate-spin" />}{item ? t('common.saveChanges') : t('menu.add')}</button></div>
    </form>
  </div>
}

function Stat({ label, value, warm }: { label: string; value: number; warm?: boolean }) {
  return <div className="rounded-2xl border border-[#e3e8e1] bg-white p-5"><p className="text-xs font-medium text-[#87928a]">{label}</p><p className={`mt-1 font-serif text-2xl font-bold tracking-tight ${warm ? 'text-[#c7773d]' : ''}`}>{value}</p></div>
}
