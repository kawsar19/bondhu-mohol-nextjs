import 'server-only'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { connectDB } from './db'
import { getT } from './i18n/server'
import { PlatformAdmin } from './models/platform-admin'
import { PLATFORM_COOKIE, SESSION_MAX_AGE, signPlatformSession, verifyPlatformSession, type PlatformSessionPayload } from './session'

/** The signed-in super admin as stored now; null if signed out, disabled, or their password was reset. */
export async function getPlatformAdmin(): Promise<PlatformSessionPayload | null> {
  const session = await verifyPlatformSession((await cookies()).get(PLATFORM_COOKIE)?.value)
  if (!session) return null
  await connectDB()
  const admin = await PlatformAdmin.findById(session.adminId).select('name email isActive sessionVersion').lean()
  if (!admin || admin.isActive === false || (admin.sessionVersion ?? 0) !== (session.sv ?? 0)) return null
  return { adminId: session.adminId, name: admin.name, email: admin.email, sv: session.sv }
}

/** For platform route handlers: the super admin, or a 401 response to send back. */
export async function requirePlatformAdmin(): Promise<{ admin: PlatformSessionPayload; error?: never } | { admin?: never; error: NextResponse }> {
  const admin = await getPlatformAdmin()
  if (!admin) return { error: NextResponse.json({ error: (await getT())('common.notSignedIn') }, { status: 401 }) }
  return { admin }
}

export async function setPlatformCookie(payload: PlatformSessionPayload) {
  ;(await cookies()).set(PLATFORM_COOKIE, await signPlatformSession(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && (process.env.NEXT_PUBLIC_SITE_URL ?? '').startsWith('https://'),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
}

export async function clearPlatformCookie() {
  ;(await cookies()).delete(PLATFORM_COOKIE)
}
