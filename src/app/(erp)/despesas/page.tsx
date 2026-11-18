import React from 'react';
import { getCurrentErpContext } from '@/modules/auth/actions';
import { ExpensesClient } from './expenses-client';

export default async function ExpensesPage() {
  const { session, moduleHelp } = await getCurrentErpContext('/despesas');

  return (
    <ExpensesClient
      establishmentId={session.activeEstablishmentId}
      title={moduleHelp?.label ?? 'Despesas Fixas e Variáveis'}
      helpTitle={moduleHelp?.helpTitle ?? 'Como gerenciar Despesas'}
      helpText={
        moduleHelp?.helpText ??
        'Cadastre contas fixas como aluguel, internet e folha salarial, além de gastos variáveis como reposição de bebidas, insumos e diárias. Você pode dar baixa bancária ou pagar direto com dinheiro de um caixa aberto.'
      }
    />
  );
}
