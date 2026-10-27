import type { TFunction } from './i18n'
import { isRole, type Role } from './permissions'

export type UserInput = {
  name?: string
  email?: string
  password?: string
  role?: Role
  isActive?: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Picks and validates the editable staff fields. With `partial`, missing fields are allowed (for PATCH). */
export function parseUserInput(t: TFunction, body: unknown, partial = false): { data: UserInput; error?: never } | { data?: never; error: string } {
  if (!body || typeof body !== 'object') return { error: t('common.invalidRequest') }
  const raw = body as Record<string, unknown>
  const data: UserInput = {}

  if (raw.name !== undefined) {
    const name = typeof raw.name === 'string' ? raw.name.trim() : ''
    if (!name || name.length > 60) return { error: t('staff.errors.nameTooLong') }
    data.name = name
  } else if (!partial) return { error: t('staff.errors.nameRequired') }

  if (raw.email !== undefined) {
    const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : ''
    if (!EMAIL_RE.test(email) || email.length > 120) return { error: t('staff.errors.invalidEmail') }
    data.email = email
  } else if (!partial) return { error: t('staff.errors.emailRequired') }

  // An empty password on edit means "keep the current one".
  if (raw.password !== undefined && !(partial && raw.password === '')) {
    if (typeof raw.password !== 'string' || raw.password.length < 8 || raw.password.length > 100) return { error: t('staff.errors.passwordTooShort') }
    data.password = raw.password
  } else if (!partial) return { error: t('staff.errors.passwordRequired') }

  if (raw.role !== undefined) {
    if (!isRole(raw.role)) return { error: t('staff.errors.invalidRole') }
    data.role = raw.role
  } else if (!partial) return { error: t('staff.errors.roleRequired') }

  if (raw.isActive !== undefined) {
    if (typeof raw.isActive !== 'boolean') return { error: t('staff.errors.isActiveBoolean') }
    data.isActive = raw.isActive
  }
  return { data }
}
