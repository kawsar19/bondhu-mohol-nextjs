import 'server-only'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession, type SessionPayload } from './session'

export async function getSession() {
  const store = await cookies()
  return verifySession(store.get(SESSION_COOKIE)?.value)
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

/** For route handlers: returns the admin session, or a 401/403 response to send back. */
export async function requireAdmin(): Promise<{ session: SessionPayload; error?: never } | { session?: never; error: NextResponse }> {
  const session = await getSession()
  if (!session) return { error: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) }
  if (session.role !== 'admin' && session.role !== 'manager') return { error: NextResponse.json({ error: 'Not allowed' }, { status: 403 }) }
  return { session }
}
