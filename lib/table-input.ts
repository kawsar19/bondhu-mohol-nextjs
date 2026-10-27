import type { TFunction } from './i18n'
import { TABLE_STATUSES } from './models/table'

export type TableInput = {
  number?: number
  name?: string
  capacity?: number
  status?: (typeof TABLE_STATUSES)[number]
  isActive?: boolean
}

/** Picks and validates the editable table fields. With `partial`, missing fields are allowed (for PATCH). */
export function parseTableInput(body: unknown, t: TFunction, partial = false): { data: TableInput; error?: never } | { data?: never; error: string } {
  if (!body || typeof body !== 'object') return { error: t('common.invalidRequest') }
  const raw = body as Record<string, unknown>
  const data: TableInput = {}

  if (raw.number !== undefined) {
    const number = Number(raw.number)
    if (!Number.isInteger(number) || number < 1) return { error: t('tables.api.numberInvalid') }
    data.number = number
  } else if (!partial) return { error: t('tables.api.numberRequired') }

  if (raw.name !== undefined) {
    if (typeof raw.name !== 'string' || raw.name.length > 60) return { error: t('tables.api.nameInvalid') }
    data.name = raw.name.trim()
  }
  if (raw.capacity !== undefined) {
    const capacity = Number(raw.capacity)
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) return { error: t('tables.api.seatsInvalid') }
    data.capacity = capacity
  }
  if (raw.status !== undefined) {
    if (!TABLE_STATUSES.includes(raw.status as never)) return { error: t('tables.api.statusInvalid', { list: TABLE_STATUSES.join(', ') }) }
    data.status = raw.status as TableInput['status']
  }
  if (raw.isActive !== undefined) {
    if (typeof raw.isActive !== 'boolean') return { error: t('tables.api.isActiveInvalid') }
    data.isActive = raw.isActive
  }
  return { data }
}

export function isDuplicateKeyError(error: unknown) {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000
}
