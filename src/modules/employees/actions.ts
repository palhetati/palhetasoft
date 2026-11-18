'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentErpContext } from '@/modules/auth/actions';
import { resolveParametroValue } from '@/modules/parametros/service';
import type { ParametroWebRow } from '@/modules/parametros/types';
import {
  buildMonthlyCltObligationPayloads,
  calculateCltAccountingBreakdown,
  type CltTaxParameters,
} from './clt-calculator';

export async function createEmployeeAction(formData: FormData) {
  const { session } = await getCurrentErpContext();
  if (!session.activeEstablishmentId) return { error: 'Selecione uma empresa.' };

  const fullName = String(formData.get('full_name') ?? '').trim();
  const roleTitle = String(formData.get('role_title') ?? '').trim();
  const documentCpf = String(formData.get('document_cpf') ?? '').trim() || null;
  const phone = String(formData.get('phone') ?? '').trim() || null;
  const contractType = String(formData.get('contract_type') ?? 'clt') as 'clt' | 'non_clt';
  const baseSalaryMonthly = Number(formData.get('base_salary_monthly') ?? 0);
  const dailyRate = Number(formData.get('daily_rate') ?? 0);
  const transportAllowance = Number(formData.get('transport_allowance_monthly') ?? 0);
  const mealAllowance = Number(formData.get('meal_allowance_monthly') ?? 0);
  const otherBenefits = Number(formData.get('other_benefits_monthly') ?? 0);

  if (!fullName || !roleTitle) {
    return { error: 'Informe o nome completo e a função do colaborador.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('employees').insert({
    establishment_id: session.activeEstablishmentId,
    full_name: fullName,
    role_title: roleTitle,
    document_cpf: documentCpf,
    phone,
    contract_type: contractType,
    base_salary_monthly: contractType === 'clt' ? baseSalaryMonthly : 0,
    daily_rate: contractType === 'non_clt' ? dailyRate : 0,
    transport_allowance_monthly: contractType === 'clt' ? transportAllowance : 0,
    meal_allowance_monthly: contractType === 'clt' ? mealAllowance : 0,
    other_benefits_monthly: contractType === 'clt' ? otherBenefits : 0,
  });

  if (error) return { error: error.message };
  revalidatePath('/funcionarios');
  return { success: true };
}

export async function generateCltMonthlyExpensesAction(
  employeeId: string,
  competenceMonth: string
) {
  const { session } = await getCurrentErpContext();
  if (!session.activeEstablishmentId) return { error: 'Selecione uma empresa.' };

  const supabase = await createSupabaseServerClient();
  const [{ data: emp }, { data: est }, { data: paramRows }] = await Promise.all([
    supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .eq('establishment_id', session.activeEstablishmentId)
      .single(),
    supabase
      .from('establishments')
      .select('tax_regime')
      .eq('id', session.activeEstablishmentId)
      .single(),
    supabase
      .from('parametros_web')
      .select('*')
      .eq('chave_parametro', 'clt_tributos_vigentes'),
  ]);

  if (!emp || emp.contract_type !== 'clt') {
    return { error: 'Colaborador CLT não localizado.' };
  }

  const cltParams = resolveParametroValue<CltTaxParameters>(
    (paramRows ?? []) as ParametroWebRow[],
    'clt_tributos_vigentes',
    session.activeEstablishmentId
  );

  if (!cltParams) {
    return {
      error:
        'Parâmetro clt_tributos_vigentes não encontrado em parametros_web. Cadastre na área de Administração.',
    };
  }

  const breakdown = calculateCltAccountingBreakdown(
    {
      baseSalaryMonthly: Number(emp.base_salary_monthly),
      transportAllowanceMonthly: Number(emp.transport_allowance_monthly),
      mealAllowanceMonthly: Number(emp.meal_allowance_monthly),
      otherBenefitsMonthly: Number(emp.other_benefits_monthly),
      customEmployerInssRate:
        emp.custom_employer_inss_rate !== null ? Number(emp.custom_employer_inss_rate) : null,
      customRatRate: emp.custom_rat_rate !== null ? Number(emp.custom_rat_rate) : null,
    },
    est?.tax_regime ?? 'simples_nacional',
    cltParams
  );

  const obligations = buildMonthlyCltObligationPayloads(
    emp.full_name,
    competenceMonth,
    breakdown,
    cltParams
  );

  const { data: insertedCount, error } = await supabase.rpc('generate_clt_monthly_obligations', {
    p_establishment_id: session.activeEstablishmentId,
    p_employee_id: employeeId,
    p_competence_month: competenceMonth,
    p_created_by: session.userId,
    p_obligations: obligations,
  });

  if (error) return { error: error.message };

  revalidatePath('/funcionarios');
  revalidatePath('/despesas');
  revalidatePath('/dashboard');
  return { success: true, insertedCount: Number(insertedCount ?? 0) };
}

export async function launchDiaristaPaymentAction(formData: FormData) {
  const { session } = await getCurrentErpContext();
  if (!session.activeEstablishmentId) return { error: 'Selecione uma empresa.' };

  const employeeId = String(formData.get('employee_id') ?? '');
  const employeeName = String(formData.get('employee_name') ?? '');
  const daysWorked = Number(formData.get('days_worked') ?? 1);
  const dailyRate = Number(formData.get('daily_rate') ?? 0);
  const payNow = formData.get('pay_now') === 'true';
  const cashRegisterId = String(formData.get('cash_register_id') ?? '') || null;

  const totalAmount = Math.round(daysWorked * dailyRate * 100) / 100;
  if (!employeeId || totalAmount <= 0) {
    return { error: 'Informe a quantidade de diárias e um valor válido.' };
  }

  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createSupabaseServerClient();

  if (payNow && cashRegisterId) {
    const { data: validReg } = await supabase
      .from('cash_registers')
      .select('id')
      .eq('id', cashRegisterId)
      .eq('establishment_id', session.activeEstablishmentId)
      .eq('status', 'open')
      .maybeSingle();

    if (!validReg) {
      return { error: 'O caixa selecionado não está aberto para pagamento de diária em espécie.' };
    }
  }

  const { data: exp, error } = await supabase
    .from('expenses')
    .insert({
      establishment_id: session.activeEstablishmentId,
      employee_id: employeeId,
      cash_register_id: payNow && cashRegisterId ? cashRegisterId : null,
      created_by: session.userId,
      description: `Diária (${daysWorked}d): ${employeeName}`,
      expense_type: 'variable',
      is_provision: false,
      amount: totalAmount,
      due_date: today,
      status: payNow ? 'paid' : 'pending',
      paid_at: payNow ? new Date().toISOString() : null,
      payment_method: payNow ? (cashRegisterId ? 'cash' : 'pix') : null,
    })
    .select('id')
    .single();

  if (error || !exp) return { error: error?.message ?? 'Erro ao registrar diária.' };

  if (payNow && cashRegisterId) {
    await supabase.from('cash_movements').insert({
      establishment_id: session.activeEstablishmentId,
      cash_register_id: cashRegisterId,
      expense_id: exp.id,
      created_by: session.userId,
      movement_type: 'expense_outflow',
      payment_method: 'cash',
      amount: totalAmount,
      description: `Pagamento diária na gaveta: ${employeeName}`,
    });
  }

  revalidatePath('/funcionarios');
  revalidatePath('/despesas');
  revalidatePath('/caixa');
  revalidatePath('/dashboard');
  return { success: true };
}
