import React from 'react';
import { PageHeader } from '@/components/ui';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentErpContext } from '@/modules/auth/actions';
import type { PaymentMethodCode } from '@/modules/pdv/payment-processor';
import { PdvClient, type PdvProduct } from './pdv-client';

export default async function PdvPage() {
  const { session, moduleHelp } = await getCurrentErpContext('/pdv');
  const supabase = await createSupabaseServerClient();
  const estId = session.activeEstablishmentId ?? '';

  const [{ data: openRegs }, { data: products }, { data: methods }, { data: recentSales }] =
    await Promise.all([
      supabase
        .from('cash_registers')
        .select('id, register_points(name)')
        .eq('establishment_id', estId)
        .eq('status', 'open'),
      supabase
        .from('products')
        .select('id, name, category, unit_price, track_stock, stock_quantity')
        .eq('establishment_id', estId)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('payment_method_configs')
        .select('code, label, fee_percent')
        .eq('establishment_id', estId)
        .eq('is_active', true),
      supabase
        .from('sales')
        .select('id, customer_name, gross_amount, status')
        .eq('establishment_id', estId)
        .order('created_at', { ascending: false })
        .limit(6),
    ]);

  const mappedRegisters = (openRegs ?? []).map((r: Record<string, unknown>) => {
    const point = r.register_points as { name?: string } | null;
    return {
      id: String(r.id),
      label: point?.name ?? `Caixa #${String(r.id).slice(0, 6)}`,
    };
  });

  return (
    <div>
      <PageHeader
        title={moduleHelp?.label ?? 'PDV Ponto de Venda'}
        subtitle="Venda rápida no balcão preparada para múltiplos caixas e pagamento dividido."
        helpTitle={moduleHelp?.helpTitle ?? 'Como vender no PDV'}
        helpText={
          moduleHelp?.helpText ??
          'Selecione o caixa aberto do seu ponto de atendimento, adicione os produtos pedidos pelo cliente e escolha uma ou mais formas de pagamento para concluir a venda na hora.'
        }
      />

      <PdvClient
        openRegisters={mappedRegisters}
        products={((products ?? []) as PdvProduct[]).map((p) => ({
          ...p,
          unit_price: Number(p.unit_price),
          stock_quantity: Number(p.stock_quantity),
        }))}
        paymentMethods={(methods ?? []).map((m) => ({
          code: m.code as PaymentMethodCode,
          label: m.label,
          fee_percent: Number(m.fee_percent),
        }))}
        recentSales={(recentSales ?? []).map((s) => ({
          ...s,
          gross_amount: Number(s.gross_amount),
        }))}
        canCancelSales={session.canCancelSales || session.isSuperAdmin}
      />
    </div>
  );
}
