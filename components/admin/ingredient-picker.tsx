'use client'

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type Ref } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { useT } from '@/components/i18n-provider'

type Unit = 'kg' | 'litre' | 'piece' | 'packet'
export type PickerItem = { _id: string; name: string; unit: Unit; stock: number }

const amount = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 3 })

/** Ingredient dropdown that shows each one's mother store stock, with a search box once the list gets long. */
export function IngredientPicker({ id, items, value, onChange, autoFocus, buttonRef }: { id: string; items: PickerItem[]; value: string; onChange: (id: string) => void; autoFocus?: boolean; buttonRef?: Ref<HTMLButtonElement> }) {
  const t = useT()
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const ownButton = useRef<HTMLButtonElement | null>(null)
  const chosen = items.find(i => i._id === value)
  const searchable = items.length > 6

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? items.filter(i => i.name.toLowerCase().includes(q)) : items
  }, [items, query])

  // Close when clicking anywhere outside the picker.
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const openList = () => {
    setQuery('')
    setActive(Math.max(items.findIndex(i => i._id === value), 0))
    setOpen(true)
  }
  const pick = (item: PickerItem) => {
    onChange(item._id)
    setOpen(false)
    ownButton.current?.focus()
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, shown.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[active]) pick(shown[active]) }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); ownButton.current?.focus() }
  }

  const stockText = (i: PickerItem) => i.stock > 0
    ? <span className="font-semibold text-[#174d3c]">{amount(i.stock)} {t(`ingredients.units.${i.unit}`)}</span>
    : <span className="text-[#a0aaa2]">{t('store.outOfStock')}</span>

  return <div ref={rootRef} className="relative">
    <button
      ref={el => { ownButton.current = el; if (typeof buttonRef === 'function') buttonRef(el); else if (buttonRef) buttonRef.current = el }}
      id={id}
      type="button"
      autoFocus={autoFocus}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={listId}
      onClick={() => (open ? setOpen(false) : openList())}
      onKeyDown={e => { if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openList() } else if (open) onKey(e) }}
      className={`flex h-11 w-full items-center gap-3 rounded-xl border bg-[#fbfcfb] px-4 text-left text-sm outline-none transition focus:border-[#8eaf9b] ${open ? 'border-[#8eaf9b] ring-4 ring-[#174d3c]/5' : 'border-[#e2e7e1] hover:border-[#cfd8ce]'}`}
    >
      {chosen ? <>
        <span className="min-w-0 flex-1 truncate font-semibold">{chosen.name}</span>
        <span className="shrink-0 text-xs">{stockText(chosen)}</span>
      </> : <span className="flex-1 text-[#a0aaa2]">{t('store.chooseIngredient')}</span>}
      <ChevronDown className={`size-4 shrink-0 text-[#87928a] transition ${open ? 'rotate-180' : ''}`} />
    </button>

    {open && <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-[#e3e8e1] bg-white p-2 shadow-xl">
      {searchable && <div className="relative mb-2"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#a0aaa2]" /><input autoFocus value={query} onChange={e => { setQuery(e.target.value); setActive(0) }} onKeyDown={onKey} placeholder={t('store.searchPlaceholder')} aria-label={t('store.searchPlaceholder')} aria-controls={listId} className="h-10 w-full rounded-lg border border-[#eef1ed] bg-[#fafbf9] pl-9 pr-3 text-sm outline-none focus:border-[#8eaf9b]" /></div>}
      <ul id={listId} role="listbox" aria-labelledby={id} className="max-h-64 overflow-y-auto">
        {shown.length === 0 ? <li className="px-3 py-4 text-center text-xs text-[#89938b]">{t('store.noMatch')}</li>
          : shown.map((i, index) => {
            const selected = i._id === value
            return <li key={i._id} role="option" aria-selected={selected}>
              <button type="button" tabIndex={-1} onClick={() => pick(i)} onMouseEnter={() => setActive(index)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${index === active ? 'bg-[#f3f6f2]' : ''} ${selected ? 'bg-[#eaf2eb]' : ''}`}>
                <span className="flex size-5 shrink-0 items-center justify-center text-[#174d3c]">{selected && <Check className="size-4" />}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{i.name}</span><span className="text-[11px] text-[#89938b]">{t(`ingredients.units.${i.unit}`)}</span></span>
                <span className="shrink-0 text-right text-xs">{stockText(i)}</span>
              </button>
            </li>
          })}
      </ul>
    </div>}
  </div>
}
