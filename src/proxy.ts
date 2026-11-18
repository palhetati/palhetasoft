import { type NextRequest } from 'next/server';
import { updateSessionAndGuardRoutes } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  return updateSessionAndGuardRoutes(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
