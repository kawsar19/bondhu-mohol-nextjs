import { isValidObjectId } from 'mongoose'
import type { TFunction } from './i18n'
import { parseBusinessDate } from './time'

// Each ingredient line gives either what was left (counted by hand) or what was used; the other is worked out.
export type DayItemInput = { ingredient: string; closing?: number; used?: number }
export type SectionDayInput = {
  section: string
  date: Date
  items: DayItemInput[]
  production: { menuItem: string; quantity: number }[]
  ownersShare: { item: string; quantity: string; takenBy: string }[]
  note: string
}

type Result = { data: SectionDayInput; error?: never } | { data?: never; error: string }

const text = (raw: unknown, max: number) => (typeof raw === 'string' ? raw.trim().slice(0, max) : '')
const amount = (raw: unknown) => {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 && n <= 100000 ? Math.round(n * 1000) / 1000 : null
}

/** Validates a section's end-of-day entry. Whether the ids exist, and the stock, are checked by the route. */
export function parseSectionDayInput(body: unknown, t: TFunction): Result {
  if (!body || typeof body !== 'object') return { error: t('common.invalidRequest') }
  const raw = body as Record<string, unknown>

  if (typeof raw.section !== 'string' || !isValidObjectId(raw.section)) return { error: t('daily.api.chooseSection') }
  const date = parseBusinessDate(raw.date)
  if (!date) return { error: t('daily.api.invalidDate') }
  if (date.getTime() > Date.now()) return { error: t('daily.api.futureDate') }

  const list = (value: unknown) => (Array.isArray(value) ? (value as Record<string, unknown>[]) : value === undefined ? [] : null)
  const rawItems = list(raw.items), rawProduction = list(raw.production), rawShare = list(raw.ownersShare)
  if (!rawItems || !rawProduction || !rawShare) return { error: t('common.invalidRequest') }
  if (rawItems.length > 200 || rawProduction.length > 200 || rawShare.length > 50) return { error: t('daily.api.tooMany') }

  const items: DayItemInput[] = []
  for (const item of rawItems) {
    if (!item || typeof item.ingredient !== 'string' || !isValidObjectId(item.ingredient)) return { error: t('common.invalidRequest') }
    if (items.some(i => i.ingredient === item.ingredient)) return { error: t('daily.api.duplicate') }
    const hasClosing = item.closing !== undefined && item.closing !== null && item.closing !== ''
    const hasUsed = item.used !== undefined && item.used !== null && item.used !== ''
    if (hasClosing === hasUsed) return { error: t('daily.api.closingOrUsed') }
    const value = amount(hasClosing ? item.closing : item.used)
    if (value === null) return { error: t('daily.api.amountInvalid') }
    items.push(hasClosing ? { ingredient: item.ingredient, closing: value } : { ingredient: item.ingredient, used: value })
  }

  const production: SectionDayInput['production'] = []
  for (const p of rawProduction) {
    if (!p || typeof p.menuItem !== 'string' || !isValidObjectId(p.menuItem)) return { error: t('common.invalidRequest') }
    if (production.some(x => x.menuItem === p.menuItem)) return { error: t('daily.api.duplicate') }
    const quantity = amount(p.quantity)
    if (quantity === null) return { error: t('daily.api.amountInvalid') }
    if (quantity > 0) production.push({ menuItem: p.menuItem, quantity })
  }

  const ownersShare: SectionDayInput['ownersShare'] = []
  for (const s of rawShare) {
    const item = text(s?.item, 60)
    if (!item) continue
    ownersShare.push({ item, quantity: text(s.quantity, 30), takenBy: text(s.takenBy, 60) })
  }

  return { data: { section: raw.section, date, items, production, ownersShare, note: text(raw.note, 300) } }
}
