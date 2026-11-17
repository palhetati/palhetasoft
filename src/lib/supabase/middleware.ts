import { NextResponse, type NextRequest } from 'next/server';
import { NAV_SESSION_COOKIE, isRouteAllowed, parseNavigationSession } from '@/modules/auth/session-nav';

const PUBLIC_PATHS = ['/login'];

export async function updateSessionAndGuardRoutes(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const rawNavCookie = request.cookies.get(NAV_SESSION_COOKIE)?.value;
  const snapshot = parseNavigationSession(rawNavCookie);

  if (PUBLIC_PATHS.includes(pathname)) {
    if (snapshot) {
      const target = snapshot.allowedPaths[0] ?? (snapshot.isSuperAdmin ? '/admin' : '/dashboard');
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.next();
  }

  if (!snapshot) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname === '/') {
    const firstAllowed = snapshot.allowedPaths[0] ?? (snapshot.isSuperAdmin ? '/admin' : '/dashboard');
    return NextResponse.redirect(new URL(firstAllowed, request.url));
  }

  if (!isRouteAllowed(snapshot, pathname)) {
    const fallback = snapshot.allowedPaths[0] ?? '/login';
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  return NextResponse.next();
}
