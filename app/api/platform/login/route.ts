import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { PlatformAdmin } from '@/lib/models/platform-admin'
import { setPlatformCookie } from '@/lib/platform-auth'
import { clientIp, hit, isBlocked, reset } from '@/lib/rate-limit'

const WINDOW_MS = 15 * 60 * 1000
// Stricter than shop sign-in: this account can switch every shop off.
const MAX_FAILS_PER_EMAIL = 5
const MAX_FAILS_PER_IP = 10

export async function POST(request: Request) {
  const t = await getT()
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email || !password) return NextResponse.json({ error: t('auth.required') }, { status: 400 })

  await connectDB()
  const ipKey = `platform-ip:${clientIp(request)}`
  const emailKey = `platform-email:${email}`
  for (const [key, limit] of [[ipKey, MAX_FAILS_PER_IP], [emailKey, MAX_FAILS_PER_EMAIL]] as const) {
    const { blocked, retryMinutes } = await isBlocked(key, limit, WINDOW_MS)
    if (blocked) return NextResponse.json({ error: t(retryMinutes === 1 ? 'auth.tooManyOne' : 'auth.tooManyMany', { minutes: retryMinutes }) }, { status: 429 })
  }

  const admin = await PlatformAdmin.findOne({ email }).select('+passwordHash')
  const valid = admin ? await bcrypt.compare(password, admin.passwordHash) : false
  if (!admin || !valid || admin.isActive === false) {
    await Promise.all([hit(ipKey, MAX_FAILS_PER_IP, WINDOW_MS), hit(emailKey, MAX_FAILS_PER_EMAIL, WINDOW_MS)])
    return NextResponse.json({ error: t('auth.wrongCredentials') }, { status: 401 })
  }

  await reset(emailKey, WINDOW_MS)
  await setPlatformCookie({ adminId: admin._id.toString(), name: admin.name, email: admin.email, sv: admin.sessionVersion ?? 0 })
  return NextResponse.json({ ok: true })
}
