import React from 'react';
import { PageHeader } from '@/components/ui';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentErpContext } from '@/modules/auth/actions';
import { ExpensesClient, type ExpenseRow } from './expenses-client';

export default async function ExpensesPage() {
  const { session, moduleHelp } = await getCurrentErpContext('/despesas');
  const supabase = await createSupabaseServerClient();
  const estId = session.activeEstablishmentId ?? '';

  const [{ data: expenses }, { data: categories }, { data: openRegs }] = await Promise.all([
    supabase
      .from('expenses')
      .select('id, description, expense_type, is_provision, amount, due_date, status, payment_method')
      .eq('establishment_id', estId)
      .order('due_date', { ascending: false }),
    supabase
      .from('financial_categories')
      .select('id, name, type')
      .eq('establishment_id', estId)
      .neq('type', 'income')
      .order('name'),
    supabase
      .from('cash_registers')
      .select('id, register_points(name)')
      .eq('establishment_id', estId)
      .eq('status', 'open'),
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
        title={moduleHelp?.label ?? 'Despesas Fixas e Variáveis'}
        subtitle="Controle suas contas a pagar, despesas operacionais quitadas e reservas trabalhistas."
        helpTitle={moduleHelp?.helpTitle ?? 'Como gerenciar Despesas'}
        helpText={
          moduleHelp?.helpText ??
          'Cadastre contas fixas como aluguel, internet e folha salarial, além de gastos variáveis como reposição de bebidas, insumos e diárias. Você pode dar baixa bancária ou pagar direto com dinheiro de um caixa aberto.'
        }
      />

      <ExpensesClient
        expenses={((expenses ?? []) as ExpenseRow[]).map((e) => ({
          ...e,
          amount: Number(e.amount),
        }))}
        categories={categories ?? []}
        openRegisters={mappedRegisters}
      />
    </div>
  );
}
