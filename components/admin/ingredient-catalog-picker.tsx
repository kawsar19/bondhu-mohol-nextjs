'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2, Package, Search, X } from 'lucide-react'
import { useLocale, useT } from '@/components/i18n-provider'
import type { CatalogCategory, CatalogItem } from '@/lib/ingredient-catalog'

type Item = CatalogItem & { added: boolean }

/** The ready-made ingredient list: tick what the shop buys and add it all at once. */
export function IngredientCatalogPicker({ onClose, onAdded }: { onClose: () => void; onAdded: (result: { added: number; skipped: number; ingredients: unknown[] }) => void }) {
  const t = useT()
  const locale = useLocale()
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/ingredients/catalog', { cache: 'no-store' }).then(async res => {
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? t('common.somethingWentWrong'))
      setCategories(data.categories)
      setItems(data.items)
    }).catch(err => setError(err instanceof Error ? err.message : t('common.somethingWentWrong'))).finally(() => setLoading(false))
  }, [t])

  // Escape closes, as with the other dialogs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const catName = (c: CatalogCategory) => (locale === 'bn' ? c.name : c.nameEn)
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(i => (category === 'all' || i.category === category) && (!q || i.name.toLowerCase().includes(q) || i.nameEn.toLowerCase().includes(q)))
  }, [items, category, search])
  const open = visible.filter(i => !i.added)
  const allPicked = open.length > 0 && open.every(i => picked.has(i.key))

  const toggle = (key: string) => setPicked(current => {
    const next = new Set(current)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })
  const toggleAll = () => setPicked(current => {
    const next = new Set(current)
    for (const i of open) allPicked ? next.delete(i.key) : next.add(i.key)
    return next
  })

  const add = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/ingredients/catalog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keys: [...picked] }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? t('common.somethingWentWrong'))
      onAdded(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWentWrong'))
      setSaving(false)
    }
  }

  const chip = (on: boolean) => `h-8 shrink-0 rounded-full px-3 text-xs font-semibold transition ${on ? 'bg-[#174d3c] text-white' : 'bg-[#f1f4f0] text-[#4f5b52] hover:bg-[#e6ece5]'}`

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 sm:items-center sm:p-4" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={t('ingredients.catalog.title')} onClick={e => e.stopPropagation()} className="flex h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-[#f7f8f6] sm:h-[88vh] sm:rounded-2xl">
      <div className="border-b border-[#e3e7e1] bg-white px-4 pb-3 pt-4 sm:px-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1"><h2 className="font-serif text-xl font-bold">{t('ingredients.catalog.title')}</h2><p className="mt-0.5 text-xs text-[#89938b]">{t('ingredients.catalog.subtitle', { count: items.length })}</p></div>
          <button onClick={onClose} aria-label={t('common.close')} className="flex size-9 items-center justify-center rounded-lg text-[#68756b] hover:bg-[#f5f7f4]"><X className="size-4" /></button>
        </div>
        <div className="relative mt-3"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#a0aaa2]" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('ingredients.catalog.search')} aria-label={t('ingredients.catalog.search')} className="h-10 w-full rounded-xl border border-[#e2e7e1] bg-[#fbfcfb] pl-9 pr-3 text-sm outline-none focus:border-[#8eaf9b]" /></div>
        <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:-mx-5 sm:px-5" role="group" aria-label={t('ingredients.catalog.categories')}>
          <button onClick={() => setCategory('all')} aria-pressed={category === 'all'} className={chip(category === 'all')}>{t('ingredients.catalog.all')}</button>
          {categories.map(c => <button key={c.key} onClick={() => setCategory(c.key)} aria-pressed={category === c.key} className={chip(category === c.key)}>{catName(c)}</button>)}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
        {loading ? <div className="mt-16 flex justify-center text-[#87928a]"><Loader2 className="size-6 animate-spin" /></div>
          : visible.length === 0 ? <p className="mt-10 text-center text-sm text-[#89938b]">{t('ingredients.noMatch')}</p>
          : <>
            {open.length > 0 && <button onClick={toggleAll} className="mb-2 text-xs font-semibold text-[#b86f3c] hover:underline">{allPicked ? t('ingredients.catalog.unpickAll') : t('ingredients.catalog.pickAll', { count: open.length })}</button>}
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{visible.map(i => {
              const on = picked.has(i.key)
              return <li key={i.key}>
                <button type="button" disabled={i.added} onClick={() => toggle(i.key)} aria-pressed={on} className={`flex w-full items-center gap-2.5 rounded-xl border bg-white p-2 text-left transition ${i.added ? 'cursor-default opacity-55' : on ? 'border-[#174d3c] ring-1 ring-[#174d3c]' : 'border-[#e3e8e1] hover:border-[#c9d6cc]'}`}>
                  <span className="relative shrink-0">
                    {i.image ? <img src={i.image} alt="" loading="lazy" className="size-12 rounded-lg object-cover" /> : <span aria-hidden className="flex size-12 items-center justify-center rounded-lg bg-[#f5f1e8] font-serif text-lg font-bold text-[#cdb48a]">{i.name.charAt(0) || <Package className="size-4" />}</span>}
                    {(on || i.added) && <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[#174d3c] text-white ring-2 ring-white"><Check className="size-3" /></span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{i.name}</span>
                    <span className="block truncate text-[11px] text-[#89938b]">{i.added ? t('ingredients.catalog.alreadyAdded') : `${i.nameEn} · ${t(`ingredients.units.${i.unit}`)}`}</span>
                  </span>
                </button>
              </li>
            })}</ul>
          </>}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-[#e3e7e1] bg-white px-4 py-3 sm:px-5">
        {error ? <p role="alert" className="min-w-0 flex-1 text-xs font-medium text-[#b4472c]">{error}</p>
          : <p className="min-w-0 flex-1 text-xs text-[#68756b]"><span className="font-bold text-[#202521]">{t('ingredients.catalog.picked', { count: picked.size })}</span> · <a href="/credits" target="_blank" className="underline">{t('ingredients.catalog.credits')}</a></p>}
        <button onClick={add} disabled={picked.size === 0 || saving} className="flex h-11 items-center gap-2 rounded-xl bg-[#174d3c] px-5 text-sm font-semibold text-white hover:bg-[#123f31] disabled:opacity-50">{saving && <Loader2 className="size-4 animate-spin" />}{t('ingredients.catalog.add', { count: picked.size })}</button>
      </div>
    </div>
  </div>
}
