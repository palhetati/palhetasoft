'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentErpContext } from '@/modules/auth/actions';
import {
  ManualPosProcessor,
  prepareSplitSalePayload,
  type CartItemInput,
  type PaymentMethodConfigInput,
  type PaymentSplitInput,
} from './payment-processor';

export async function finalizePdvSaleAction(payload: {
  cashRegisterId: string;
  customerName?: string;
  discountAmount: number;
  items: CartItemInput[];
  splits: PaymentSplitInput[];
}) {
  const { session } = await getCurrentErpContext();
  if (!session.activeEstablishmentId) {
    return { error: 'Selecione um estabelecimento ativo.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: configs } = await supabase
    .from('payment_method_configs')
    .select('code, fee_percent, fixed_fee_amount, settlement_mode, provider_name')
    .eq('establishment_id', session.activeEstablishmentId)
    .eq('is_active', true);

  try {
    const prepared = prepareSplitSalePayload(
      payload.items,
      payload.discountAmount,
      payload.splits,
      (configs ?? []) as PaymentMethodConfigInput[]
    );

    const processor = new ManualPosProcessor();
    const settledSplits = await processor.processSplits(prepared.payments);

    const { data: saleId, error } = await supabase.rpc('complete_pdv_sale', {
      p_establishment_id: session.activeEstablishmentId,
      p_cash_register_id: payload.cashRegisterId,
      p_created_by: session.userId,
      p_customer_name: payload.customerName?.trim() || null,
      p_discount_amount: prepared.discountAmount,
      p_items: prepared.items,
      p_payments: settledSplits,
      p_origin_module: 'pdv',
    });

    if (error) return { error: error.message };

    revalidatePath('/pdv');
    revalidatePath('/caixa');
    revalidatePath('/produtos');
    revalidatePath('/dashboard');
    return { success: true, saleId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Falha ao processar venda.' };
  }
}

export async function cancelPdvSaleAction(saleId: string, reason?: string) {
  const { session } = await getCurrentErpContext();
  if (!session.canCancelSales && !session.isSuperAdmin) {
    return { error: 'Seu perfil não possui autorização para estornar vendas.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('cancel_pdv_sale', {
    p_sale_id: saleId,
    p_cancelled_by: session.userId,
    p_reason: reason?.trim() || 'Estorno solicitado pelo gestor',
  });

  if (error) return { error: error.message };
  revalidatePath('/pdv');
  revalidatePath('/caixa');
  revalidatePath('/produtos');
  revalidatePath('/dashboard');
  return { success: true };
}
