import React from 'react';
import { getCurrentErpContext } from '@/modules/auth/actions';
import { AdminClient } from './admin-client';

export default async function AdminPage() {
  const { session, moduleHelp } = await getCurrentErpContext('/admin');

  return (
    <AdminClient
      isSuperAdmin={session.isSuperAdmin}
      activeEstablishmentId={session.activeEstablishmentId}
      title={moduleHelp?.label ?? 'Administração e Governança'}
      helpTitle={moduleHelp?.helpTitle ?? 'Governança e Configurações'}
      helpText={
        moduleHelp?.helpText ??
        'Gerencie empresas clientes, configure a árvore de menus com textos de ajuda, crie perfis de acesso e mantenha atualizadas as configurações gerais e trabalhistas do sistema.'
      }
    />
  );
}
