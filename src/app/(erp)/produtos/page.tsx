import React from 'react';
import { PageHeader } from '@/components/ui';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentErpContext } from '@/modules/auth/actions';
import { ProductsClient, type ProductItem } from './products-client';

export default async function ProductsPage() {
  const { session, moduleHelp } = await getCurrentErpContext('/produtos');
  const supabase = await createSupabaseServerClient();

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('establishment_id', session.activeEstablishmentId ?? '')
    .eq('is_active', true)
    .order('name');

  return (
    <div>
      <PageHeader
        title={moduleHelp?.label ?? 'Catálogo de Produtos'}
        subtitle="Itens comercializados no PDV com preços e acompanhamento opcional de estoque."
        helpTitle={moduleHelp?.helpTitle ?? 'Catálogo de Produtos'}
        helpText={
          moduleHelp?.helpText ??
          'Mantenha atualizados os preços de venda, categorias de bar ou restaurante e ative o controle de estoque nos itens que desejar acompanhar.'
        }
      />

      <ProductsClient
        products={((products ?? []) as ProductItem[]).map((p) => ({
          ...p,
          unit_price: Number(p.unit_price),
          cost_price: Number(p.cost_price),
          stock_quantity: Number(p.stock_quantity),
          min_stock_alert: Number(p.min_stock_alert),
        }))}
      />
    </div>
  );
}
