import { createClient } from '@supabase/supabase-js';

export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'local-service-role-placeholder',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
