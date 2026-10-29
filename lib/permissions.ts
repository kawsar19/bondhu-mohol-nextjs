// Shared by server and client, so it must not import the database.
export const USER_ROLES = ['admin', 'manager', 'partner'] as const
export type Role = (typeof USER_ROLES)[number]

// Who may call each kind of API.
export const MANAGERS: readonly Role[] = ['admin', 'manager']
// Partners own the shop: they read every report but leave day-to-day entry to the manager.
export const REPORT_VIEWERS: readonly Role[] = ['admin', 'manager', 'partner']
// Partners often do the bazar themselves, so they may write mother store purchases too.
export const STORE_KEEPERS: readonly Role[] = ['admin', 'manager', 'partner']

// Dashboard sections each role can open, keyed by nav label.
const SECTION_ACCESS: Record<string, readonly Role[]> = {
  Overview: REPORT_VIEWERS,
  'New order': MANAGERS,
  Orders: MANAGERS,
  Tables: MANAGERS,
  Menu: MANAGERS,
  Sections: MANAGERS,
  Ingredients: MANAGERS,
  'Mother store': STORE_KEEPERS,
  'Daily entry': MANAGERS,
  Reports: REPORT_VIEWERS,
  'Day end': REPORT_VIEWERS,
  Expenses: MANAGERS,
  Staff: ['admin'],
  Settings: MANAGERS,
}

export function isRole(value: unknown): value is Role {
  return USER_ROLES.includes(value as Role)
}

export function canAccess(role: string, section: string) {
  return SECTION_ACCESS[section]?.includes(role as Role) ?? false
}
