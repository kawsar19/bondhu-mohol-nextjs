import 'server-only'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { connectDB } from './db'
import { User } from './models/user'
import { getT } from './i18n/server'
import { MANAGERS, type Role } from './permissions'
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession, type SessionPayload } from './session'

export type CurrentUser = SessionPayload & { role: Role }

export async function getSession() {
  const store = await cookies()
  return verifySession(store.get(SESSION_COOKIE)?.value)
}

/**
 * The signed-in user as stored now, not as it was at login. Returns null when the account
 * was deleted, disabled, or had its password reset since the cookie was issued.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession()
  if (!session) return null
  await connectDB()
  const user = await User.findById(session.userId).select('name email role isActive sessionVersion').lean()
  if (!user || user.isActive === false || (user.sessionVersion ?? 0) !== (session.sv ?? 0)) return null
  return { userId: session.userId, name: user.name, email: user.email, role: (user.role ?? 'admin') as Role, sv: session.sv }
}

export async function setSessionCookie(payload: SessionPayload) {
  const store = await cookies()
  store.set(SESSION_COOKIE, await signSession(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

/** For route handlers: returns the user if their role is in `roles`, or a 401/403 response to send back. */
export async function requireRole(roles: readonly Role[]): Promise<{ session: CurrentUser; error?: never } | { session?: never; error: NextResponse }> {
  const session = await getCurrentUser()
  if (!session) return { error: NextResponse.json({ error: (await getT())('common.notSignedIn') }, { status: 401 }) }
  if (!roles.includes(session.role)) return { error: NextResponse.json({ error: (await getT())('common.roleNotAllowed') }, { status: 403 }) }
  return { session }
}

/** Admins and managers. */
export function requireAdmin() {
  return requireRole(MANAGERS)
}
