import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { setSessionCookie } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { User } from '@/lib/models/user'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email || !password) return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })

  await connectDB()
  const user = await User.findOne({ email }).select('+passwordHash')
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false
  if (!user || !valid) return NextResponse.json({ error: 'Wrong email or password' }, { status: 401 })
  if (user.isActive === false) return NextResponse.json({ error: 'This account is disabled. Ask the admin.' }, { status: 403 })

  await setSessionCookie({ userId: user._id.toString(), name: user.name, email: user.email, role: user.role ?? 'admin', sv: user.sessionVersion ?? 0 })
  return NextResponse.json({ ok: true })
}
