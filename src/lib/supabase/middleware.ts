import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  NAV_SESSION_COOKIE,
  isRouteAllowed,
  parseNavigationSession,
  resolveHomeRoute,
} from '@/modules/auth/session-nav';

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

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'local-anon-key-placeholder',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }>
        ) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(
              name,
              value,
              options as Parameters<typeof supabaseResponse.cookies.set>[2]
            )
          );
        },
      },
    }
  );

  // Refresh Supabase JWT when needed and verify active user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rawNavCookie = request.cookies.get(NAV_SESSION_COOKIE)?.value;
  const snapshot = parseNavigationSession(rawNavCookie);
  const validSession = user && snapshot && snapshot.userId === user.id ? snapshot : null;

  if (PUBLIC_PATHS.includes(pathname)) {
    if (validSession) {
      return NextResponse.redirect(new URL(resolveHomeRoute(validSession), request.url));
    }
    if (rawNavCookie && !validSession) {
      supabaseResponse.cookies.delete(NAV_SESSION_COOKIE);
    }
    return supabaseResponse;
  }

  if (!validSession) {
    const redirectRes = NextResponse.redirect(new URL('/login', request.url));
    redirectRes.cookies.delete(NAV_SESSION_COOKIE);
    return redirectRes;
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL(resolveHomeRoute(validSession), request.url));
  }

  if (!isRouteAllowed(validSession, pathname)) {
    return NextResponse.redirect(new URL(resolveHomeRoute(validSession), request.url));
  }

  return supabaseResponse;
}
