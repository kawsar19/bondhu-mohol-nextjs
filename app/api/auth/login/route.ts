import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { setSessionCookie } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import type { TFunction } from '@/lib/i18n'
import { getT } from '@/lib/i18n/server'
import { User } from '@/lib/models/user'
import { clientIp, hit, isBlocked, reset } from '@/lib/rate-limit'

const WINDOW_MS = 15 * 60 * 1000
// Wrong passwords allowed per 15 minutes: per account stops guessing one password from
// many places; per IP stops one device trying many accounts.
const MAX_FAILS_PER_EMAIL = 5
const MAX_FAILS_PER_IP = 15

const tooMany = (t: TFunction, minutes: number) => NextResponse.json({ error: t(minutes === 1 ? 'auth.tooManyOne' : 'auth.tooManyMany', { minutes }) }, { status: 429 })

export async function POST(request: Request) {
  const t = await getT()
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email || !password) return NextResponse.json({ error: t('auth.required') }, { status: 400 })

  await connectDB()
  const ipKey = `login-ip:${clientIp(request)}`
  const emailKey = `login-email:${email}`
  // Checked before the password, so a locked account can't be probed further.
  for (const [key, limit] of [[ipKey, MAX_FAILS_PER_IP], [emailKey, MAX_FAILS_PER_EMAIL]] as const) {
    const { blocked, retryMinutes } = await isBlocked(key, limit, WINDOW_MS)
    if (blocked) return tooMany(t, retryMinutes)
  }

  const user = await User.findOne({ email }).select('+passwordHash')
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false
  if (!user || !valid) {
    await Promise.all([hit(ipKey, MAX_FAILS_PER_IP, WINDOW_MS), hit(emailKey, MAX_FAILS_PER_EMAIL, WINDOW_MS)])
    return NextResponse.json({ error: t('auth.wrongCredentials') }, { status: 401 })
  }
  if (user.isActive === false) return NextResponse.json({ error: t('auth.accountDisabled') }, { status: 403 })

  await reset(emailKey, WINDOW_MS)
  await setSessionCookie({ userId: user._id.toString(), name: user.name, email: user.email, role: user.role ?? 'admin', sv: user.sessionVersion ?? 0 })
  return NextResponse.json({ ok: true })
}
