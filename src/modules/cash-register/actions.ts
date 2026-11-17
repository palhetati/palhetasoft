'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentErpContext } from '@/modules/auth/actions';

export async function createRegisterPointAction(formData: FormData) {
  const { session } = await getCurrentErpContext();
  if (!session.activeEstablishmentId) return { error: 'Selecione uma empresa.' };

  const name = String(formData.get('name') ?? '').trim();
  const locationNote = String(formData.get('location_note') ?? '').trim() || null;

  if (!name) return { error: 'Informe o nome do ponto de caixa.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('register_points').insert({
    establishment_id: session.activeEstablishmentId,
    name,
    location_note: locationNote,
  });

  if (error) return { error: error.message };
  revalidatePath('/caixa');
  return { success: true };
}

export async function openCashRegisterAction(formData: FormData) {
  const { session } = await getCurrentErpContext();
  if (!session.activeEstablishmentId) return { error: 'Selecione uma empresa.' };

  const registerPointId = String(formData.get('register_point_id') ?? '');
  const openingBalance = Number(formData.get('opening_balance') ?? 0);
  const notes = String(formData.get('notes') ?? '').trim() || null;

  if (!registerPointId || openingBalance < 0) {
    return { error: 'Selecione um ponto de caixa e informe o fundo de troco inicial.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: reg, error } = await supabase
    .from('cash_registers')
    .insert({
      establishment_id: session.activeEstablishmentId,
      register_point_id: registerPointId,
      opened_by: session.userId,
      status: 'open',
      opening_balance: openingBalance,
      notes,
    })
    .select('id')
    .single();

  if (error || !reg) {
    return {
      error: error?.message?.includes('cash_registers_one_open_per_point_idx')
        ? 'Já existe um caixa aberto neste ponto de venda.'
        : error?.message ?? 'Erro ao abrir caixa.',
    };
  }

  await supabase.from('cash_movements').insert({
    establishment_id: session.activeEstablishmentId,
    cash_register_id: reg.id,
    created_by: session.userId,
    movement_type: 'opening',
    payment_method: 'cash',
    amount: openingBalance,
    description: 'Fundo de troco inicial na abertura do caixa',
  });

  revalidatePath('/caixa');
  revalidatePath('/pdv');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function recordDrawerMovementAction(formData: FormData) {
  const { session } = await getCurrentErpContext();
  if (!session.activeEstablishmentId) return { error: 'Selecione uma empresa.' };

  const cashRegisterId = String(formData.get('cash_register_id') ?? '');
  const movementType = String(formData.get('movement_type') ?? 'supply_inflow') as
    | 'supply_inflow'
    | 'bleed_outflow';
  const amount = Number(formData.get('amount') ?? 0);
  const description = String(formData.get('description') ?? '').trim();

  if (!cashRegisterId || amount <= 0 || !description) {
    return { error: 'Preencha caixa, valor positivo e motivo da movimentação.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('cash_movements').insert({
    establishment_id: session.activeEstablishmentId,
    cash_register_id: cashRegisterId,
    created_by: session.userId,
    movement_type: movementType,
    payment_method: 'cash',
    amount,
    description,
  });

  if (error) return { error: error.message };
  revalidatePath('/caixa');
  return { success: true };
}

export async function closeCashRegisterAction(formData: FormData) {
  const { session } = await getCurrentErpContext();
  const cashRegisterId = String(formData.get('cash_register_id') ?? '');
  const declaredCash = Number(formData.get('declared_cash') ?? 0);
  const notes = String(formData.get('notes') ?? '').trim() || null;

  if (!cashRegisterId || declaredCash < 0) {
    return { error: 'Informe o valor físico contado em espécie na gaveta.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('close_cash_register', {
    p_cash_register_id: cashRegisterId,
    p_closed_by: session.userId,
    p_declared_cash: declaredCash,
    p_notes: notes,
  });

  if (error) return { error: error.message };
  revalidatePath('/caixa');
  revalidatePath('/pdv');
  revalidatePath('/dashboard');
  return { success: true };
}
