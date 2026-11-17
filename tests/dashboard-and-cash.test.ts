import { describe, expect, it } from 'vitest';
import { computeFinancialSummary } from '@/modules/dashboard/calculations';

describe('Dual Financial Dashboard (Realized vs Projected + CLT Provisions)', () => {
  it('separates realized net profit, pending obligations, and CLT accounting provisions without double-counting', () => {
    const summary = computeFinancialSummary(
      [
        { gross_amount: 1000, total_fee_amount: 25, net_amount: 975, status: 'completed' },
        { gross_amount: 500, total_fee_amount: 0, net_amount: 500, status: 'completed' },
        { gross_amount: 300, total_fee_amount: 10, net_amount: 290, status: 'cancelled' },
      ],
      [
        // Paid Fixed & Variable expenses
        { amount: 400, expense_type: 'fixed', is_provision: false, status: 'paid' },
        { amount: 175, expense_type: 'variable', is_provision: false, status: 'paid' },
        // Pending Fixed & Variable expenses
        { amount: 200, expense_type: 'fixed', is_provision: false, status: 'pending' },
        { amount: 100, expense_type: 'variable', is_provision: false, status: 'pending' },
        // CLT Accounting Provisions (13th + Vacation reserve) - must NEVER deduct from realized cash
        { amount: 150, expense_type: 'fixed', is_provision: true, status: 'pending' },
        { amount: 80, expense_type: 'fixed', is_provision: true, status: 'paid' },
      ]
    );

    expect(summary.grossRevenue).toBe(1500);
    expect(summary.totalFees).toBe(25);
    expect(summary.netSalesRevenue).toBe(1475);
    expect(summary.fixedExpensesPaid).toBe(400);
    expect(summary.variableExpensesPaid).toBe(175);
    // Realized = 1475 - (400 + 175) = 900
    expect(summary.realizedNetProfit).toBe(900);
    expect(summary.fixedExpensesPending).toBe(200);
    expect(summary.variableExpensesPending).toBe(100);
    // Projected = 900 - (200 + 100) = 600
    expect(summary.projectedNetProfit).toBe(600);
    // Provisions = 150 + 80 = 230
    expect(summary.accountingProvisionsTotal).toBe(230);
  });
});
