'use client'

import { useState, type FormEvent } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { useT } from '@/components/i18n-provider'
import type { ShopInfo } from '@/lib/shop'
import { useShop } from './shop-context'

const FIELDS = [
  { key: 'name', max: 60, required: true },
  { key: 'tagline', max: 80 },
  { key: 'address', max: 160 },
  { key: 'phone', max: 30 },
  { key: 'thanks', max: 80 },
  { key: 'orderPrefix', max: 6 },
] as const

/** Shop details printed on receipts and reports. Admins edit them; managers only see them. */
export function ShopSettings({ canEdit }: { canEdit: boolean }) {
  const t = useT()
  const { shop, setShop } = useShop()
  const [draft, setDraft] = useState<ShopInfo>(shop)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/api/shop', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) })
      if (res.status === 401) { window.location.href = '/admin/login'; return }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? t('settings.saveFailed'))
      setShop(data.shop)
      setDraft(data.shop)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return <div>
    <div className="mb-7"><p className="mb-1 text-xs font-semibold uppercase tracking-[.17em] text-[#bc7843]">{t('settings.eyebrow')}</p><h2 className="font-serif text-3xl font-bold tracking-tight">{t('settings.title')}</h2><p className="mt-1 max-w-xl text-xs text-[#89938b]">{t(canEdit ? 'settings.subtitle' : 'settings.readOnly')}</p></div>

    <form onSubmit={save} className="max-w-2xl space-y-4 rounded-2xl border border-[#e3e8e1] bg-white p-5">
      {FIELDS.map(f => <div key={f.key}>
        <label htmlFor={`shop-${f.key}`} className="mb-1.5 block text-xs font-semibold text-[#4f5b52]">{t(`settings.fields.${f.key}`)}</label>
        <input
          id={`shop-${f.key}`}
          required={'required' in f && f.required}
          maxLength={f.max}
          disabled={!canEdit}
          value={draft[f.key]}
          onChange={e => { setSaved(false); setDraft(d => ({ ...d, [f.key]: f.key === 'orderPrefix' ? e.target.value.toUpperCase() : e.target.value })) }}
          className="h-11 w-full rounded-xl border border-[#e2e7e1] bg-white px-3 text-sm outline-none focus:border-[#8eaf9b] disabled:bg-[#f7f8f6] disabled:text-[#68756b]"
        />
        {f.key === 'orderPrefix' && <p className="mt-1 text-[11px] text-[#89938b]">{t('settings.prefixHint', { example: `${draft.orderPrefix || 'ORD'}-1001` })}</p>}
      </div>)}

      {error && <p role="alert" className="rounded-xl bg-[#fdf0ec] px-4 py-3 text-xs font-medium text-[#b4472c]">{error}</p>}
      {canEdit && <div className="flex items-center gap-3">
        <button disabled={saving} className="flex h-11 items-center gap-2 rounded-xl bg-[#174d3c] px-5 text-sm font-semibold text-white hover:bg-[#123f31] disabled:opacity-70">{saving && <Loader2 className="size-4 animate-spin" />} {t('common.saveChanges')}</button>
        {saved && <span role="status" className="flex items-center gap-1 text-xs font-semibold text-[#2f7a55]"><Check className="size-4" /> {t('settings.saved')}</span>}
      </div>}
    </form>
  </div>
}
