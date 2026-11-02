'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Loader2, LogOut, Pencil, Plus, Power, RefreshCw, Search, ShieldCheck, Store, X } from 'lucide-react'
import { useIntlLocale, useT } from '@/components/i18n-provider'
import { LanguageSwitch } from '@/components/language-switch'
import type { TFunction } from '@/lib/i18n'

type ShopRow = {
  _id: string
  name: string
  orderPrefix: string
  address: string
  isActive: boolean
  createdAt: string
  staff: number
  admins: { _id: string; name: string; email: string }[]
  orders: number
  sales: number
  orders30: number
  sales30: number
  ordersToday: number
  salesToday: number
  lastOrderAt: string | null
}
type Totals = { shops: number; active: number; inactive: number; newLast30: number; inUse: number; staff: number; ordersToday: number; salesToday: number; sales30: number }
type Panel = { kind: 'new' } | { kind: 'edit'; shop: ShopRow } | { kind: 'password'; shop: ShopRow } | null
type Filter = 'all' | 'active' | 'off'

const taka = (n: number) => `৳ ${n.toLocaleString('en-IN')}`

async function api<T>(t: TFunction, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) window.location.href = '/platform/login'
  if (!res.ok) throw new Error(data.error ?? t('common.somethingWentWrong'))
  return data as T
}

export function PlatformDashboard({ admin }: { admin: { name: string; email: string } }) {
  const t = useT()
  const intl = useIntlLocale()
  const router = useRouter()
  const [shops, setShops] = useState<ShopRow[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [panel, setPanel] = useState<Panel>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api<{ shops: ShopRow[]; totals: Totals }>(t, '/api/platform/shops', { cache: 'no-store' })
      setShops(data.shops)
      setTotals(data.totals)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('platform.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])
  useEffect(() => { load() }, [load])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return shops.filter(s => (filter === 'all' || (filter === 'active') === s.isActive)
      && (!q || s.name.toLowerCase().includes(q) || s.orderPrefix.toLowerCase().includes(q) || s.admins.some(a => a.email.includes(q))))
  }, [shops, query, filter])

  const toggle = async (shop: ShopRow) => {
    if (shop.isActive && !window.confirm(t('platform.confirmOff', { name: shop.name }))) return
    setBusyId(shop._id)
    setError('')
    try {
      await api(t, `/api/platform/shops/${shop._id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !shop.isActive }) })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWentWrong'))
    } finally {
      setBusyId(null)
    }
  }

  const logout = async () => {
    await fetch('/api/platform/logout', { method: 'POST' })
    router.replace('/platform/login')
    router.refresh()
  }

  const day = (iso: string | null) => iso ? new Date(iso).toLocaleDateString(intl, { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', year: 'numeric' }) : t('platform.never')
  const tiles: [string, string, string?][] = totals ? [
    [t('platform.totals.shops'), String(totals.shops), t('platform.totals.newLast30', { count: totals.newLast30 })],
    [t('platform.totals.active'), String(totals.active), t('platform.totals.inactive', { count: totals.inactive })],
    [t('platform.totals.inUse'), String(totals.inUse), t('platform.totals.inUseHint')],
    [t('platform.totals.staff'), String(totals.staff)],
    [t('platform.totals.ordersToday'), String(totals.ordersToday), taka(totals.salesToday)],
    [t('platform.totals.sales30'), taka(totals.sales30)],
  ] : []

  return <div className="min-h-screen bg-[#f3f4f1] text-[#202521]">
    <header className="border-b border-[#e3e7e1] bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-[#202521] text-white"><ShieldCheck className="size-5" /></div>
        <div className="min-w-0 flex-1"><p className="text-sm font-bold">{t('platform.eyebrow')}</p><p className="truncate text-[11px] text-[#89938b]">{admin.name} · {admin.email}</p></div>
        <LanguageSwitch />
        <button onClick={logout} aria-label={t('platform.signOut')} className="flex size-9 items-center justify-center rounded-xl border border-[#e0e5df] text-[#68756b] hover:bg-[#f5f7f4]"><LogOut className="size-4" /></button>
      </div>
    </header>

    <main className="mx-auto max-w-6xl px-4 py-7">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="font-serif text-3xl font-bold tracking-tight">{t('platform.title')}</h1><p className="mt-1 text-xs text-[#89938b]">{t('platform.subtitle')}</p></div>
        <div className="flex gap-2">
          <button onClick={load} aria-label={t('common.refresh')} className="flex size-10 items-center justify-center rounded-xl border border-[#e0e5df] bg-white text-[#68756b] hover:bg-[#f5f7f4]"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button onClick={() => setPanel({ kind: 'new' })} className="flex h-10 items-center gap-2 rounded-xl bg-[#174d3c] px-4 text-sm font-semibold text-white hover:bg-[#123f31]"><Plus className="size-4" /> {t('platform.newShop')}</button>
        </div>
      </div>

      {tiles.length > 0 && <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {tiles.map(([label, value, sub]) => <div key={label} className="rounded-2xl border border-[#e3e8e1] bg-white p-4"><p className="text-[11px] font-semibold text-[#7c877f]">{label}</p><p className="mt-1 font-serif text-2xl font-bold tabular-nums">{value}</p>{sub && <p className="mt-0.5 text-[11px] text-[#9aa39c]">{sub}</p>}</div>)}
      </div>}

      {notice && <p role="status" className="mb-4 rounded-xl bg-[#e9f4ec] px-4 py-3 text-xs font-medium text-[#2f7a55]">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{error}</p>}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 sm:max-w-xs"><span className="sr-only">{t('common.search')}</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9aa39c]" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('platform.searchPlaceholder')} className="h-10 w-full rounded-xl border border-[#e2e7e1] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#8eaf9b]" /></label>
        <div role="group" className="inline-flex rounded-xl border border-[#e2e7e1] bg-white p-0.5">
          {(['all', 'active', 'off'] as const).map(f => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)} className={`h-8 rounded-lg px-3 text-xs font-semibold ${filter === f ? 'bg-[#202521] text-white' : 'text-[#5f6b62] hover:bg-[#f5f7f4]'}`}>{t(`platform.filter.${f}`)}</button>)}
        </div>
      </div>

      {loading && shops.length === 0 ? <div className="mt-10 flex justify-center text-[#87928a]"><Loader2 className="size-6 animate-spin" /></div>
        : visible.length === 0 ? <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#d9e0d8] bg-white px-6 py-14 text-center"><Store className="size-10 text-[#c7d1c7]" /><p className="mt-4 font-semibold">{t(shops.length ? 'platform.noMatch' : 'platform.emptyTitle')}</p></div>
        : <ul className="grid gap-3 md:grid-cols-2">{visible.map(s => <li key={s._id} className={`rounded-2xl border bg-white p-4 ${s.isActive ? 'border-[#e3e8e1]' : 'border-[#f1d9d0] bg-[#fffaf8]'}`}>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-semibold">{s.name}<span className="rounded-md bg-[#f1f3f0] px-1.5 py-0.5 font-mono text-[10px] text-[#5f6b62]">{s.orderPrefix}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.isActive ? 'bg-[#e9f4ec] text-[#2f7a55]' : 'bg-[#fdf0ec] text-[#b4472c]'}`}>{t(s.isActive ? 'platform.status.on' : 'platform.status.off')}</span></p>
              <p className="mt-0.5 truncate text-[11px] text-[#89938b]">{s.admins.map(a => a.email).join(', ') || t('platform.noAdmin')}</p>
            </div>
            <button onClick={() => setPanel({ kind: 'edit', shop: s })} aria-label={t('platform.editLabel', { name: s.name })} className="flex size-8 items-center justify-center rounded-lg text-[#68756b] hover:bg-[#f5f7f4]"><Pencil className="size-3.5" /></button>
            <button onClick={() => setPanel({ kind: 'password', shop: s })} disabled={s.admins.length === 0} aria-label={t('platform.resetLabel', { name: s.name })} className="flex size-8 items-center justify-center rounded-lg text-[#68756b] hover:bg-[#f5f7f4] disabled:opacity-30"><KeyRound className="size-3.5" /></button>
            <button onClick={() => toggle(s)} disabled={busyId === s._id} aria-label={t(s.isActive ? 'platform.turnOff' : 'platform.turnOn', { name: s.name })} title={t(s.isActive ? 'platform.turnOff' : 'platform.turnOn', { name: s.name })} className={`flex size-8 items-center justify-center rounded-lg ${s.isActive ? 'text-[#b4472c] hover:bg-[#fdf0ec]' : 'text-[#2f7a55] hover:bg-[#e9f4ec]'}`}>{busyId === s._id ? <Loader2 className="size-3.5 animate-spin" /> : <Power className="size-3.5" />}</button>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-[#f0f2ef] pt-3 text-[11px]">
            {[[t('platform.row.today'), `${s.ordersToday} · ${taka(s.salesToday)}`], [t('platform.row.last30'), `${s.orders30} · ${taka(s.sales30)}`], [t('platform.row.allTime'), `${s.orders} · ${taka(s.sales)}`], [t('platform.row.staff'), String(s.staff)], [t('platform.row.lastOrder'), day(s.lastOrderAt)], [t('platform.row.joined'), day(s.createdAt)]].map(([k, v]) => <div key={k}><dt className="text-[#9aa39c]">{k}</dt><dd className="font-semibold tabular-nums">{v}</dd></div>)}
          </dl>
        </li>)}</ul>}
    </main>

    {panel && <PanelDialog panel={panel} onClose={() => setPanel(null)} onDone={async message => { setPanel(null); setNotice(message); await load() }} />}
  </div>
}

function PanelDialog({ panel, onClose, onDone }: { panel: NonNullable<Panel>; onClose: () => void; onDone: (message: string) => void }) {
  const t = useT()
  const shop = panel.kind === 'new' ? null : panel.shop
  const [form, setForm] = useState({ name: shop?.name ?? '', orderPrefix: shop?.orderPrefix ?? '', adminName: '', adminEmail: '', adminPassword: '', userId: shop?.admins[0]?._id ?? '', password: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [key]: key === 'orderPrefix' ? e.target.value.toUpperCase() : e.target.value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (panel.kind === 'new') {
        await api(t, '/api/platform/shops', { method: 'POST', body: JSON.stringify({ name: form.name, orderPrefix: form.orderPrefix, adminName: form.adminName, adminEmail: form.adminEmail, adminPassword: form.adminPassword }) })
        onDone(t('platform.created', { name: form.name, email: form.adminEmail.trim().toLowerCase() }))
      } else if (panel.kind === 'edit') {
        await api(t, `/api/platform/shops/${panel.shop._id}`, { method: 'PATCH', body: JSON.stringify({ name: form.name, orderPrefix: form.orderPrefix }) })
        onDone(t('platform.saved', { name: form.name }))
      } else {
        await api(t, `/api/platform/shops/${panel.shop._id}`, { method: 'PATCH', body: JSON.stringify({ resetAdmin: { userId: form.userId, password: form.password } }) })
        onDone(t('platform.passwordReset', { email: panel.shop.admins.find(a => a._id === form.userId)?.email ?? '' }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWentWrong'))
      setSaving(false)
    }
  }

  const input = 'mt-1.5 h-11 w-full rounded-xl border border-[#e2e7e1] bg-white px-3 text-sm outline-none focus:border-[#8eaf9b]'
  const label = 'mt-4 block text-xs font-semibold text-[#5f6b62]'
  const title = panel.kind === 'new' ? t('platform.newShop') : panel.kind === 'edit' ? t('platform.editTitle') : t('platform.resetTitle')

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4" onClick={onClose}>
    <form role="dialog" aria-modal="true" aria-label={title} onSubmit={submit} onClick={e => e.stopPropagation()} className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
      <div className="flex items-start justify-between gap-3"><div><h2 className="font-serif text-xl font-bold">{title}</h2>{shop && <p className="text-xs text-[#89938b]">{shop.name}</p>}</div><button type="button" onClick={onClose} aria-label={t('common.close')} className="flex size-8 items-center justify-center rounded-lg text-[#68756b] hover:bg-[#f5f7f4]"><X className="size-4" /></button></div>

      {panel.kind !== 'password' && <>
        <label className={label} htmlFor="p-name">{t('settings.fields.name')}</label>
        <input id="p-name" required maxLength={60} value={form.name} onChange={set('name')} className={input} />
        <label className={label} htmlFor="p-prefix">{t('settings.fields.orderPrefix')}</label>
        <input id="p-prefix" maxLength={6} placeholder="ORD" value={form.orderPrefix} onChange={set('orderPrefix')} className={input} />
        <p className="mt-1 text-[11px] text-[#89938b]">{t('settings.prefixHint', { example: `${form.orderPrefix || 'ORD'}-1001` })}</p>
      </>}

      {panel.kind === 'new' && <>
        <p className="mt-5 border-t border-[#f0f2ef] pt-4 text-xs font-bold uppercase tracking-wider text-[#bc7843]">{t('platform.firstAdmin')}</p>
        <label className={label} htmlFor="p-aname">{t('platform.adminName')}</label>
        <input id="p-aname" required maxLength={60} value={form.adminName} onChange={set('adminName')} className={input} />
        <label className={label} htmlFor="p-aemail">{t('auth.email')}</label>
        <input id="p-aemail" type="email" required value={form.adminEmail} onChange={set('adminEmail')} className={input} />
        <label className={label} htmlFor="p-apass">{t('auth.password')}</label>
        <input id="p-apass" type="text" required minLength={8} autoComplete="new-password" value={form.adminPassword} onChange={set('adminPassword')} className={input} />
        <p className="mt-1 text-[11px] text-[#89938b]">{t('platform.passwordHint')}</p>
      </>}

      {panel.kind === 'password' && <>
        <label className={label} htmlFor="p-user">{t('platform.whichAdmin')}</label>
        <select id="p-user" value={form.userId} onChange={set('userId')} className={input}>{panel.shop.admins.map(a => <option key={a._id} value={a._id}>{a.name} ({a.email})</option>)}</select>
        <label className={label} htmlFor="p-pass">{t('platform.newPassword')}</label>
        <input id="p-pass" type="text" required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} className={input} />
        <p className="mt-1 text-[11px] text-[#89938b]">{t('platform.resetHint')}</p>
      </>}

      {error && <p role="alert" className="mt-4 rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{error}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="h-11 rounded-xl px-4 text-sm font-semibold text-[#68756b] hover:bg-[#f5f7f4]">{t('common.cancel')}</button>
        <button disabled={saving} className="flex h-11 items-center gap-2 rounded-xl bg-[#174d3c] px-5 text-sm font-semibold text-white hover:bg-[#123f31] disabled:opacity-70">{saving && <Loader2 className="size-4 animate-spin" />} {panel.kind === 'new' ? t('platform.create') : t('common.saveChanges')}</button>
      </div>
    </form>
  </div>
}
