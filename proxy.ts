import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/session'

// Optimistic redirects only. Pages and API routes still check the session themselves.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value)
  const isLogin = pathname === '/admin/login'

  if (!session && !isLogin) return NextResponse.redirect(new URL('/admin/login', request.url))
  if (session && isLogin) return NextResponse.redirect(new URL('/admin', request.url))
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
