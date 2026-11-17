'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentErpContext } from '@/modules/auth/actions';

export async function upsertProductAction(formData: FormData) {
  const { session } = await getCurrentErpContext();
  if (!session.activeEstablishmentId) return { error: 'Empresa não selecionada.' };

  const id = String(formData.get('id') ?? '').trim() || undefined;
  const name = String(formData.get('name') ?? '').trim();
  const sku = String(formData.get('sku') ?? '').trim() || null;
  const category = String(formData.get('category') ?? 'geral');
  const unitPrice = Number(formData.get('unit_price') ?? 0);
  const costPrice = Number(formData.get('cost_price') ?? 0);
  const trackStock = formData.get('track_stock') === 'true';
  const stockQuantity = Number(formData.get('stock_quantity') ?? 0);
  const minStockAlert = Number(formData.get('min_stock_alert') ?? 0);

  if (!name || unitPrice < 0) {
    return { error: 'Informe um nome e um preço de venda válido.' };
  }

  const supabase = await createSupabaseServerClient();
  const payload = {
    ...(id ? { id } : {}),
    establishment_id: session.activeEstablishmentId,
    name,
    sku,
    category,
    unit_price: unitPrice,
    cost_price: costPrice,
    track_stock: trackStock,
    stock_quantity: stockQuantity,
    min_stock_alert: minStockAlert,
    is_active: true,
  };

  const { error } = await supabase.from('products').upsert(payload);
  if (error) return { error: error.message };

  revalidatePath('/produtos');
  revalidatePath('/pdv');
  return { success: true };
}

export async function adjustProductStockAction(productId: string, delta: number) {
  const { session } = await getCurrentErpContext();
  if (!session.activeEstablishmentId) return { error: 'Empresa não selecionada.' };

  const supabase = await createSupabaseServerClient();
  const { data: prod } = await supabase
    .from('products')
    .select('stock_quantity')
    .eq('id', productId)
    .eq('establishment_id', session.activeEstablishmentId)
    .single();

  if (!prod) return { error: 'Produto não encontrado.' };

  const { error } = await supabase
    .from('products')
    .update({ stock_quantity: Number(prod.stock_quantity) + delta })
    .eq('id', productId);

  if (error) return { error: error.message };
  revalidatePath('/produtos');
  revalidatePath('/pdv');
  return { success: true };
}
