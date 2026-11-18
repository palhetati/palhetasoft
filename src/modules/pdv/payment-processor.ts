import { roundCents } from '@/lib/formatters';

export type PaymentMethodCode =
  | 'cash'
  | 'pix'
  | 'debit_card'
  | 'credit_card'
  | 'customer_credit';

export type SettlementMode = 'manual_pos' | 'gateway_api' | 'smart_pos_terminal';

export interface CartItemInput {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface PaymentSplitInput {
  payment_method: PaymentMethodCode;
  gross_amount: number;
}

export interface PaymentMethodConfigInput {
  code: PaymentMethodCode;
  fee_percent: number;
  fixed_fee_amount: number;
  settlement_mode: SettlementMode;
  provider_name: string | null;
}

export interface PreparedPaymentSplit {
  payment_method: PaymentMethodCode;
  settlement_mode: SettlementMode;
  provider_name: string | null;
  external_transaction_id: string | null;
  external_qr_code?: string | null;
  external_payload: Record<string, unknown>;
  gross_amount: number;
  fee_percent: number;
  fee_amount: number;
  net_amount: number;
  status: 'pending' | 'approved' | 'declined';
}

export interface PaymentProcessor {
  processSplits(splits: PreparedPaymentSplit[]): Promise<PreparedPaymentSplit[]>;
}

/**
 * Ciclo 1 active adapter: confirms immediate counter payment while keeping the
 * full external gateway / SmartPOS envelope ready for future provider adapters.
 */
export class ManualPosProcessor implements PaymentProcessor {
  async processSplits(splits: PreparedPaymentSplit[]): Promise<PreparedPaymentSplit[]> {
    return splits.map((split) => ({
      ...split,
      settlement_mode: 'manual_pos',
      status: 'approved',
      external_payload: {
        ...split.external_payload,
        confirmedAt: new Date().toISOString(),
        adapter: 'ManualPosProcessor',
      },
    }));
  }
}

export function prepareSplitSalePayload(
  items: CartItemInput[],
  discountAmount: number,
  splits: PaymentSplitInput[],
  methodConfigs: PaymentMethodConfigInput[]
) {
  if (items.length === 0) {
    throw new Error('Adicione pelo menos um produto à venda.');
  }

  const subtotalAmount = roundCents(
    items.reduce((acc, it) => acc + roundCents(it.quantity * it.unit_price), 0)
  );
  const cleanDiscount = roundCents(Math.max(0, discountAmount));
  if (cleanDiscount > subtotalAmount) {
    throw new Error('O desconto não pode superar o subtotal dos itens.');
  }

  const grossAmount = roundCents(subtotalAmount - cleanDiscount);
  if (grossAmount <= 0) {
    throw new Error('O total da venda deve ter valor maior que zero.');
  }

  if (splits.length === 0 || splits.some((s) => roundCents(s.gross_amount) <= 0)) {
    throw new Error('Cada parcela de pagamento dividido deve ter valor maior que zero.');
  }

  const splitsSum = roundCents(splits.reduce((acc, s) => acc + roundCents(s.gross_amount), 0));

  if (splitsSum !== grossAmount) {
    throw new Error(
      `A soma dos pagamentos (${splitsSum.toFixed(2)}) difere do total líquido de desconto da venda (${grossAmount.toFixed(2)}).`
    );
  }

  const configMap = new Map(methodConfigs.map((c) => [c.code, c]));

  const payments: PreparedPaymentSplit[] = splits.map((s) => {
    const cfg = configMap.get(s.payment_method);
    const feePercent = Number(cfg?.fee_percent ?? 0);
    const fixedFee = Number(cfg?.fixed_fee_amount ?? 0);
    const gross = roundCents(s.gross_amount);
    const feeAmount = roundCents((gross * feePercent) / 100 + fixedFee);
    const netAmount = roundCents(gross - feeAmount);

    return {
      payment_method: s.payment_method,
      settlement_mode: cfg?.settlement_mode ?? 'manual_pos',
      provider_name: cfg?.provider_name ?? null,
      external_transaction_id: null,
      external_qr_code: null,
      external_payload: {},
      gross_amount: gross,
      fee_percent: feePercent,
      fee_amount: feeAmount,
      net_amount: netAmount,
      status: 'pending',
    };
  });

  const totalFeeAmount = roundCents(payments.reduce((acc, p) => acc + p.fee_amount, 0));
  const netAmount = roundCents(grossAmount - totalFeeAmount);

  return {
    subtotalAmount,
    discountAmount: cleanDiscount,
    grossAmount,
    totalFeeAmount,
    netAmount,
    items,
    payments,
  };
}
