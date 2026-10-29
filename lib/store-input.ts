import { isValidObjectId } from 'mongoose'
import type { TFunction } from './i18n'
import { parseBusinessDate } from './time'

export type PurchaseInput = { date: Date; ingredient: string; quantity: number; cost: number; category: string; paidTo: string; note: string }

type Result = { data: PurchaseInput; error?: never } | { data?: never; error: string }

function text(raw: unknown, max: number) {
  return typeof raw === 'string' ? raw.trim().slice(0, max) : ''
}

/** Validates a bazar purchase. Whether the ingredient and category exist is checked by the route. */
export function parsePurchaseInput(body: unknown, t: TFunction): Result {
  if (!body || typeof body !== 'object') return { error: t('common.invalidRequest') }
  const raw = body as Record<string, unknown>

  const date = parseBusinessDate(raw.date)
  if (!date) return { error: t('store.api.invalidDate') }
  if (date.getTime() > Date.now()) return { error: t('store.api.futureDate') }

  if (typeof raw.ingredient !== 'string' || !isValidObjectId(raw.ingredient)) return { error: t('store.api.chooseIngredient') }

  const quantity = Number(raw.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) return { error: t('store.api.quantityPositive') }

  const cost = Number(raw.cost)
  if (!Number.isFinite(cost) || cost <= 0 || cost > 10000000) return { error: t('store.api.costPositive') }

  const category = text(raw.category, 40)
  if (!category) return { error: t('store.api.chooseCategory') }

  return {
    data: {
      date,
      ingredient: raw.ingredient,
      quantity: Math.round(quantity * 1000) / 1000,
      cost: Math.round(cost * 100) / 100,
      category,
      paidTo: text(raw.paidTo, 60),
      note: text(raw.note, 200),
    },
  }
}

export type TransferInput = { date: Date; section: string; items: { ingredient: string; quantity: number }[]; note: string }

/** Validates one send from the mother store to a section, with one or more items. Stock is checked by the route. */
export function parseTransferInput(body: unknown, t: TFunction): { data: TransferInput; error?: never } | { data?: never; error: string } {
  if (!body || typeof body !== 'object') return { error: t('common.invalidRequest') }
  const raw = body as Record<string, unknown>

  const date = parseBusinessDate(raw.date)
  if (!date) return { error: t('store.api.invalidDate') }
  if (date.getTime() > Date.now()) return { error: t('store.api.futureDate') }

  if (typeof raw.section !== 'string' || !isValidObjectId(raw.section)) return { error: t('store.api.chooseSection') }

  if (!Array.isArray(raw.items) || raw.items.length === 0) return { error: t('store.api.noItems') }
  if (raw.items.length > 50) return { error: t('store.api.tooManyItems', { max: 50 }) }
  const items: TransferInput['items'] = []
  for (const item of raw.items as Record<string, unknown>[]) {
    if (!item || typeof item.ingredient !== 'string' || !isValidObjectId(item.ingredient)) return { error: t('store.api.chooseIngredient') }
    const quantity = Number(item.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) return { error: t('store.api.quantityPositive') }
    if (items.some(i => i.ingredient === item.ingredient)) return { error: t('store.api.duplicateItem') }
    items.push({ ingredient: item.ingredient, quantity: Math.round(quantity * 1000) / 1000 })
  }

  return { data: { date, section: raw.section, items, note: text(raw.note, 200) } }
}

export type CountInput = { items: { ingredient: string; counted: number }[]; note: string }

/** Validates a hand count of the mother store: what was actually found for one or more ingredients. */
export function parseCountInput(body: unknown, t: TFunction): { data: CountInput; error?: never } | { data?: never; error: string } {
  if (!body || typeof body !== 'object') return { error: t('common.invalidRequest') }
  const raw = body as Record<string, unknown>
  if (!Array.isArray(raw.items) || raw.items.length === 0) return { error: t('store.api.noItems') }
  if (raw.items.length > 200) return { error: t('store.api.tooManyItems', { max: 200 }) }
  const items: CountInput['items'] = []
  for (const item of raw.items as Record<string, unknown>[]) {
    if (!item || typeof item.ingredient !== 'string' || !isValidObjectId(item.ingredient)) return { error: t('store.api.chooseIngredient') }
    const counted = Number(item.counted)
    if (item.counted === '' || item.counted === null || !Number.isFinite(counted) || counted < 0 || counted > 100000) return { error: t('store.api.countInvalid') }
    if (items.some(i => i.ingredient === item.ingredient)) return { error: t('store.api.duplicateItem') }
    items.push({ ingredient: item.ingredient, counted: Math.round(counted * 1000) / 1000 })
  }
  return { data: { items, note: text(raw.note, 200) } }
}
