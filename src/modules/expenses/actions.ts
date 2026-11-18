'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentErpContext } from '@/modules/auth/actions';

async function ensureOpenRegisterForTenant(
  cashRegisterId: string,
  establishmentId: string
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('cash_registers')
    .select('id')
    .eq('id', cashRegisterId)
    .eq('establishment_id', establishmentId)
    .eq('status', 'open')
    .maybeSingle();
  return Boolean(data?.id);
}

export async function createExpenseAction(formData: FormData) {
  const { session } = await getCurrentErpContext();
  if (!session.activeEstablishmentId) {
    return { error: 'Selecione uma empresa ativa.' };
  }

  const description = String(formData.get('description') ?? '').trim();
  const expenseType = String(formData.get('expense_type') ?? 'fixed') as 'fixed' | 'variable';
  const amount = Number(formData.get('amount') ?? 0);
  const dueDate = String(formData.get('due_date') ?? '');
  const categoryId = String(formData.get('category_id') ?? '') || null;
  const payNow = formData.get('pay_now') === 'true';
  const paymentMethod = String(formData.get('payment_method') ?? 'pix');
  const cashRegisterId = String(formData.get('cash_register_id') ?? '') || null;

  if (!description || amount <= 0 || !dueDate) {
    return { error: 'Preencha descrição, valor válido e data de vencimento.' };
  }

  if (payNow && cashRegisterId && paymentMethod === 'cash') {
    const validOpen = await ensureOpenRegisterForTenant(cashRegisterId, session.activeEstablishmentId);
    if (!validOpen) {
      return { error: 'O caixa selecionado não está aberto para retirada em espécie.' };
    }
  }

  const supabase = await createSupabaseServerClient();

  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      establishment_id: session.activeEstablishmentId,
      category_id: categoryId,
      cash_register_id: payNow && cashRegisterId && paymentMethod === 'cash' ? cashRegisterId : null,
      created_by: session.userId,
      description,
      expense_type: expenseType,
      is_provision: false,
      amount,
      due_date: dueDate,
      status: payNow ? 'paid' : 'pending',
      paid_at: payNow ? new Date().toISOString() : null,
      payment_method: payNow ? paymentMethod : null,
    })
    .select('id')
    .single();

  if (error || !expense) {
    return { error: error?.message ?? 'Erro ao salvar despesa.' };
  }

  if (payNow && cashRegisterId && paymentMethod === 'cash') {
    await supabase.from('cash_movements').insert({
      establishment_id: session.activeEstablishmentId,
      cash_register_id: cashRegisterId,
      expense_id: expense.id,
      created_by: session.userId,
      movement_type: 'expense_outflow',
      payment_method: 'cash',
      amount,
      description: `Pagamento despesa: ${description}`,
    });
  }

  revalidatePath('/despesas');
  revalidatePath('/dashboard');
  revalidatePath('/caixa');
  return { success: true };
}

export async function markExpensePaidAction(
  expenseId: string,
  paymentMethod: string = 'pix',
  cashRegisterId?: string | null
) {
  const { session } = await getCurrentErpContext();
  if (!session.activeEstablishmentId) return { error: 'Empresa não selecionada.' };

  if (cashRegisterId && paymentMethod === 'cash') {
    const validOpen = await ensureOpenRegisterForTenant(cashRegisterId, session.activeEstablishmentId);
    if (!validOpen) {
      return { error: 'O caixa selecionado não está aberto para retirada em espécie.' };
    }
  }

  const supabase = await createSupabaseServerClient();
  const { data: exp } = await supabase
    .from('expenses')
    .select('id, description, amount, status')
    .eq('id', expenseId)
    .eq('establishment_id', session.activeEstablishmentId)
    .single();

  if (!exp || exp.status !== 'pending') {
    return { error: 'Apenas despesas pendentes podem receber baixa.' };
  }

  const { error } = await supabase
    .from('expenses')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_method: paymentMethod,
      cash_register_id: cashRegisterId && paymentMethod === 'cash' ? cashRegisterId : null,
    })
    .eq('id', expenseId);

  if (error) return { error: error.message };

  if (cashRegisterId && paymentMethod === 'cash') {
    await supabase.from('cash_movements').insert({
      establishment_id: session.activeEstablishmentId,
      cash_register_id: cashRegisterId,
      expense_id: exp.id,
      created_by: session.userId,
      movement_type: 'expense_outflow',
      payment_method: 'cash',
      amount: Number(exp.amount),
      description: `Baixa em espécie: ${exp.description}`,
    });
  }

  revalidatePath('/despesas');
  revalidatePath('/dashboard');
  revalidatePath('/caixa');
  return { success: true };
}

export async function cancelExpenseAction(expenseId: string) {
  const { session } = await getCurrentErpContext();
  if (!session.activeEstablishmentId) return { error: 'Empresa não selecionada.' };

  const supabase = await createSupabaseServerClient();
  const { data: exp } = await supabase
    .from('expenses')
    .select('id, status, cash_register_id')
    .eq('id', expenseId)
    .eq('establishment_id', session.activeEstablishmentId)
    .single();

  if (!exp) return { error: 'Despesa não localizada.' };
  if (exp.status === 'paid' && exp.cash_register_id) {
    return {
      error:
        'Esta despesa já foi retirada fisicamente da gaveta de um caixa. Faça um suprimento no caixa caso o valor tenha retornado.',
    };
  }

  const { error } = await supabase
    .from('expenses')
    .update({ status: 'cancelled' })
    .eq('id', expenseId)
    .eq('establishment_id', session.activeEstablishmentId);

  if (error) return { error: error.message };
  revalidatePath('/despesas');
  revalidatePath('/dashboard');
  return { success: true };
}
