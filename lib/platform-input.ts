import type { TFunction } from './i18n'
import { parseShopInput } from './shop-input'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type NewShopInput = { name: string; orderPrefix: string; adminName: string; adminEmail: string; adminPassword: string }

/** A new shop and its first admin, from the super admin's form. */
export function parseNewShopInput(body: unknown, t: TFunction): { data: NewShopInput; error?: never } | { data?: never; error: string } {
  if (!body || typeof body !== 'object') return { error: t('common.invalidRequest') }
  const raw = body as Record<string, unknown>
  if (typeof raw.name !== 'string' || !raw.name.trim()) return { error: t('settings.api.nameRequired') }
  const shop = parseShopInput({ name: raw.name, orderPrefix: raw.orderPrefix || 'ORD' }, t)
  if (!shop.data) return { error: shop.error }

  const adminName = typeof raw.adminName === 'string' ? raw.adminName.trim() : ''
  if (!adminName || adminName.length > 60) return { error: t('staff.errors.nameRequired') }
  const adminEmail = typeof raw.adminEmail === 'string' ? raw.adminEmail.trim().toLowerCase() : ''
  if (!EMAIL_RE.test(adminEmail) || adminEmail.length > 120) return { error: t('staff.errors.invalidEmail') }
  const adminPassword = typeof raw.adminPassword === 'string' ? raw.adminPassword : ''
  if (adminPassword.length < 8 || adminPassword.length > 100) return { error: t('staff.errors.passwordTooShort') }

  return { data: { name: shop.data.name!, orderPrefix: shop.data.orderPrefix!, adminName, adminEmail, adminPassword } }
}

export type ShopChanges = { name?: string; orderPrefix?: string; isActive?: boolean; resetAdmin?: { userId: string; password: string } }

/** Changes the super admin may make to a shop: rename, new order prefix, switch on/off, or reset an admin's password. */
export function parseShopChanges(body: unknown, t: TFunction): { data: ShopChanges; error?: never } | { data?: never; error: string } {
  if (!body || typeof body !== 'object') return { error: t('common.invalidRequest') }
  const raw = body as Record<string, unknown>
  const shop = parseShopInput({ name: raw.name, orderPrefix: raw.orderPrefix }, t)
  if (!shop.data) return { error: shop.error }
  const data: ShopChanges = { ...shop.data }

  if (raw.isActive !== undefined) {
    if (typeof raw.isActive !== 'boolean') return { error: t('common.invalidRequest') }
    data.isActive = raw.isActive
  }
  if (raw.resetAdmin !== undefined) {
    const reset = raw.resetAdmin as Record<string, unknown> | null
    if (typeof reset?.userId !== 'string' || typeof reset.password !== 'string') return { error: t('common.invalidRequest') }
    if (reset.password.length < 8 || reset.password.length > 100) return { error: t('staff.errors.passwordTooShort') }
    data.resetAdmin = { userId: reset.userId, password: reset.password }
  }
  if (Object.keys(data).length === 0) return { error: t('platform.api.nothingToChange') }
  return { data }
}
