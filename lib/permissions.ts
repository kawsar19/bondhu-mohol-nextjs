// Shared by server and client, so it must not import the database.
export const USER_ROLES = ['admin', 'manager', 'cashier', 'waiter', 'kitchen'] as const
export type Role = (typeof USER_ROLES)[number]

export const ROLE_INFO: Record<Role, { label: string; description: string }> = {
  admin: { label: 'Admin', description: 'Everything, including staff accounts' },
  manager: { label: 'Manager', description: 'Everything except staff accounts' },
  cashier: { label: 'Cashier', description: 'Orders, payments and the waiter panel' },
  waiter: { label: 'Waiter', description: 'Takes orders and sees the kitchen board' },
  kitchen: { label: 'Kitchen', description: 'Kitchen display only' },
}

// Who may call each kind of API.
export const MANAGERS: readonly Role[] = ['admin', 'manager']
export const ORDER_TAKERS: readonly Role[] = ['admin', 'manager', 'cashier', 'waiter']
export const PAYMENT_HANDLERS: readonly Role[] = ['admin', 'manager', 'cashier']
export const ALL_STAFF: readonly Role[] = USER_ROLES

// Dashboard sections each role can open, keyed by nav label.
const SECTION_ACCESS: Record<string, readonly Role[]> = {
  Overview: MANAGERS,
  Orders: PAYMENT_HANDLERS,
  Tables: MANAGERS,
  Menu: MANAGERS,
  'Kitchen display': ALL_STAFF,
  'Waiter order panel': ORDER_TAKERS,
  'QR ordering': MANAGERS,
  Staff: ['admin'],
  Settings: MANAGERS,
}

export function isRole(value: unknown): value is Role {
  return USER_ROLES.includes(value as Role)
}

export function canAccess(role: string, section: string) {
  return SECTION_ACCESS[section]?.includes(role as Role) ?? false
}
