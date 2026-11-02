import { NextResponse } from 'next/server'
import { clearPlatformCookie } from '@/lib/platform-auth'
import { PLATFORM_COOKIE } from '@/lib/session'

export async function POST() {
  await clearPlatformCookie()
  return NextResponse.json({ ok: true })
}

// The platform page sends a stale session here, so proxy.ts stops bouncing the login page back.
export function GET(request: Request) {
  const response = NextResponse.redirect(new URL('/platform/login', request.url))
  response.cookies.delete(PLATFORM_COOKIE)
  return response
}
