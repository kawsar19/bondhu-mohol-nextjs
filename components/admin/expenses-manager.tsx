'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Eye, EyeOff, History, Loader2, Pencil, Plus, RefreshCw, Search, ShoppingBasket, Tags, Trash2, X } from 'lucide-react'
import { businessDateString } from '@/lib/time'
import type { MessageKey, TFunction } from '@/lib/i18n'
import { useIntlLocale, useT } from '@/components/i18n-provider'
import { addDays, DateRangePicker, describeRange, formatDay, PRESETS, type DateRange } from './date-range-picker'

type Expense = { _id: string; date: string; category: string; item: string; quantity: string; amount: number; paidTo: string; note: string; addedBy: string }
type Category = { _id: string; name: string; hint: string; isHidden: boolean; count: number }
type Suggestion = { item: string; category: string; quantity: string; amount: number; paidTo: string; count: number }
type Suggestions = { items: Suggestion[]; vendors: string[] }
type FormState = { date: string; category: string; item: string; quantity: string; amount: string; paidTo: string; note: string }

const taka = (n: number) => `৳ ${n.toLocaleString('en-IN')}`

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) window.location.href = '/admin/login'
  if (!res.ok) throw new Error(data.error ?? '')
  return data as T
}

/** The server's message, or a translated fallback when there is none. */
const errorText = (err: unknown, t: TFunction, fallback: MessageKey) => err instanceof Error ? err.message || t('common.somethingWentWrong') : t(fallback)

export function ExpensesManager() {
  const t = useT()
  const locale = useIntlLocale()
  const [range, setRange] = useState<DateRange>(() => PRESETS.find(p => p.id === 'thisMonth')!.range())
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suggestions, setSuggestions] = useState<Suggestions>({ items: [], vendors: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Expense | 'new' | null>(null)
  const [managingCategories, setManagingCategories] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setExpenses((await api<{ expenses: Expense[] }>(`/api/expenses?from=${range.from}&to=${range.to}`)).expenses)
    } catch (err) {
      setError(errorText(err, t, 'expenses.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [range, t])

  // Categories and quick picks change less often; they reload after a save or a category edit.
  const loadLookups = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([api<{ categories: Category[] }>('/api/expense-categories'), api<Suggestions>('/api/expenses/suggestions')])
      setCategories(c.categories)
      setSuggestions(s)
    } catch (err) {
      setError(errorText(err, t, 'expenses.loadCategoriesFailed'))
    }
  }, [t])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadLookups() }, [loadLookups])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return expenses.filter(e => (!categoryFilter || e.category === categoryFilter) && (!q || [e.item, e.paidTo, e.note, e.category].some(v => v.toLowerCase().includes(q))))
  }, [expenses, search, categoryFilter])
  const total = expenses.reduce((sum, e) => sum + e.amount, 0)
  const visibleTotal = visible.reduce((sum, e) => sum + e.amount, 0)
  const byCategory = useMemo(() => {
    const sums = new Map<string, number>()
    for (const e of expenses) sums.set(e.category, (sums.get(e.category) ?? 0) + e.amount)
    return [...sums.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount)
  }, [expenses])
  const byDay = useMemo(() => {
    const groups = new Map<string, Expense[]>()
    for (const e of visible) {
      const day = businessDateString(new Date(e.date))
      groups.set(day, [...(groups.get(day) ?? []), e])
    }
    return [...groups.entries()]
  }, [visible])

  // Saved items may fall outside the range shown, so reload rather than patch the list.
  const saved = (keepOpen: boolean) => {
    if (!keepOpen) setEditing(null)
    load()
    loadLookups()
  }

  const filtered = Boolean(search.trim() || categoryFilter)

  return <div className="pb-20 sm:pb-0">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[.17em] text-[#bc7843]">{t('expenses.eyebrow')}</p><h2 className="font-serif text-3xl font-bold tracking-tight">{t('expenses.title')}</h2><p className="mt-1 text-xs text-[#89938b]">{t('expenses.subtitle')}</p></div><div className="flex gap-2"><button onClick={() => { load(); loadLookups() }} aria-label={t('expenses.refresh')} className="flex size-10 items-center justify-center rounded-xl border border-[#e0e5df] bg-white text-[#68756b] hover:bg-[#f5f7f4]"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button><button onClick={() => setManagingCategories(true)} className="flex items-center gap-2 rounded-xl border border-[#e0e5df] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#5f6b62] hover:bg-[#f5f7f4]"><Tags className="size-4" /> {t('expenses.categories')}</button><button onClick={() => setEditing('new')} className="hidden items-center gap-2 rounded-xl bg-[#174d3c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123f31] sm:flex"><Plus className="size-4" /> {t('expenses.addExpense')}</button></div></div>

    <DateRangePicker value={range} onChange={setRange} />

    <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(220px,1fr)_2.5fr]">
      <div className="rounded-2xl border border-[#e3e8e1] bg-white p-5"><p className="text-xs font-medium text-[#87928a]">{t('expenses.totalSpent')}</p><p className="mt-1 font-serif text-3xl font-bold tracking-tight text-[#b4472c]">{taka(total)}</p><p className="mt-1 text-[11px] text-[#9aa39c]">{describeRange(range, locale)} · {t(expenses.length === 1 ? 'expenses.entryOne' : 'expenses.entryMany', { count: expenses.length })}</p></div>
      <div className="rounded-2xl border border-[#e3e8e1] bg-white p-5"><p className="text-xs font-medium text-[#87928a]">{t('expenses.byCategory')} <span className="font-normal text-[#a0aaa2]">{t('expenses.tapToFilter')}</span></p>{byCategory.length === 0 ? <p className="mt-3 text-xs text-[#9aa39c]">{t('expenses.nothingYet')}</p> : <div className="mt-3 flex flex-col gap-1">{byCategory.map(c => <button key={c.category} onClick={() => setCategoryFilter(f => f === c.category ? null : c.category)} className={`flex min-h-10 items-center gap-3 rounded-lg px-2 py-1.5 text-left text-xs transition ${categoryFilter === c.category ? 'bg-[#fff0df]' : 'hover:bg-[#f7f8f6]'}`}><span className="w-24 shrink-0 truncate font-semibold">{c.category}</span><div className="h-2 flex-1 rounded-full bg-[#f1f3f0]"><div className="h-2 rounded-full bg-[#d38a51]" style={{ width: `${(c.amount / total) * 100}%` }} /></div><span className="w-24 shrink-0 text-right font-semibold">{taka(c.amount)}</span></button>)}</div>}</div>
    </section>

    {expenses.length > 0 && <div className="mt-5 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1 sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#a0aaa2]" /><label className="sr-only" htmlFor="e-search">{t('expenses.searchLabel')}</label><input id="e-search" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('expenses.searchPlaceholder')} className="h-10 w-full rounded-xl border border-[#e2e7e1] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#8eaf9b]" /></div>
      {categoryFilter && <button onClick={() => setCategoryFilter(null)} className="flex h-10 items-center gap-1.5 rounded-xl bg-[#fff0df] px-3 text-xs font-semibold text-[#a8622f]">{categoryFilter} <X className="size-3.5" /></button>}
      {filtered && <span className="text-xs text-[#87928a]">{t('expenses.shown', { count: visible.length, amount: taka(visibleTotal) })}</span>}
    </div>}

    {error && <p role="alert" className="mt-5 rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{error}</p>}

    {loading && expenses.length === 0 ? <div className="mt-10 flex justify-center text-[#87928a]"><Loader2 className="size-6 animate-spin" /></div>
      : expenses.length === 0 ? <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-[#d9e0d8] bg-white px-6 py-14 text-center"><ShoppingBasket className="size-10 text-[#c7d1c7]" /><p className="mt-4 font-semibold">{t('expenses.emptyTitle')}</p><p className="mt-1 text-xs text-[#89938b]">{t('expenses.emptyHint')}</p><button onClick={() => setEditing('new')} className="mt-5 flex items-center gap-2 rounded-xl bg-[#eef4ed] px-4 py-2.5 text-xs font-bold text-[#174d3c] hover:bg-[#dfece0]"><Plus className="size-4" /> {t('expenses.addExpense')}</button></div>
      : visible.length === 0 ? <p className="mt-8 text-center text-sm text-[#89938b]">{t('expenses.noMatch')} <button onClick={() => { setSearch(''); setCategoryFilter(null) }} className="font-semibold text-[#174d3c] underline">{t('expenses.clearFilters')}</button></p>
      : <div className="mt-5 flex flex-col gap-5">{byDay.map(([day, items]) => <section key={day} className="overflow-hidden rounded-2xl border border-[#e3e8e1] bg-white">
        <div className="flex items-center justify-between border-b border-[#eef1ed] bg-[#fafbf9] px-5 py-3"><h3 className="text-sm font-semibold">{formatDay(day, locale, true)}</h3><span className="text-sm font-bold text-[#b4472c]">{taka(items.reduce((sum, e) => sum + e.amount, 0))}</span></div>
        <ul className="divide-y divide-[#f0f2ef]">{items.map(e => <li key={e._id}><button onClick={() => setEditing(e)} className="group flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-[#fafbf9]">
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{e.item}{e.quantity && <span className="ml-1.5 font-normal text-[#68756b]">· {e.quantity}</span>}</p><p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#89938b]"><span className="rounded-full bg-[#f3efe6] px-2 py-0.5 font-semibold text-[#8a5a24]">{e.category}</span>{e.paidTo && <span>{e.paidTo}</span>}{e.addedBy && <span>{t('expenses.addedBy', { name: e.addedBy })}</span>}</p>{e.note && <p className="mt-1 text-xs text-[#68756b]">{e.note}</p>}</div>
          <span className="shrink-0 text-sm font-bold">{taka(e.amount)}</span>
          <Pencil className="mt-0.5 size-3.5 shrink-0 text-[#b5bdb6] opacity-0 transition group-hover:opacity-100" aria-hidden />
        </button></li>)}</ul>
      </section>)}</div>}

    <button onClick={() => setEditing('new')} aria-label={t('expenses.addExpense')} className="fixed bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.5rem)] right-4 z-30 flex size-14 items-center justify-center rounded-full bg-[#c48545] text-white shadow-xl sm:hidden"><Plus className="size-6" /></button>

    {editing && <ExpenseForm expense={editing === 'new' ? null : editing} categories={categories} suggestions={suggestions} onCategoryAdded={c => setCategories(cs => [...cs, c])} onClose={() => setEditing(null)} onSaved={saved} />}
    {managingCategories && <CategoryManager categories={categories} onChange={setCategories} onClose={() => { setManagingCategories(false); load() }} />}
  </div>
}

function ExpenseForm({ expense, categories, suggestions, onCategoryAdded, onClose, onSaved }: { expense: Expense | null; categories: Category[]; suggestions: Suggestions; onCategoryAdded: (c: Category) => void; onClose: () => void; onSaved: (keepOpen: boolean) => void }) {
  const t = useT()
  const today = businessDateString()
  const firstCategory = categories.find(c => !c.isHidden)?.name ?? ''
  const blank = (date: string, category: string): FormState => ({ date, category, item: '', quantity: '', amount: '', paidTo: '', note: '' })
  const [form, setForm] = useState<FormState>(expense ? { date: businessDateString(new Date(expense.date)), category: expense.category, item: expense.item, quantity: expense.quantity, amount: String(expense.amount), paidTo: expense.paidTo, note: expense.note } : blank(today, firstCategory))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [addedCount, setAddedCount] = useState(0)
  const [showNote, setShowNote] = useState(Boolean(expense?.note))
  const [newCategory, setNewCategory] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)
  const itemRef = useRef<HTMLInputElement>(null)
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(current => ({ ...current, [key]: value }))

  // Categories may arrive after the form opens.
  useEffect(() => { if (!form.category && firstCategory) set('category', firstCategory) }, [firstCategory, form.category])

  const known = suggestions.items.find(s => s.item.toLowerCase() === form.item.trim().toLowerCase())
  const pickerCategories = categories.filter(c => !c.isHidden || c.name === form.category)
  const hint = categories.find(c => c.name === form.category)?.hint

  /** Fills in what was bought last time; the price is left for the user since it changes. */
  const usePrevious = (s: Suggestion) => {
    setForm(current => ({ ...current, item: s.item, category: categories.some(c => c.name === s.category && !c.isHidden) ? s.category : current.category, quantity: s.quantity, paidTo: s.paidTo || current.paidTo }))
    requestAnimationFrame(() => amountRef.current?.focus())
  }

  const onItemChange = (value: string) => {
    set('item', value)
    const match = suggestions.items.find(s => s.item.toLowerCase() === value.trim().toLowerCase())
    if (match && !expense) setForm(current => ({ ...current, item: value, category: categories.some(c => c.name === match.category && !c.isHidden) ? match.category : current.category, quantity: current.quantity || match.quantity }))
  }

  const addCategory = async () => {
    const name = newCategory?.trim()
    if (!name) return setNewCategory(null)
    setError('')
    try {
      const { category } = await api<{ category: Category }>('/api/expense-categories', { method: 'POST', body: JSON.stringify({ name }) })
      onCategoryAdded(category)
      set('category', category.name)
      setNewCategory(null)
    } catch (err) {
      setError(errorText(err, t, 'expenses.addCategoryFailed'))
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // "Save & add another" keeps the date, category and shop, for writing down a whole bazar list.
    const another = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'another'
    if (!form.category) return setError(t('expenses.chooseCategory'))
    setSaving(true)
    setError('')
    try {
      const body = JSON.stringify({ ...form, amount: Number(form.amount) })
      if (expense) await api(`/api/expenses/${expense._id}`, { method: 'PATCH', body })
      else await api('/api/expenses', { method: 'POST', body })
      onSaved(another)
      if (another) {
        setForm(current => ({ ...blank(current.date, current.category), paidTo: current.paidTo }))
        setShowNote(false)
        setAddedCount(n => n + 1)
        itemRef.current?.focus()
      }
    } catch (err) {
      setError(errorText(err, t, 'expenses.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!expense) return
    setSaving(true)
    try {
      await api(`/api/expenses/${expense._id}`, { method: 'DELETE' })
      onSaved(false)
    } catch (err) {
      setError(errorText(err, t, 'expenses.deleteFailed'))
      setSaving(false)
    }
  }

  const input = 'mt-1.5 h-11 w-full rounded-xl border border-[#e2e7e1] bg-[#fbfcfb] px-3 text-sm outline-none focus:border-[#8eaf9b]'
  const label = 'block text-xs font-semibold text-[#5f6b62]'
  const chip = (on: boolean) => `h-9 rounded-full px-3.5 text-xs font-semibold transition ${on ? 'bg-[#174d3c] text-white' : 'border border-[#e2e7e1] bg-white text-[#5f6b62] hover:bg-[#f5f7f4]'}`
  const quickPicks = expense ? [] : suggestions.items.slice(0, 8)

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#202521]/30 p-0 sm:items-center sm:p-4" onClick={onClose}>
    <form onSubmit={submit} onClick={e => e.stopPropagation()} className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl">
      <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.16em] text-[#b86f3c]">{expense ? t('expenses.editExpense') : t('expenses.newExpense')}</p><h3 className="mt-1 font-serif text-2xl font-bold">{expense ? expense.item : t('expenses.whatBought')}</h3></div><button type="button" aria-label={t('common.close')} onClick={onClose} className="rounded-full p-2 hover:bg-[#f2f4f0]"><X className="size-5" /></button></div>
      {addedCount > 0 && <p role="status" className="mt-4 rounded-lg bg-[#eaf2eb] px-3 py-2 text-xs font-medium text-[#174d3c]">{t('expenses.addedCount', { count: addedCount })}</p>}

      {quickPicks.length > 0 && <div className="mt-5"><p className="flex items-center gap-1.5 text-xs font-semibold text-[#5f6b62]"><History className="size-3.5" /> {t('expenses.boughtBefore')}</p><div className="mt-2 flex flex-wrap gap-1.5">{quickPicks.map(s => <button type="button" key={s.item} onClick={() => usePrevious(s)} className={chip(form.item.toLowerCase() === s.item.toLowerCase())}>{s.item}</button>)}</div></div>}

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="col-span-2"><label className={label} htmlFor="e-item">{t('expenses.item')}</label><input ref={itemRef} id="e-item" required maxLength={80} autoFocus={!expense} list="e-item-list" autoComplete="off" placeholder={t('expenses.itemPlaceholder')} value={form.item} onChange={e => onItemChange(e.target.value)} className={input} /><datalist id="e-item-list">{suggestions.items.map(s => <option key={s.item} value={s.item} />)}</datalist>
          {known && <p className="mt-1.5 text-[11px] text-[#89938b]">{t('expenses.lastTime')} <span className="font-semibold text-[#5f6b62]">{taka(known.amount)}</span>{known.quantity && t('expenses.lastQuantity', { quantity: known.quantity })}{known.paidTo && t('expenses.lastShop', { shop: known.paidTo })}</p>}</div>

        <div className="col-span-2"><p className={label}>{t('expenses.category')}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{pickerCategories.map(c => <button type="button" key={c._id} onClick={() => set('category', c.name)} aria-pressed={form.category === c.name} className={chip(form.category === c.name)}>{c.name}</button>)}
            {newCategory === null ? <button type="button" onClick={() => setNewCategory('')} className="flex h-9 items-center gap-1 rounded-full border border-dashed border-[#c9d3c9] px-3 text-xs font-semibold text-[#68756b] hover:bg-[#f5f7f4]"><Plus className="size-3.5" /> {t('expenses.newCategory')}</button>
              : <span className="flex h-9 items-center gap-1 rounded-full border border-[#8eaf9b] bg-white pl-3 pr-1"><label className="sr-only" htmlFor="e-new-cat">{t('expenses.newCategoryName')}</label><input id="e-new-cat" autoFocus maxLength={40} value={newCategory} onChange={e => setNewCategory(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } if (e.key === 'Escape') setNewCategory(null) }} placeholder={t('expenses.name')} className="w-28 bg-transparent text-xs outline-none" /><button type="button" onClick={addCategory} className="h-7 rounded-full bg-[#174d3c] px-2.5 text-[11px] font-semibold text-white">{t('common.add')}</button></span>}
          </div>
          {hint && <p className="mt-1.5 text-[11px] text-[#89938b]">{hint}</p>}
        </div>

        <div><label className={label} htmlFor="e-amount">{t('expenses.amount')}</label><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 mt-[3px] -translate-y-1/2 text-lg font-semibold text-[#87928a]">৳</span><input ref={amountRef} id="e-amount" type="number" inputMode="decimal" min={0.01} step="0.01" required placeholder={known ? String(known.amount) : '0'} value={form.amount} onChange={e => set('amount', e.target.value)} className={`${input} pl-8 text-lg font-semibold`} /></div></div>
        <div><label className={label} htmlFor="e-qty">{t('expenses.quantity')} <span className="font-normal text-[#a0aaa2]">{t('common.optional')}</span></label><input id="e-qty" maxLength={30} placeholder={t('expenses.quantityPlaceholder')} value={form.quantity} onChange={e => set('quantity', e.target.value)} className={input} /></div>

        <div className="col-span-2"><p className={label}>{t('expenses.date')}</p><div className="mt-1.5 flex flex-wrap items-center gap-1.5"><button type="button" onClick={() => set('date', today)} className={chip(form.date === today)}>{t('dates.presets.today')}</button><button type="button" onClick={() => set('date', addDays(today, -1))} className={chip(form.date === addDays(today, -1))}>{t('dates.presets.yesterday')}</button><label className="sr-only" htmlFor="e-date">{t('expenses.date')}</label><input id="e-date" type="date" required max={today} value={form.date} onChange={e => e.target.value && set('date', e.target.value)} className="h-9 rounded-full border border-[#e2e7e1] bg-white px-3 text-xs font-medium outline-none focus:border-[#8eaf9b]" /></div></div>

        <div className="col-span-2"><label className={label} htmlFor="e-paid">{t('expenses.paidTo')} <span className="font-normal text-[#a0aaa2]">{t('common.optional')}</span></label><input id="e-paid" maxLength={60} list="e-vendor-list" autoComplete="off" placeholder={t('expenses.paidToPlaceholder')} value={form.paidTo} onChange={e => set('paidTo', e.target.value)} className={input} /><datalist id="e-vendor-list">{suggestions.vendors.map(v => <option key={v} value={v} />)}</datalist></div>
        <div className="col-span-2">{showNote ? <><label className={label} htmlFor="e-note">{t('expenses.note')}</label><input id="e-note" maxLength={200} autoFocus={!expense?.note} value={form.note} onChange={e => set('note', e.target.value)} className={input} /></> : <button type="button" onClick={() => setShowNote(true)} className="text-xs font-semibold text-[#68756b] hover:text-[#174d3c]">{t('expenses.addNote')}</button>}</div>
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg bg-[#fdf0ec] px-3 py-2 text-xs font-medium text-[#b4472c]">{error}</p>}
      {confirmDelete && <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-[#fdf0ec] px-3 py-2.5"><p className="text-xs font-medium text-[#b4472c]">{t('expenses.confirmDelete')}</p><div className="flex gap-1.5"><button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#68756b] hover:bg-white">{t('common.cancel')}</button><button type="button" onClick={remove} disabled={saving} className="rounded-lg bg-[#b4472c] px-2.5 py-1.5 text-xs font-semibold text-white">{t('common.delete')}</button></div></div>}
      <div className="mt-6 flex flex-wrap gap-2">
        {expense ? <button type="button" onClick={() => setConfirmDelete(true)} aria-label={t('expenses.deleteExpense')} className="flex size-11 items-center justify-center rounded-xl border border-[#e2e7e1] text-[#b4472c] hover:bg-[#fdf0ec]"><Trash2 className="size-4" /></button>
          : <button name="action" value="another" disabled={saving} className="h-11 flex-1 rounded-xl border border-[#cfdccf] text-sm font-semibold text-[#174d3c] hover:bg-[#f0f5f0] disabled:opacity-70">{t('expenses.saveAndAddAnother')}</button>}
        <button name="action" value="close" disabled={saving} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#174d3c] text-sm font-semibold text-white hover:bg-[#123f31] disabled:opacity-70">{saving && <Loader2 className="size-4 animate-spin" />}{expense ? t('common.saveChanges') : t('common.save')}</button>
      </div>
    </form>
  </div>
}

function CategoryManager({ categories, onChange, onClose }: { categories: Category[]; onChange: (categories: Category[]) => void; onClose: () => void }) {
  const t = useT()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState({ name: '', hint: '' })
  const [adding, setAdding] = useState({ name: '', hint: '' })
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const run = async (id: string, action: () => Promise<void>) => {
    setBusyId(id)
    setError('')
    try { await action() } catch (err) { setError(errorText(err, t, 'common.somethingWentWrong')) } finally { setBusyId(null) }
  }
  const replace = (c: Category) => onChange(categories.map(x => x._id === c._id ? c : x))
  const patch = (c: Category, body: Partial<Category>) => run(c._id, async () => { replace((await api<{ category: Category }>(`/api/expense-categories/${c._id}`, { method: 'PATCH', body: JSON.stringify(body) })).category); setEditingId(null) })
  const remove = (c: Category) => run(c._id, async () => { await api(`/api/expense-categories/${c._id}`, { method: 'DELETE' }); onChange(categories.filter(x => x._id !== c._id)) })
  const add = (event: FormEvent) => {
    event.preventDefault()
    run('new', async () => { const { category } = await api<{ category: Category }>('/api/expense-categories', { method: 'POST', body: JSON.stringify(adding) }); onChange([...categories, category]); setAdding({ name: '', hint: '' }) })
  }

  const small = 'h-9 w-full rounded-lg border border-[#e2e7e1] bg-white px-2.5 text-xs outline-none focus:border-[#8eaf9b]'

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#202521]/30 p-0 sm:items-center sm:p-4" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={t('expenses.categoriesDialog')} onClick={e => e.stopPropagation()} className="flex max-h-[94dvh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
      <div className="flex items-center justify-between p-6 pb-3"><div><p className="text-xs uppercase tracking-[.16em] text-[#b86f3c]">{t('expenses.eyebrow')}</p><h3 className="mt-1 font-serif text-2xl font-bold">{t('expenses.categories')}</h3><p className="mt-1 text-[11px] text-[#89938b]">{t('expenses.categoriesHelp')}</p></div><button type="button" aria-label={t('common.close')} onClick={onClose} className="self-start rounded-full p-2 hover:bg-[#f2f4f0]"><X className="size-5" /></button></div>
      {error && <p role="alert" className="mx-6 rounded-lg bg-[#fdf0ec] px-3 py-2 text-xs font-medium text-[#b4472c]">{error}</p>}
      <ul className="flex-1 divide-y divide-[#f0f2ef] overflow-y-auto px-6">{categories.map(c => <li key={c._id} className={`py-3 ${c.isHidden ? 'opacity-60' : ''}`}>
        {editingId === c._id ? <form onSubmit={e => { e.preventDefault(); patch(c, draft) }} className="flex flex-col gap-2"><label className="sr-only" htmlFor={`cat-name-${c._id}`}>{t('expenses.name')}</label><input id={`cat-name-${c._id}`} autoFocus required maxLength={40} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} className={small} /><label className="sr-only" htmlFor={`cat-hint-${c._id}`}>{t('expenses.hint')}</label><input id={`cat-hint-${c._id}`} maxLength={80} placeholder={t('expenses.hintPlaceholder')} value={draft.hint} onChange={e => setDraft(d => ({ ...d, hint: e.target.value }))} className={small} /><div className="flex justify-end gap-1.5"><button type="button" onClick={() => setEditingId(null)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#68756b] hover:bg-[#f5f7f4]">{t('common.cancel')}</button><button disabled={busyId === c._id} className="rounded-lg bg-[#174d3c] px-3 py-1.5 text-xs font-semibold text-white">{t('common.save')}</button></div></form>
          : <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{c.name}{c.isHidden && <span className="ml-1.5 text-[11px] font-medium text-[#a0aaa2]">{t('expenses.hidden')}</span>}</p><p className="truncate text-[11px] text-[#89938b]">{t(c.count === 1 ? 'expenses.entryOne' : 'expenses.entryMany', { count: c.count })}{c.hint && ` · ${c.hint}`}</p></div>
            <button onClick={() => { setEditingId(c._id); setDraft({ name: c.name, hint: c.hint }) }} aria-label={t('expenses.rename', { name: c.name })} className="flex size-8 items-center justify-center rounded-lg text-[#68756b] hover:bg-[#f5f7f4]"><Pencil className="size-3.5" /></button>
            <button onClick={() => patch(c, { isHidden: !c.isHidden })} disabled={busyId === c._id} aria-label={c.isHidden ? t('expenses.show', { name: c.name }) : t('expenses.hide', { name: c.name })} title={c.isHidden ? t('expenses.showInPicker') : t('expenses.hideFromPicker')} className="flex size-8 items-center justify-center rounded-lg text-[#68756b] hover:bg-[#f5f7f4]">{c.isHidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}</button>
            <button onClick={() => remove(c)} disabled={c.count > 0 || busyId === c._id} aria-label={t('expenses.deleteCategory', { name: c.name })} title={c.count > 0 ? t('expenses.inUseHideInstead') : t('common.delete')} className="flex size-8 items-center justify-center rounded-lg text-[#b4472c] hover:bg-[#fdf0ec] disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="size-3.5" /></button>
          </div>}
      </li>)}</ul>
      <form onSubmit={add} className="flex flex-col gap-2 border-t border-[#eef1ed] p-6 pt-4"><p className="text-xs font-semibold text-[#5f6b62]">{t('expenses.addCategory')}</p><div className="flex gap-2"><label className="sr-only" htmlFor="cat-new-name">{t('expenses.name')}</label><input id="cat-new-name" required maxLength={40} placeholder={t('expenses.newNamePlaceholder')} value={adding.name} onChange={e => setAdding(a => ({ ...a, name: e.target.value }))} className={small} /><label className="sr-only" htmlFor="cat-new-hint">{t('expenses.hint')}</label><input id="cat-new-hint" maxLength={80} placeholder={t('expenses.hintOptional')} value={adding.hint} onChange={e => setAdding(a => ({ ...a, hint: e.target.value }))} className={small} /><button disabled={busyId === 'new'} className="flex h-9 shrink-0 items-center gap-1 rounded-lg bg-[#174d3c] px-3 text-xs font-semibold text-white"><Plus className="size-3.5" /> {t('common.add')}</button></div></form>
    </div>
  </div>
}
