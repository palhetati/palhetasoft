import { roundCents } from '@/lib/formatters';

export interface SaleSummaryInput {
  gross_amount: number;
  total_fee_amount: number;
  net_amount: number;
  status: string;
}

export interface ExpenseSummaryInput {
  amount: number;
  expense_type: 'fixed' | 'variable';
  is_provision: boolean;
  status: string;
}

export interface FinancialSummaryOutput {
  grossRevenue: number;
  totalFees: number;
  netSalesRevenue: number;
  fixedExpensesPaid: number;
  variableExpensesPaid: number;
  realizedNetProfit: number;
  fixedExpensesPending: number;
  variableExpensesPending: number;
  projectedNetProfit: number;
  accountingProvisionsTotal: number;
}

export function computeFinancialSummary(
  sales: SaleSummaryInput[],
  expenses: ExpenseSummaryInput[]
): FinancialSummaryOutput {
  const completedSales = sales.filter((s) => s.status === 'completed');
  const grossRevenue = roundCents(completedSales.reduce((acc, s) => acc + Number(s.gross_amount), 0));
  const totalFees = roundCents(
    completedSales.reduce((acc, s) => acc + Number(s.total_fee_amount), 0)
  );
  const netSalesRevenue = roundCents(grossRevenue - totalFees);

  const realExpenses = expenses.filter((e) => !e.is_provision && e.status !== 'cancelled');
  const provisions = expenses.filter((e) => e.is_provision && e.status !== 'cancelled');

  const fixedExpensesPaid = roundCents(
    realExpenses
      .filter((e) => e.expense_type === 'fixed' && e.status === 'paid')
      .reduce((acc, e) => acc + Number(e.amount), 0)
  );
  const variableExpensesPaid = roundCents(
    realExpenses
      .filter((e) => e.expense_type === 'variable' && e.status === 'paid')
      .reduce((acc, e) => acc + Number(e.amount), 0)
  );
  const fixedExpensesPending = roundCents(
    realExpenses
      .filter((e) => e.expense_type === 'fixed' && e.status === 'pending')
      .reduce((acc, e) => acc + Number(e.amount), 0)
  );
  const variableExpensesPending = roundCents(
    realExpenses
      .filter((e) => e.expense_type === 'variable' && e.status === 'pending')
      .reduce((acc, e) => acc + Number(e.amount), 0)
  );

  const realizedNetProfit = roundCents(
    netSalesRevenue - (fixedExpensesPaid + variableExpensesPaid)
  );
  const projectedNetProfit = roundCents(
    realizedNetProfit - (fixedExpensesPending + variableExpensesPending)
  );
  const accountingProvisionsTotal = roundCents(
    provisions.reduce((acc, e) => acc + Number(e.amount), 0)
  );

  return {
    grossRevenue,
    totalFees,
    netSalesRevenue,
    fixedExpensesPaid,
    variableExpensesPaid,
    realizedNetProfit,
    fixedExpensesPending,
    variableExpensesPending,
    projectedNetProfit,
    accountingProvisionsTotal,
  };
}
