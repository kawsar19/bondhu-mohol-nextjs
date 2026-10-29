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
