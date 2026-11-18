import React from 'react';
import { getCurrentErpContext } from '@/modules/auth/actions';
import { ProductsClient } from './products-client';

export default async function ProductsPage() {
  const { session, moduleHelp } = await getCurrentErpContext('/produtos');

  return (
    <ProductsClient
      establishmentId={session.activeEstablishmentId}
      title={moduleHelp?.label ?? 'Catálogo de Produtos'}
      helpTitle={moduleHelp?.helpTitle ?? 'Catálogo de Produtos'}
      helpText={
        moduleHelp?.helpText ??
        'Mantenha atualizados os preços de venda, categorias de bar ou restaurante e ative o controle de estoque nos itens que desejar acompanhar.'
      }
    />
  );
}
