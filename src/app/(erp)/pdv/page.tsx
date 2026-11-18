import React from 'react';
import { getCurrentErpContext } from '@/modules/auth/actions';
import { PdvClient } from './pdv-client';

export default async function PdvPage() {
  const { session, moduleHelp } = await getCurrentErpContext('/pdv');

  return (
    <PdvClient
      establishmentId={session.activeEstablishmentId}
      canCancelSales={session.canCancelSales || session.isSuperAdmin}
      title={moduleHelp?.label ?? 'Ponto de Venda (PDV)'}
      helpTitle={moduleHelp?.helpTitle ?? 'Como vender no PDV'}
      helpText={
        moduleHelp?.helpText ??
        'Selecione o caixa aberto do seu ponto de atendimento, adicione os produtos pedidos pelo cliente e escolha uma ou mais formas de pagamento para concluir a venda na hora.'
      }
    />
  );
}
