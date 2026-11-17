import { roundCents } from '@/lib/formatters';

export interface CashMovementInput {
  movement_type:
    | 'opening'
    | 'sale_inflow'
    | 'sale_reversal_outflow'
    | 'supply_inflow'
    | 'bleed_outflow'
    | 'expense_outflow';
  payment_method: 'cash' | 'pix' | 'debit_card' | 'credit_card' | 'customer_credit';
  amount: number;
}

export interface DrawerReconciliationResult {
  expectedPhysicalCash: number;
  nonCashBreakdown: Record<string, number>;
}

const INFLOW_TYPES = new Set(['opening', 'sale_inflow', 'supply_inflow']);

export function calculateDrawerExpectedCash(
  openingBalanceFallback: number,
  movements: CashMovementInput[]
): DrawerReconciliationResult {
  const hasExplicitOpening = movements.some((m) => m.movement_type === 'opening');
  let expectedCash = hasExplicitOpening ? 0 : openingBalanceFallback;
  const nonCashBreakdown: Record<string, number> = {};

  for (const m of movements) {
    const signed = INFLOW_TYPES.has(m.movement_type) ? Number(m.amount) : -Number(m.amount);

    if (m.payment_method === 'cash') {
      expectedCash += signed;
    } else {
      nonCashBreakdown[m.payment_method] = roundCents(
        (nonCashBreakdown[m.payment_method] ?? 0) + signed
      );
    }
  }

  return {
    expectedPhysicalCash: roundCents(expectedCash),
    nonCashBreakdown,
  };
}
