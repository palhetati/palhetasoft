import React from 'react';
import { PageHeader } from '@/components/ui';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentErpContext } from '@/modules/auth/actions';
import type { SystemModuleRow } from '@/modules/auth/types';
import type { ParametroWebRow } from '@/modules/parametros/types';
import { AdminClient } from './admin-client';

export default async function AdminPage() {
  const { session, moduleHelp } = await getCurrentErpContext('/admin');
  const supabase = await createSupabaseServerClient();

  let profilesQuery = supabase
    .from('access_profiles')
    .select('id, name, description, can_cancel_sales')
    .order('name');
  let usersQuery = supabase
    .from('app_users')
    .select('id, full_name, email, is_super_admin')
    .order('full_name');

  if (session.activeEstablishmentId) {
    profilesQuery = profilesQuery.eq('establishment_id', session.activeEstablishmentId);
    usersQuery = usersQuery.or(
      `establishment_id.eq.${session.activeEstablishmentId},is_super_admin.eq.true`
    );
  }

  const [{ data: establishments }, { data: modules }, { data: profiles }, { data: users }, { data: parametros }] =
    await Promise.all([
      supabase.from('establishments').select('id, name, slug, business_vertical, tax_regime').order('name'),
      supabase.from('system_modules').select('*').order('sort_order'),
      profilesQuery,
      usersQuery,
      supabase.from('parametros_web').select('*').order('chave_parametro'),
    ]);

  return (
    <div>
      <PageHeader
        title={moduleHelp?.label ?? 'Administração e Governança'}
        subtitle="Controle de empresas, estrutura do menu lateral, perfis de equipe e parâmetros globais."
        helpTitle={moduleHelp?.helpTitle ?? 'Governança e Parâmetros'}
        helpText={
          moduleHelp?.helpText ??
          'Gerencie empresas clientes, configure a árvore de menus com textos de ajuda, crie perfis de acesso e mantenha atualizados os parâmetros globais em parametros_web.'
        }
      />

      <AdminClient
        isSuperAdmin={session.isSuperAdmin}
        activeEstablishmentId={session.activeEstablishmentId}
        establishments={establishments ?? []}
        modules={(modules ?? []) as SystemModuleRow[]}
        profiles={profiles ?? []}
        users={users ?? []}
        parametros={(parametros ?? []) as ParametroWebRow[]}
      />
    </div>
  );
}
