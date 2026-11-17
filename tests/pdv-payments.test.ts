import { describe, expect, it } from 'vitest';
import { calculateDrawerExpectedCash } from '@/modules/cash-register/reconciliation';
import {
  ManualPosProcessor,
  prepareSplitSalePayload,
} from '@/modules/pdv/payment-processor';

describe('Multi-Point Cash Drawer Reconciliation & Gateway-Ready Split PDV', () => {
  it('computes expected physical drawer cash strictly from cash movements while keeping PIX/Card in nonCashBreakdown', () => {
    const res = calculateDrawerExpectedCash(200, [
      { movement_type: 'opening', payment_method: 'cash', amount: 200 },
      { movement_type: 'sale_inflow', payment_method: 'cash', amount: 150 },
      { movement_type: 'sale_inflow', payment_method: 'pix', amount: 420 },
      { movement_type: 'sale_inflow', payment_method: 'credit_card', amount: 310 },
      { movement_type: 'supply_inflow', payment_method: 'cash', amount: 50 },
      { movement_type: 'bleed_outflow', payment_method: 'cash', amount: 100 },
      { movement_type: 'expense_outflow', payment_method: 'cash', amount: 30 },
      { movement_type: 'sale_reversal_outflow', payment_method: 'cash', amount: 20 },
    ]);

    // 200 (opening movement) + 150 + 50 - 100 - 30 - 20 = 250
    expect(res.expectedPhysicalCash).toBe(250);
    expect(res.nonCashBreakdown.pix).toBe(420);
    expect(res.nonCashBreakdown.credit_card).toBe(310);
  });

  it('rejects split payments that differ from gross sale total by even R$ 0,01 and computes method fees', async () => {
    const items = [
      { product_id: 'p1', product_name: 'Cerveja', quantity: 4, unit_price: 7.5 },
      { product_id: 'p2', product_name: 'Porção Peixe', quantity: 1, unit_price: 70 },
    ]; // subtotal = 100.00

    expect(() =>
      prepareSplitSalePayload(
        items,
        0,
        [
          { payment_method: 'pix', gross_amount: 33.33 },
          { payment_method: 'cash', gross_amount: 66.66 }, // 99.99 != 100.00
        ],
        [
          { code: 'pix', fee_percent: 0, fixed_fee_amount: 0, settlement_mode: 'manual_pos', provider_name: null },
          { code: 'cash', fee_percent: 0, fixed_fee_amount: 0, settlement_mode: 'manual_pos', provider_name: null },
        ]
      )
    ).toThrow(/soma dos pagamentos/i);

    const processor = new ManualPosProcessor();
    const valid = prepareSplitSalePayload(
      items,
      10, // gross = 90.00
      [
        { payment_method: 'credit_card', gross_amount: 50 },
        { payment_method: 'pix', gross_amount: 40 },
      ],
      [
        { code: 'credit_card', fee_percent: 3.0, fixed_fee_amount: 0.5, settlement_mode: 'manual_pos', provider_name: 'stone' },
        { code: 'pix', fee_percent: 0, fixed_fee_amount: 0, settlement_mode: 'manual_pos', provider_name: null },
      ]
    );

    expect(valid.grossAmount).toBe(90);
    // Fee on R$ 50 credit card = 50 * 3% + 0.50 = 2.00
    expect(valid.totalFeeAmount).toBe(2);
    expect(valid.netAmount).toBe(88);

    const settled = await processor.processSplits(valid.payments);
    expect(settled[0].status).toBe('approved');
    expect(settled[0].settlement_mode).toBe('manual_pos');
    expect(settled[0].external_payload).toBeDefined();
  });
});
