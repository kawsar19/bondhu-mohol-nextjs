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

function text(raw: unknown, field: string, max: number): { value?: string; error?: string } {
  if (typeof raw !== 'string') return { error: `${field} must be text` }
  const value = raw.trim()
  if (value.length > max) return { error: `${field} must be ${max} characters or less` }
  return { value }
}

/** Picks and validates the editable expense fields. With `partial`, missing fields are allowed (for PATCH). */
export function parseExpenseInput(body: unknown, partial = false): Result {
  if (!body || typeof body !== 'object') return { error: 'Invalid request body' }
  const raw = body as Record<string, unknown>
  const data: ExpenseInput = {}

  if (raw.date !== undefined) {
    const date = parseBusinessDate(raw.date)
    if (!date) return { error: 'Choose a valid date' }
    if (date.getTime() > Date.now()) return { error: 'The date can\'t be in the future' }
    data.date = date
  } else if (!partial) return { error: 'Date is required' }

  if (raw.category !== undefined) {
    // Whether the category exists is checked by the route, which has the database.
    const category = text(raw.category, 'Category', 40)
    if (category.error || !category.value) return { error: 'Choose a category' }
    data.category = category.value
  } else if (!partial) return { error: 'Category is required' }

  if (raw.item !== undefined) {
    const item = text(raw.item, 'Item', 80)
    if (item.error) return { error: item.error }
    if (!item.value) return { error: 'Write what was bought' }
    data.item = item.value
  } else if (!partial) return { error: 'Write what was bought' }

  if (raw.amount !== undefined) {
    const amount = Number(raw.amount)
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) return { error: 'Amount must be more than 0' }
    data.amount = Math.round(amount * 100) / 100
  } else if (!partial) return { error: 'Amount is required' }

  for (const [field, label, max] of [['quantity', 'Quantity', 30], ['paidTo', 'Paid to', 60], ['note', 'Note', 200]] as const) {
    if (raw[field] === undefined) continue
    const result = text(raw[field], label, max)
    if (result.error) return { error: result.error }
    data[field] = result.value
  }
  return { data }
}

export type CategoryInput = { name?: string; hint?: string; isHidden?: boolean }

export function parseCategoryInput(body: unknown, partial = false): { data: CategoryInput; error?: never } | { data?: never; error: string } {
  if (!body || typeof body !== 'object') return { error: 'Invalid request body' }
  const raw = body as Record<string, unknown>
  const data: CategoryInput = {}

  if (raw.name !== undefined) {
    const name = text(raw.name, 'Name', 40)
    if (name.error) return { error: name.error }
    if (!name.value) return { error: 'Give the category a name' }
    data.name = name.value
  } else if (!partial) return { error: 'Give the category a name' }

  if (raw.hint !== undefined) {
    const hint = text(raw.hint, 'Hint', 80)
    if (hint.error) return { error: hint.error }
    data.hint = hint.value
  }
  if (raw.isHidden !== undefined) {
    if (typeof raw.isHidden !== 'boolean') return { error: 'isHidden must be true or false' }
    data.isHidden = raw.isHidden
  }
  return { data }
}
