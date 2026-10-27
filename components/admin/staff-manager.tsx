'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Loader2, Pencil, Plus, RefreshCw, Trash2, UserCog, X } from 'lucide-react'
import { useT } from '@/components/i18n-provider'
import type { TFunction } from '@/lib/i18n'
import { USER_ROLES, type Role } from '@/lib/permissions'

type StaffUser = { _id: string; name: string; email: string; role: Role; isActive?: boolean }
type FormState = { name: string; email: string; password: string; role: Role }

const emptyForm: FormState = { name: '', email: '', password: '', role: 'waiter' }
const roleStyles: Record<Role, string> = { admin: 'bg-[#174d3c] text-white', manager: 'bg-[#eaf2eb] text-[#174d3c]', cashier: 'bg-blue-50 text-blue-700', waiter: 'bg-orange-50 text-orange-700', kitchen: 'bg-amber-50 text-amber-800' }
const ROLE_KEYS = {
  admin: { label: 'staff.roles.admin.label', description: 'staff.roles.admin.description' },
  manager: { label: 'staff.roles.manager.label', description: 'staff.roles.manager.description' },
  cashier: { label: 'staff.roles.cashier.label', description: 'staff.roles.cashier.description' },
  waiter: { label: 'staff.roles.waiter.label', description: 'staff.roles.waiter.description' },
  kitchen: { label: 'staff.roles.kitchen.label', description: 'staff.roles.kitchen.description' },
} as const

async function api<T>(t: TFunction, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) window.location.href = '/admin/login'
  if (!res.ok) throw new Error(data.error ?? t('common.somethingWentWrong'))
  return data as T
}

const initialsOf = (name: string) => name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()

export function StaffManager({ currentUserId }: { currentUserId: string }) {
  const t = useT()
  const [users, setUsers] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<StaffUser | 'new' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setUsers((await api<{ users: StaffUser[] }>(t, '/api/users')).users)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('staff.loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  const toggleActive = async (user: StaffUser) => {
    setBusyId(user._id)
    setError('')
    try {
      const { user: updated } = await api<{ user: StaffUser }>(t, `/api/users/${user._id}`, { method: 'PATCH', body: JSON.stringify({ isActive: user.isActive === false }) })
      setUsers(current => current.map(u => u._id === updated._id ? updated : u))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('staff.updateError'))
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (user: StaffUser) => {
    setBusyId(user._id)
    setError('')
    try {
      await api(t, `/api/users/${user._id}`, { method: 'DELETE' })
      setUsers(current => current.filter(u => u._id !== user._id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('staff.deleteError'))
    } finally {
      setBusyId(null)
      setConfirmDelete(null)
    }
  }

  const saved = (user: StaffUser) => {
    setUsers(current => current.some(u => u._id === user._id) ? current.map(u => u._id === user._id ? user : u) : [...current, user])
    setEditing(null)
  }

  return <div>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[.17em] text-[#bc7843]">{t('staff.eyebrow')}</p><h2 className="font-serif text-3xl font-bold tracking-tight">{t('staff.title')}</h2><p className="mt-1 text-xs text-[#89938b]">{t('staff.subtitle')}</p></div><div className="flex gap-2"><button onClick={load} aria-label={t('staff.refreshAria')} className="flex size-10 items-center justify-center rounded-xl border border-[#e0e5df] bg-white text-[#68756b] hover:bg-[#f5f7f4]"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button><button onClick={() => setEditing('new')} className="flex items-center gap-2 rounded-xl bg-[#174d3c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123f31]"><Plus className="size-4" /> {t('staff.addStaff')}</button></div></div>

    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{USER_ROLES.map(role => <div key={role} className="rounded-2xl border border-[#e3e8e1] bg-white p-4"><div className="flex items-center justify-between"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${roleStyles[role]}`}>{t(ROLE_KEYS[role].label)}</span><span className="font-serif text-xl font-bold">{users.filter(u => u.role === role).length}</span></div><p className="mt-2 text-[11px] leading-snug text-[#87928a]">{t(ROLE_KEYS[role].description)}</p></div>)}</section>

    {error && <p role="alert" className="mt-5 rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{error}</p>}

    {loading && users.length === 0 ? <div className="mt-10 flex justify-center text-[#87928a]"><Loader2 className="size-6 animate-spin" /></div>
      : users.length === 0 ? <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-[#d9e0d8] bg-white px-6 py-14 text-center"><UserCog className="size-10 text-[#c7d1c7]" /><p className="mt-4 font-semibold">{t('staff.noStaff')}</p></div>
      : <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{users.map(user => {
        const isSelf = user._id === currentUserId
        const active = user.isActive !== false
        return <article key={user._id} className={`rounded-2xl border border-[#e3e8e1] bg-white p-5 transition ${active ? '' : 'opacity-60'}`}>
          <div className="flex items-start gap-3"><div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#ead8b6] text-xs font-bold text-[#714b17]">{initialsOf(user.name)}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{user.name}{isSelf && <span className="ml-1.5 text-[11px] font-medium text-[#89938b]">{t('staff.you')}</span>}</p><p className="truncate text-[11px] text-[#8a968d]">{user.email}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${roleStyles[user.role]}`}>{ROLE_KEYS[user.role] ? t(ROLE_KEYS[user.role].label) : user.role}</span></div>
          {!active && <p className="mt-3 text-[11px] font-semibold text-[#b4472c]">{t('staff.disabledNote')}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button onClick={() => toggleActive(user)} disabled={isSelf || busyId === user._id} title={isSelf ? t('staff.cantDisableSelf') : undefined} className="h-9 flex-1 rounded-lg border border-[#e2e7e1] px-3 text-xs font-medium text-[#68756b] hover:bg-[#f5f7f4] disabled:cursor-not-allowed disabled:opacity-50">{active ? t('staff.disable') : t('staff.enable')}</button>
            <button onClick={() => setEditing(user)} aria-label={t('staff.editAria', { name: user.name })} className="flex size-9 items-center justify-center rounded-lg border border-[#e2e7e1] text-[#68756b] hover:bg-[#f5f7f4]"><Pencil className="size-3.5" /></button>
            <button onClick={() => setConfirmDelete(user._id)} disabled={isSelf} aria-label={t('staff.deleteAria', { name: user.name })} className="flex size-9 items-center justify-center rounded-lg border border-[#e2e7e1] text-[#b4472c] hover:bg-[#fdf0ec] disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="size-3.5" /></button>
          </div>
          {confirmDelete === user._id && <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-[#fdf0ec] px-3 py-2.5"><p className="text-xs font-medium text-[#b4472c]">{t('staff.confirmDelete', { name: user.name.split(' ')[0] })}</p><div className="flex gap-1.5"><button onClick={() => setConfirmDelete(null)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#68756b] hover:bg-white">{t('common.cancel')}</button><button onClick={() => remove(user)} disabled={busyId === user._id} className="rounded-lg bg-[#b4472c] px-2.5 py-1.5 text-xs font-semibold text-white">{t('common.delete')}</button></div></div>}
        </article>
      })}</div>}

    {editing && <StaffForm user={editing === 'new' ? null : editing} isSelf={editing !== 'new' && editing._id === currentUserId} onClose={() => setEditing(null)} onSaved={saved} />}
  </div>
}

function StaffForm({ user, isSelf, onClose, onSaved }: { user: StaffUser | null; isSelf: boolean; onClose: () => void; onSaved: (user: StaffUser) => void }) {
  const t = useT()
  const [form, setForm] = useState<FormState>(user ? { name: user.name, email: user.email, password: '', role: user.role } : emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(current => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const body = JSON.stringify(form)
      const { user: result } = user
        ? await api<{ user: StaffUser }>(t, `/api/users/${user._id}`, { method: 'PATCH', body })
        : await api<{ user: StaffUser }>(t, '/api/users', { method: 'POST', body })
      onSaved(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('staff.saveError'))
      setSaving(false)
    }
  }

  const input = 'mt-1.5 h-11 w-full rounded-xl border border-[#e2e7e1] bg-[#fbfcfb] px-3 text-sm outline-none focus:border-[#8eaf9b]'
  const label = 'block text-xs font-semibold text-[#5f6b62]'

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#202521]/30 p-0 sm:items-center sm:p-4" onClick={onClose}>
    <form onSubmit={submit} onClick={e => e.stopPropagation()} className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl">
      <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.16em] text-[#b86f3c]">{user ? t('staff.editStaff') : t('staff.newStaff')}</p><h3 className="mt-1 font-serif text-2xl font-bold">{user ? user.name : t('staff.addMember')}</h3></div><button type="button" aria-label={t('common.close')} onClick={onClose} className="rounded-full p-2 hover:bg-[#f2f4f0]"><X className="size-5" /></button></div>
      <div className="mt-6 grid gap-4">
        <div><label className={label} htmlFor="s-name">{t('staff.name')}</label><input id="s-name" required maxLength={60} value={form.name} onChange={e => set('name', e.target.value)} className={input} /></div>
        <div><label className={label} htmlFor="s-email">{t('staff.emailLabel')}</label><input id="s-email" type="email" required autoComplete="off" value={form.email} onChange={e => set('email', e.target.value)} className={input} /></div>
        <div><label className={label} htmlFor="s-password">{user ? <>{t('staff.newPassword')} <span className="font-normal text-[#a0aaa2]">{t('staff.leaveBlank')}</span></> : t('staff.password')}</label><input id="s-password" type="password" autoComplete="new-password" minLength={8} required={!user} placeholder={t('staff.passwordPlaceholder')} value={form.password} onChange={e => set('password', e.target.value)} className={input} />{user && !isSelf && <p className="mt-1.5 text-[11px] text-[#89938b]">{t('staff.signsOutNote')}</p>}</div>
        <fieldset disabled={isSelf}><legend className={label}>{t('staff.role')}{isSelf && <span className="font-normal text-[#a0aaa2]"> {t('staff.cantChangeOwnRoleHint')}</span>}</legend>
          <div className="mt-1.5 grid gap-2">{USER_ROLES.map(role => <label key={role} className={`flex items-start gap-3 rounded-xl border p-3 transition ${form.role === role ? 'border-[#8eaf9b] bg-[#f0f5f0]' : 'border-[#e2e7e1] hover:bg-[#fbfcfb]'} ${isSelf ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}><input type="radio" name="role" value={role} checked={form.role === role} onChange={() => set('role', role)} className="mt-0.5 size-4 accent-[#174d3c]" /><span><span className="block text-sm font-semibold">{t(ROLE_KEYS[role].label)}</span><span className="block text-[11px] text-[#87928a]">{t(ROLE_KEYS[role].description)}</span></span></label>)}</div>
        </fieldset>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-[#fdf0ec] px-3 py-2 text-xs font-medium text-[#b4472c]">{error}</p>}
      <div className="mt-6 flex gap-2"><button type="button" onClick={onClose} className="h-11 flex-1 rounded-xl border border-[#e2e7e1] text-sm font-semibold text-[#68756b] hover:bg-[#f5f7f4]">{t('common.cancel')}</button><button disabled={saving} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#174d3c] text-sm font-semibold text-white hover:bg-[#123f31] disabled:opacity-70">{saving && <Loader2 className="size-4 animate-spin" />}{user ? t('common.saveChanges') : t('staff.addStaff')}</button></div>
    </form>
  </div>
}
