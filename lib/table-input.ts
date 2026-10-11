import { TABLE_SECTIONS, TABLE_STATUSES } from './models/table'

export type TableInput = {
  number?: number
  name?: string
  section?: (typeof TABLE_SECTIONS)[number]
  capacity?: number
  status?: (typeof TABLE_STATUSES)[number]
  isActive?: boolean
}

/** Picks and validates the editable table fields. With `partial`, missing fields are allowed (for PATCH). */
export function parseTableInput(body: unknown, partial = false): { data: TableInput; error?: never } | { data?: never; error: string } {
  if (!body || typeof body !== 'object') return { error: 'Invalid request body' }
  const raw = body as Record<string, unknown>
  const data: TableInput = {}

  if (raw.number !== undefined) {
    const number = Number(raw.number)
    if (!Number.isInteger(number) || number < 1) return { error: 'Table number must be a whole number of 1 or more' }
    data.number = number
  } else if (!partial) return { error: 'Table number is required' }

  if (raw.name !== undefined) {
    if (typeof raw.name !== 'string' || raw.name.length > 60) return { error: 'Name must be text of up to 60 characters' }
    data.name = raw.name.trim()
  }
  if (raw.section !== undefined) {
    if (!TABLE_SECTIONS.includes(raw.section as never)) return { error: `Section must be one of: ${TABLE_SECTIONS.join(', ')}` }
    data.section = raw.section as TableInput['section']
  }
  if (raw.capacity !== undefined) {
    const capacity = Number(raw.capacity)
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) return { error: 'Seats must be between 1 and 50' }
    data.capacity = capacity
  }
  if (raw.status !== undefined) {
    if (!TABLE_STATUSES.includes(raw.status as never)) return { error: `Status must be one of: ${TABLE_STATUSES.join(', ')}` }
    data.status = raw.status as TableInput['status']
  }
  if (raw.isActive !== undefined) {
    if (typeof raw.isActive !== 'boolean') return { error: 'isActive must be true or false' }
    data.isActive = raw.isActive
  }
  return { data }
}

export function isDuplicateKeyError(error: unknown) {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000
}
