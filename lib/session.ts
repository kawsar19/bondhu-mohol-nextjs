import { jwtVerify, SignJWT } from 'jose'

// Kept free of database imports so proxy.ts can use it.
export const SESSION_COOKIE = 'bm_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// `sv` is the user's sessionVersion at login; older tokens have none and count as 0.
// `shopId` is informational only: the shop is always read from the user's record, never trusted from the cookie.
export type SessionPayload = { userId: string; shopId?: string; name: string; email: string; role: string; sv?: number }

function getKey() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set. Add it to .env.local')
  return new TextEncoder().encode(secret)
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getKey())
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ['HS256'] })
    // Shop sessions never carry an audience, so a platform token can't be used as one.
    if (payload.aud !== undefined) return null
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

// Super admin (platform owner) sessions: their own cookie, and an audience shop tokens don't have.
export const PLATFORM_COOKIE = 'bm_platform'
const PLATFORM_AUDIENCE = 'platform'

export type PlatformSessionPayload = { adminId: string; name: string; email: string; sv?: number }

export async function signPlatformSession(payload: PlatformSessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience(PLATFORM_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getKey())
}

export async function verifyPlatformSession(token: string | undefined): Promise<PlatformSessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ['HS256'], audience: PLATFORM_AUDIENCE })
    return payload as unknown as PlatformSessionPayload
  } catch {
    return null
  }
}
