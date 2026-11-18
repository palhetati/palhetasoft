import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { FinancialSummaryOutput } from './calculations';

export function getBrtDateParts(now: Date = new Date()): {
  todayStr: string;
  firstOfMonth: string;
  endOfMonth: string;
} {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayStr = formatter.format(now); // YYYY-MM-DD in BRT
  const [yStr, mStr] = todayStr.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const lastDay = new Date(year, month, 0).getDate();

  return {
    todayStr,
    firstOfMonth: `${yStr}-${mStr}-01`,
    endOfMonth: `${yStr}-${mStr}-${String(lastDay).padStart(2, '0')}`,
  };
}

export async function fetchDashboardData(
  establishmentId: string,
  startDate: string,
  endDate: string
): Promise<{
  summary: FinancialSummaryOutput;
  openRegistersCount: number;
  recentSales: Array<{
    id: string;
    customer_name: string | null;
    gross_amount: number;
    net_amount: number;
    status: string;
    created_at: string;
  }>;
}> {
  const supabase = await createSupabaseServerClient();

  const [{ data: rpcData, error: rpcErr }, { count: openRegistersCount }, { data: recentSales }] =
    await Promise.all([
      supabase.rpc('get_financial_dashboard', {
        p_establishment_id: establishmentId,
        p_start_date: startDate,
        p_end_date: endDate,
      }),
      supabase
        .from('cash_registers')
        .select('id', { count: 'exact', head: true })
        .eq('establishment_id', establishmentId)
        .eq('status', 'open'),
      supabase
        .from('sales')
        .select('id, customer_name, gross_amount, net_amount, status, created_at')
        .eq('establishment_id', establishmentId)
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

  if (rpcErr) {
    throw new Error(`Falha ao consultar resumo financeiro: ${rpcErr.message}`);
  }

  const raw = (rpcData ?? {}) as Record<string, number>;
  const summary: FinancialSummaryOutput = {
    grossRevenue: Number(raw.gross_revenue ?? 0),
    totalFees: Number(raw.total_fees ?? 0),
    netSalesRevenue: Number(raw.net_sales_revenue ?? 0),
    fixedExpensesPaid: Number(raw.fixed_expenses_paid ?? 0),
    variableExpensesPaid: Number(raw.variable_expenses_paid ?? 0),
    realizedNetProfit: Number(raw.realized_net_profit ?? 0),
    fixedExpensesPending: Number(raw.fixed_expenses_pending ?? 0),
    variableExpensesPending: Number(raw.variable_expenses_pending ?? 0),
    projectedNetProfit: Number(raw.projected_net_profit ?? 0),
    accountingProvisionsTotal: Number(raw.accounting_provisions_total ?? 0),
  };

  return {
    summary,
    openRegistersCount: openRegistersCount ?? 0,
    recentSales: (recentSales ?? []).map((r) => ({
      ...r,
      gross_amount: Number(r.gross_amount),
      net_amount: Number(r.net_amount),
    })),
  };
}
