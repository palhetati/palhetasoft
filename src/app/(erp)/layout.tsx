import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentErpContext } from '@/modules/auth/actions';

export default async function ErpAuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = await getCurrentErpContext();

  let establishments: Array<{ id: string; name: string }> = [];
  if (session.isSuperAdmin) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('establishments')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true });
    establishments = data ?? [];
  }

  return (
    <AppShell session={session} establishments={establishments}>
      {children}
    </AppShell>
  );
}
