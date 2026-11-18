import React from 'react';
import { getCurrentErpContext } from '@/modules/auth/actions';
import { CaixaClient } from './caixa-client';

export default async function CaixaPage() {
  const { session, moduleHelp } = await getCurrentErpContext('/caixa');

  return (
    <CaixaClient
      establishmentId={session.activeEstablishmentId}
      title={moduleHelp?.label ?? 'Controle de Caixas'}
      helpTitle={moduleHelp?.helpTitle ?? 'Como operar os Caixas'}
      helpText={
        moduleHelp?.helpText ??
        'Abra o turno informando o troco inicial de cada ponto, registre suprimentos ou sangrias ao longo do dia e faça o fechamento conferindo o dinheiro físico na gaveta.'
      }
    />
  );
}
