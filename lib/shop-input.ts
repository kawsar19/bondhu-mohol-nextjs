import type { TFunction } from './i18n'
import type { ShopInfo } from './shop'

const TEXT_LIMITS = { name: 60, tagline: 80, address: 160, phone: 30, thanks: 80 } as const

/** Picks and validates the shop details an admin may edit. Every field is optional (PATCH). */
export function parseShopInput(body: unknown, t: TFunction): { data: Partial<ShopInfo>; error?: never } | { data?: never; error: string } {
  if (!body || typeof body !== 'object') return { error: t('common.invalidRequest') }
  const raw = body as Record<string, unknown>
  const data: Partial<ShopInfo> = {}

  for (const [field, max] of Object.entries(TEXT_LIMITS) as [keyof typeof TEXT_LIMITS, number][]) {
    const value = raw[field]
    if (value === undefined) continue
    if (typeof value !== 'string' || value.length > max) return { error: t('settings.api.tooLong', { field: t(`settings.fields.${field}`), max }) }
    data[field] = value.trim()
  }
  if (data.name === '') return { error: t('settings.api.nameRequired') }

  if (raw.orderPrefix !== undefined) {
    const prefix = typeof raw.orderPrefix === 'string' ? raw.orderPrefix.trim().toUpperCase() : ''
    if (!/^[A-Z0-9]{1,6}$/.test(prefix)) return { error: t('settings.api.prefixInvalid') }
    data.orderPrefix = prefix
  }
  return { data }
}
