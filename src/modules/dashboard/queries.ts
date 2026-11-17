import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  computeFinancialSummary,
  type ExpenseSummaryInput,
  type FinancialSummaryOutput,
  type SaleSummaryInput,
} from './calculations';

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

  const [{ data: sales }, { data: expenses }, { count: openRegistersCount }, { data: recentSales }] =
    await Promise.all([
      supabase
        .from('sales')
        .select('gross_amount, total_fee_amount, net_amount, status')
        .eq('establishment_id', establishmentId)
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`),
      supabase
        .from('expenses')
        .select('amount, expense_type, is_provision, status')
        .eq('establishment_id', establishmentId)
        .gte('due_date', startDate)
        .lte('due_date', endDate),
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

  const summary = computeFinancialSummary(
    (sales ?? []) as SaleSummaryInput[],
    (expenses ?? []) as ExpenseSummaryInput[]
  );

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
