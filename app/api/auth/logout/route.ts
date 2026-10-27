import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth'
import { SESSION_COOKIE } from '@/lib/session'

export async function POST() {
  await clearSessionCookie()
  return NextResponse.json({ ok: true })
}

// The admin page sends a stale session here (account disabled or password reset).
// Clearing the cookie stops proxy.ts from bouncing the login page back to /admin.
export function GET(request: Request) {
  const response = NextResponse.redirect(new URL('/admin/login', request.url))
  response.cookies.delete(SESSION_COOKIE)
  return response
}
