import type { TFunction } from './i18n'
import { parseBusinessDate } from './time'

export type ExpenseInput = {
  date?: Date
  category?: string
  item?: string
  quantity?: string
  amount?: number
  paidTo?: string
  note?: string
}

type Result = { data: ExpenseInput; error?: never } | { data?: never; error: string }

function text(t: TFunction, raw: unknown, field: string, max: number): { value?: string; error?: string } {
  if (typeof raw !== 'string') return { error: t('expenses.errors.mustBeText', { field }) }
  const value = raw.trim()
  if (value.length > max) return { error: t('expenses.errors.tooLong', { field, max }) }
  return { value }
}

/** Picks and validates the editable expense fields. With `partial`, missing fields are allowed (for PATCH). */
export function parseExpenseInput(body: unknown, t: TFunction, partial = false): Result {
  if (!body || typeof body !== 'object') return { error: t('common.invalidRequest') }
  const raw = body as Record<string, unknown>
  const data: ExpenseInput = {}

  if (raw.date !== undefined) {
    const date = parseBusinessDate(raw.date)
    if (!date) return { error: t('expenses.errors.invalidDate') }
    if (date.getTime() > Date.now()) return { error: t('expenses.errors.futureDate') }
    data.date = date
  } else if (!partial) return { error: t('expenses.errors.dateRequired') }

  if (raw.category !== undefined) {
    // Whether the category exists is checked by the route, which has the database.
    const category = text(t, raw.category, t('expenses.fields.category'), 40)
    if (category.error || !category.value) return { error: t('expenses.errors.chooseCategory') }
    data.category = category.value
  } else if (!partial) return { error: t('expenses.errors.categoryRequired') }

  if (raw.item !== undefined) {
    const item = text(t, raw.item, t('expenses.fields.item'), 80)
    if (item.error) return { error: item.error }
    if (!item.value) return { error: t('expenses.errors.itemRequired') }
    data.item = item.value
  } else if (!partial) return { error: t('expenses.errors.itemRequired') }

  if (raw.amount !== undefined) {
    const amount = Number(raw.amount)
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) return { error: t('expenses.errors.amountPositive') }
    data.amount = Math.round(amount * 100) / 100
  } else if (!partial) return { error: t('expenses.errors.amountRequired') }

  for (const [field, label, max] of [['quantity', t('expenses.fields.quantity'), 30], ['paidTo', t('expenses.fields.paidTo'), 60], ['note', t('expenses.fields.note'), 200]] as const) {
    if (raw[field] === undefined) continue
    const result = text(t, raw[field], label, max)
    if (result.error) return { error: result.error }
    data[field] = result.value
  }
  return { data }
}

export type CategoryInput = { name?: string; hint?: string; isHidden?: boolean }

export function parseCategoryInput(body: unknown, t: TFunction, partial = false): { data: CategoryInput; error?: never } | { data?: never; error: string } {
  if (!body || typeof body !== 'object') return { error: t('common.invalidRequest') }
  const raw = body as Record<string, unknown>
  const data: CategoryInput = {}

  if (raw.name !== undefined) {
    const name = text(t, raw.name, t('expenses.fields.name'), 40)
    if (name.error) return { error: name.error }
    if (!name.value) return { error: t('expenses.errors.nameRequired') }
    data.name = name.value
  } else if (!partial) return { error: t('expenses.errors.nameRequired') }

  if (raw.hint !== undefined) {
    const hint = text(t, raw.hint, t('expenses.fields.hint'), 80)
    if (hint.error) return { error: hint.error }
    data.hint = hint.value
  }
  if (raw.isHidden !== undefined) {
    if (typeof raw.isHidden !== 'boolean') return { error: t('expenses.errors.isHiddenBoolean') }
    data.isHidden = raw.isHidden
  }
  return { data }
}
