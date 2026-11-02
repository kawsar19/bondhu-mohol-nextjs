import { NextResponse, type NextRequest } from 'next/server'
import { PLATFORM_COOKIE, SESSION_COOKIE, verifyPlatformSession, verifySession } from '@/lib/session'

// Optimistic redirects only. Pages and API routes still check the session themselves.
// /admin is a shop's dashboard; /platform is the super admin's, with its own sign-in.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const platform = pathname === '/platform' || pathname.startsWith('/platform/')
  const loginPath = platform ? '/platform/login' : '/admin/login'
  const signedIn = platform
    ? await verifyPlatformSession(request.cookies.get(PLATFORM_COOKIE)?.value)
    : await verifySession(request.cookies.get(SESSION_COOKIE)?.value)
  const isLogin = pathname === loginPath

  if (!signedIn && !isLogin) return NextResponse.redirect(new URL(loginPath, request.url))
  if (signedIn && isLogin) return NextResponse.redirect(new URL(platform ? '/platform' : '/admin', request.url))
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/platform', '/platform/:path*'],
}
