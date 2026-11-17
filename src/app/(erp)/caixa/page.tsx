import React from 'react';
import { PageHeader } from '@/components/ui';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentErpContext } from '@/modules/auth/actions';
import {
  calculateDrawerExpectedCash,
  type CashMovementInput,
} from '@/modules/cash-register/reconciliation';
import { CaixaClient, type ClosedRegisterView, type OpenRegisterView } from './caixa-client';

export default async function CaixaPage() {
  const { session, moduleHelp } = await getCurrentErpContext('/caixa');
  const supabase = await createSupabaseServerClient();
  const estId = session.activeEstablishmentId ?? '';

  const [{ data: points }, { data: openRows }, { data: closedRows }] = await Promise.all([
    supabase
      .from('register_points')
      .select('id, name, location_note')
      .eq('establishment_id', estId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('cash_registers')
      .select('id, opening_balance, opened_at, register_points(name), cash_movements(movement_type, payment_method, amount)')
      .eq('establishment_id', estId)
      .eq('status', 'open')
      .order('opened_at', { ascending: false }),
    supabase
      .from('cash_registers')
      .select('id, closing_cash_expected, closing_cash_declared, cash_difference_amount, closed_at, register_points(name)')
      .eq('establishment_id', estId)
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })
      .limit(10),
  ]);

  const openRegisters: OpenRegisterView[] = (openRows ?? []).map((row: Record<string, unknown>) => {
    const point = row.register_points as { name?: string } | null;
    const movements = ((row.cash_movements as CashMovementInput[]) ?? []).map((m) => ({
      ...m,
      amount: Number(m.amount),
    }));
    const recon = calculateDrawerExpectedCash(Number(row.opening_balance), movements);
    return {
      id: String(row.id),
      pointName: point?.name ?? 'Caixa',
      openingBalance: Number(row.opening_balance),
      expectedPhysicalCash: recon.expectedPhysicalCash,
      nonCashBreakdown: recon.nonCashBreakdown,
      openedAt: String(row.opened_at),
    };
  });

  const closedHistory: ClosedRegisterView[] = (closedRows ?? []).map(
    (row: Record<string, unknown>) => {
      const point = row.register_points as { name?: string } | null;
      return {
        id: String(row.id),
        pointName: point?.name ?? 'Caixa',
        expectedCash: Number(row.closing_cash_expected ?? 0),
        declaredCash: Number(row.closing_cash_declared ?? 0),
        difference: Number(row.cash_difference_amount ?? 0),
        closedAt: String(row.closed_at ?? ''),
      };
    }
  );

  return (
    <div>
      <PageHeader
        title={moduleHelp?.label ?? 'Controle de Caixas'}
        subtitle="Múltiplos caixas simultâneos por ponto de atendimento com conferência de gaveta."
        helpTitle={moduleHelp?.helpTitle ?? 'Como operar os Caixas'}
        helpText={
          moduleHelp?.helpText ??
          'Abra o turno informando o troco inicial de cada ponto, registre suprimentos ou sangrias ao longo do dia e faça o fechamento conferindo o dinheiro físico na gaveta.'
        }
      />

      <CaixaClient
        points={points ?? []}
        openRegisters={openRegisters}
        closedHistory={closedHistory}
      />
    </div>
  );
}
