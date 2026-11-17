-- ============================================================================
-- PALHETA SOFT ERP - MIGRATION 002
-- Frente 1 Core ERP Tables, RLS & Atomic Transactional RPCs
-- ============================================================================

-- 1. FINANCIAL_CATEGORIES
CREATE TABLE IF NOT EXISTS public.financial_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense_fixed', 'expense_variable')),
  color_token text NOT NULL DEFAULT 'accent-sky'
    CHECK (color_token IN (
      'accent-sky', 'accent-purple', 'accent-pink',
      'accent-orange', 'accent-teal', 'accent-green', 'accent-brown'
    )),
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. PAYMENT_METHOD_CONFIGS (Pronto para Gateways, SmartPOS e Crédito Cashless)
CREATE TABLE IF NOT EXISTS public.payment_method_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  code text NOT NULL
    CHECK (code IN ('cash', 'pix', 'debit_card', 'credit_card', 'customer_credit')),
  label text NOT NULL,
  settlement_mode text NOT NULL DEFAULT 'manual_pos'
    CHECK (settlement_mode IN ('manual_pos', 'gateway_api', 'smart_pos_terminal')),
  provider_name text,
  fee_percent numeric(5,2) NOT NULL DEFAULT 0,
  fixed_fee_amount numeric(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (establishment_id, code)
);

-- 3. REGISTER_POINTS (Pontos/Terminais de Caixa ex: Caixa Bar, Caixa Restaurante)
CREATE TABLE IF NOT EXISTS public.register_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  name text NOT NULL,
  location_note text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. CASH_REGISTERS (Sessões abertas simultaneamente por ponto de caixa)
CREATE TABLE IF NOT EXISTS public.cash_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  register_point_id uuid NOT NULL REFERENCES public.register_points(id) ON DELETE RESTRICT,
  opened_by uuid NOT NULL REFERENCES public.app_users(id),
  closed_by uuid REFERENCES public.app_users(id),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opening_balance numeric(12,2) NOT NULL DEFAULT 0,
  closing_cash_expected numeric(12,2),
  closing_cash_declared numeric(12,2),
  cash_difference_amount numeric(12,2),
  closing_summary_by_method jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS cash_registers_one_open_per_point_idx
  ON public.cash_registers (register_point_id)
  WHERE status = 'open';

-- 5. PRODUCTS (Catálogo e controle simples de estoque)
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  category text NOT NULL DEFAULT 'geral'
    CHECK (category IN ('bar', 'restaurante', 'portaria', 'loja', 'geral')),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  cost_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  track_stock boolean NOT NULL DEFAULT false,
  stock_quantity numeric(12,3) NOT NULL DEFAULT 0,
  min_stock_alert numeric(12,3) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. SALES (Cabeçalho da venda com ganchos para Portaria e Comandas)
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  cash_register_id uuid NOT NULL REFERENCES public.cash_registers(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES public.app_users(id),
  cancelled_by uuid REFERENCES public.app_users(id),
  origin_module text NOT NULL DEFAULT 'pdv'
    CHECK (origin_module IN ('pdv', 'portaria', 'comanda')),
  customer_name text,
  subtotal_amount numeric(12,2) NOT NULL CHECK (subtotal_amount >= 0),
  discount_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  gross_amount numeric(12,2) NOT NULL CHECK (gross_amount >= 0),
  total_fee_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_fee_amount >= 0),
  net_amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending_payment', 'completed', 'cancelled')),
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz
);

-- 7. SALE_ITEMS
CREATE TABLE IF NOT EXISTS public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name_snapshot text NOT NULL,
  quantity numeric(12,3) NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  total_price numeric(12,2) NOT NULL CHECK (total_price >= 0)
);

-- 8. SALE_PAYMENTS (Pagamento dividido + metadados externos de Gateway/SmartPOS)
CREATE TABLE IF NOT EXISTS public.sale_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  payment_method text NOT NULL
    CHECK (payment_method IN ('cash', 'pix', 'debit_card', 'credit_card', 'customer_credit')),
  settlement_mode text NOT NULL DEFAULT 'manual_pos'
    CHECK (settlement_mode IN ('manual_pos', 'gateway_api', 'smart_pos_terminal')),
  provider_name text,
  external_transaction_id text,
  external_qr_code text,
  external_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  gross_amount numeric(12,2) NOT NULL CHECK (gross_amount > 0),
  fee_percent numeric(5,2) NOT NULL DEFAULT 0,
  fee_amount numeric(12,2) NOT NULL DEFAULT 0,
  net_amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'declined', 'cancelled', 'refunded')),
  paid_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. EMPLOYEES (Colaboradores CLT e Não-CLT / Diaristas)
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  document_cpf text,
  phone text,
  role_title text NOT NULL,
  contract_type text NOT NULL CHECK (contract_type IN ('clt', 'non_clt')),
  base_salary_monthly numeric(12,2) NOT NULL DEFAULT 0,
  daily_rate numeric(12,2) NOT NULL DEFAULT 0,
  transport_allowance_monthly numeric(12,2) NOT NULL DEFAULT 0,
  meal_allowance_monthly numeric(12,2) NOT NULL DEFAULT 0,
  other_benefits_monthly numeric(12,2) NOT NULL DEFAULT 0,
  custom_employer_inss_rate numeric(5,2),
  custom_rat_rate numeric(5,2),
  hire_date date DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. EXPENSES (Despesas Fixas, Variáveis e Reservas Contábeis CLT)
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  cash_register_id uuid REFERENCES public.cash_registers(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  description text NOT NULL,
  expense_type text NOT NULL CHECK (expense_type IN ('fixed', 'variable')),
  is_provision boolean NOT NULL DEFAULT false,
  competence_month text,
  obligation_code text,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  due_date date NOT NULL,
  paid_at timestamptz,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'cancelled')),
  payment_method text,
  accounting_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS expenses_unique_employee_monthly_obligation_idx
  ON public.expenses (employee_id, competence_month, obligation_code)
  WHERE employee_id IS NOT NULL AND competence_month IS NOT NULL AND obligation_code IS NOT NULL AND status <> 'cancelled';

-- 11. CASH_MOVEMENTS (Livro-razão do turno do caixa)
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  cash_register_id uuid NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  sale_payment_id uuid REFERENCES public.sale_payments(id) ON DELETE SET NULL,
  expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  movement_type text NOT NULL
    CHECK (movement_type IN (
      'opening', 'sale_inflow', 'sale_reversal_outflow',
      'supply_inflow', 'bleed_outflow', 'expense_outflow'
    )),
  payment_method text NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'pix', 'debit_card', 'credit_card', 'customer_credit')),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- ENABLE RLS & TENANT ISOLATION POLICIES
-- ============================================================================

ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_method_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.register_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'financial_categories', 'payment_method_configs', 'register_points',
    'cash_registers', 'products', 'sales', 'sale_items',
    'sale_payments', 'employees', 'expenses', 'cash_movements'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I_tenant_policy ON public.%I FOR ALL TO authenticated USING (public.can_access_establishment(establishment_id)) WITH CHECK (public.can_access_establishment(establishment_id));',
      t, t
    );
  END LOOP;
END $$;

-- ============================================================================
-- ATOMIC TRANSACTIONAL RPCs
-- ============================================================================

-- 1. COMPLETE PDV SALE (Itens + Pagamento Dividido + Estoque + Caixa)
CREATE OR REPLACE FUNCTION public.complete_pdv_sale(
  p_establishment_id uuid,
  p_cash_register_id uuid,
  p_created_by uuid,
  p_customer_name text,
  p_discount_amount numeric,
  p_items jsonb,
  p_payments jsonb,
  p_origin_module text DEFAULT 'pdv'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg_status text;
  v_allow_neg boolean;
  v_subtotal numeric(12,2) := 0;
  v_gross numeric(12,2) := 0;
  v_payments_sum numeric(12,2) := 0;
  v_total_fees numeric(12,2) := 0;
  v_sale_id uuid;
  v_item jsonb;
  v_pay jsonb;
  v_prod record;
  v_payment_id uuid;
BEGIN
  IF NOT public.can_access_establishment(p_establishment_id) THEN
    RAISE EXCEPTION 'Acesso negado ao estabelecimento informado.';
  END IF;

  SELECT cr.status, e.allow_negative_stock
    INTO v_reg_status, v_allow_neg
    FROM public.cash_registers cr
    JOIN public.establishments e ON e.id = cr.establishment_id
   WHERE cr.id = p_cash_register_id
     AND cr.establishment_id = p_establishment_id
   FOR UPDATE;

  IF NOT FOUND OR v_reg_status <> 'open' THEN
    RAISE EXCEPTION 'O caixa selecionado não está aberto para registrar vendas.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_subtotal := v_subtotal + ROUND(((v_item->>'quantity')::numeric * (v_item->>'unit_price')::numeric), 2);
  END LOOP;

  v_gross := ROUND(v_subtotal - COALESCE(p_discount_amount, 0), 2);
  IF v_gross < 0 THEN
    RAISE EXCEPTION 'O desconto não pode superar o subtotal da venda.';
  END IF;

  FOR v_pay IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    v_payments_sum := v_payments_sum + ROUND((v_pay->>'gross_amount')::numeric, 2);
    v_total_fees := v_total_fees + ROUND(COALESCE((v_pay->>'fee_amount')::numeric, 0), 2);
  END LOOP;

  IF v_payments_sum <> v_gross THEN
    RAISE EXCEPTION 'A soma dos pagamentos (%) difere do total da venda (%).', v_payments_sum, v_gross;
  END IF;

  INSERT INTO public.sales (
    establishment_id, cash_register_id, created_by, origin_module,
    customer_name, subtotal_amount, discount_amount, gross_amount,
    total_fee_amount, net_amount, status
  ) VALUES (
    p_establishment_id, p_cash_register_id, p_created_by, COALESCE(p_origin_module, 'pdv'),
    p_customer_name, v_subtotal, COALESCE(p_discount_amount, 0), v_gross,
    v_total_fees, ROUND(v_gross - v_total_fees, 2), 'completed'
  ) RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_prod
      FROM public.products
     WHERE id = (v_item->>'product_id')::uuid
       AND establishment_id = p_establishment_id
     FOR UPDATE;

    IF FOUND AND v_prod.track_stock THEN
      IF NOT v_allow_neg AND (v_prod.stock_quantity - (v_item->>'quantity')::numeric) < 0 THEN
        RAISE EXCEPTION 'Estoque insuficiente para o produto %.', v_prod.name;
      END IF;
      UPDATE public.products
         SET stock_quantity = stock_quantity - (v_item->>'quantity')::numeric
       WHERE id = v_prod.id;
    END IF;

    INSERT INTO public.sale_items (
      establishment_id, sale_id, product_id, product_name_snapshot,
      quantity, unit_price, total_price
    ) VALUES (
      p_establishment_id, v_sale_id,
      NULLIF(v_item->>'product_id', '')::uuid,
      v_item->>'product_name',
      (v_item->>'quantity')::numeric,
      (v_item->>'unit_price')::numeric,
      ROUND(((v_item->>'quantity')::numeric * (v_item->>'unit_price')::numeric), 2)
    );
  END LOOP;

  FOR v_pay IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    INSERT INTO public.sale_payments (
      establishment_id, sale_id, payment_method, settlement_mode,
      provider_name, external_transaction_id, external_payload,
      gross_amount, fee_percent, fee_amount, net_amount, status
    ) VALUES (
      p_establishment_id, v_sale_id,
      v_pay->>'payment_method',
      COALESCE(v_pay->>'settlement_mode', 'manual_pos'),
      v_pay->>'provider_name',
      v_pay->>'external_transaction_id',
      COALESCE(v_pay->'external_payload', '{}'::jsonb),
      ROUND((v_pay->>'gross_amount')::numeric, 2),
      COALESCE((v_pay->>'fee_percent')::numeric, 0),
      ROUND(COALESCE((v_pay->>'fee_amount')::numeric, 0), 2),
      ROUND((v_pay->>'gross_amount')::numeric - COALESCE((v_pay->>'fee_amount')::numeric, 0), 2),
      COALESCE(v_pay->>'status', 'approved')
    ) RETURNING id INTO v_payment_id;

    INSERT INTO public.cash_movements (
      establishment_id, cash_register_id, sale_payment_id, created_by,
      movement_type, payment_method, amount, description
    ) VALUES (
      p_establishment_id, p_cash_register_id, v_payment_id, p_created_by,
      'sale_inflow', v_pay->>'payment_method',
      ROUND((v_pay->>'gross_amount')::numeric, 2),
      'Venda PDV #' || substring(v_sale_id::text, 1, 8)
    );
  END LOOP;

  RETURN v_sale_id;
END;
$$;

-- 2. CANCEL PDV SALE (Estorno atômico de caixa + estoque)
CREATE OR REPLACE FUNCTION public.cancel_pdv_sale(
  p_sale_id uuid,
  p_cancelled_by uuid,
  p_reason text DEFAULT 'Estorno operacional'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale record;
  v_reg_status text;
  v_allowed boolean := false;
  v_item record;
  v_pay record;
BEGIN
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venda não localizada.';
  END IF;

  IF NOT public.can_access_establishment(v_sale.establishment_id) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  IF v_sale.status = 'cancelled' THEN
    RAISE EXCEPTION 'Esta venda já foi estornada.';
  END IF;

  SELECT public.is_super_admin() OR COALESCE(bool_or(ap.can_cancel_sales), false)
    INTO v_allowed
    FROM public.user_profiles up
    JOIN public.access_profiles ap ON ap.id = up.profile_id
   WHERE up.user_id = p_cancelled_by;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Seu perfil não possui permissão para estornar vendas.';
  END IF;

  SELECT status INTO v_reg_status FROM public.cash_registers WHERE id = v_sale.cash_register_id;
  IF v_reg_status <> 'open' THEN
    RAISE EXCEPTION 'Só é permitido estornar vendas enquanto o turno do caixa estiver aberto.';
  END IF;

  UPDATE public.sales
     SET status = 'cancelled',
         cancelled_by = p_cancelled_by,
         cancel_reason = p_reason,
         cancelled_at = now()
   WHERE id = p_sale_id;

  UPDATE public.sale_payments
     SET status = 'refunded'
   WHERE sale_id = p_sale_id;

  FOR v_item IN SELECT * FROM public.sale_items WHERE sale_id = p_sale_id
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      UPDATE public.products
         SET stock_quantity = stock_quantity + v_item.quantity
       WHERE id = v_item.product_id AND track_stock = true;
    END IF;
  END LOOP;

  FOR v_pay IN SELECT * FROM public.sale_payments WHERE sale_id = p_sale_id
  LOOP
    INSERT INTO public.cash_movements (
      establishment_id, cash_register_id, sale_payment_id, created_by,
      movement_type, payment_method, amount, description
    ) VALUES (
      v_sale.establishment_id, v_sale.cash_register_id, v_pay.id, p_cancelled_by,
      'sale_reversal_outflow', v_pay.payment_method, v_pay.gross_amount,
      'Estorno Venda #' || substring(p_sale_id::text, 1, 8)
    );
  END LOOP;
END;
$$;

-- 3. CLOSE CASH REGISTER (Conferência exclusiva do dinheiro físico na gaveta)
CREATE OR REPLACE FUNCTION public.close_cash_register(
  p_cash_register_id uuid,
  p_closed_by uuid,
  p_declared_cash numeric,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg record;
  v_expected_cash numeric(12,2) := 0;
  v_diff numeric(12,2) := 0;
  v_summary jsonb;
BEGIN
  SELECT * INTO v_reg FROM public.cash_registers WHERE id = p_cash_register_id FOR UPDATE;
  IF NOT FOUND OR v_reg.status <> 'open' THEN
    RAISE EXCEPTION 'Este caixa já está fechado ou não existe.';
  END IF;

  IF NOT public.can_access_establishment(v_reg.establishment_id) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  SELECT COALESCE(SUM(
    CASE
      WHEN movement_type IN ('opening', 'sale_inflow', 'supply_inflow') THEN amount
      WHEN movement_type IN ('bleed_outflow', 'expense_outflow', 'sale_reversal_outflow') THEN -amount
      ELSE 0
    END
  ), 0)
    INTO v_expected_cash
    FROM public.cash_movements
   WHERE cash_register_id = p_cash_register_id
     AND payment_method = 'cash';

  SELECT COALESCE(jsonb_object_agg(payment_method, net_method_total), '{}'::jsonb)
    INTO v_summary
    FROM (
      SELECT payment_method,
             SUM(
               CASE
                 WHEN movement_type IN ('opening', 'sale_inflow', 'supply_inflow') THEN amount
                 ELSE -amount
               END
             ) AS net_method_total
        FROM public.cash_movements
       WHERE cash_register_id = p_cash_register_id
       GROUP BY payment_method
    ) sub;

  v_diff := ROUND(p_declared_cash - v_expected_cash, 2);

  UPDATE public.cash_registers
     SET status = 'closed',
         closed_by = p_closed_by,
         closing_cash_expected = v_expected_cash,
         closing_cash_declared = p_declared_cash,
         cash_difference_amount = v_diff,
         closing_summary_by_method = v_summary,
         notes = COALESCE(p_notes, notes),
         closed_at = now()
   WHERE id = p_cash_register_id;

  RETURN jsonb_build_object(
    'expected_cash', v_expected_cash,
    'declared_cash', p_declared_cash,
    'difference', v_diff,
    'summary_by_method', v_summary
  );
END;
$$;

-- 4. GENERATE CLT MONTHLY OBLIGATIONS (Lendo de parametros_web sem duplicidade)
CREATE OR REPLACE FUNCTION public.generate_clt_monthly_obligations(
  p_establishment_id uuid,
  p_employee_id uuid,
  p_competence_month text,
  p_created_by uuid,
  p_obligations jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_inserted integer := 0;
  v_row_count integer;
BEGIN
  IF NOT public.can_access_establishment(p_establishment_id) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_obligations)
  LOOP
    INSERT INTO public.expenses (
      establishment_id, employee_id, created_by, description,
      expense_type, is_provision, competence_month, obligation_code,
      amount, due_date, status, accounting_metadata
    ) VALUES (
      p_establishment_id,
      p_employee_id,
      p_created_by,
      v_item->>'description',
      'fixed',
      COALESCE((v_item->>'is_provision')::boolean, false),
      p_competence_month,
      v_item->>'obligation_code',
      ROUND((v_item->>'amount')::numeric, 2),
      (v_item->>'due_date')::date,
      'pending',
      COALESCE(v_item->'metadata', '{}'::jsonb)
    )
    ON CONFLICT (employee_id, competence_month, obligation_code)
    WHERE employee_id IS NOT NULL AND competence_month IS NOT NULL AND obligation_code IS NOT NULL AND status <> 'cancelled'
    DO NOTHING;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    v_inserted := v_inserted + v_row_count;
  END LOOP;

  RETURN v_inserted;
END;
$$;

-- 5. GET FINANCIAL DASHBOARD (Visão Dupla Realizado vs Previsto + Provisões)
CREATE OR REPLACE FUNCTION public.get_financial_dashboard(
  p_establishment_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gross numeric(12,2) := 0;
  v_fees numeric(12,2) := 0;
  v_net_sales numeric(12,2) := 0;
  v_fixed_paid numeric(12,2) := 0;
  v_var_paid numeric(12,2) := 0;
  v_fixed_pending numeric(12,2) := 0;
  v_var_pending numeric(12,2) := 0;
  v_provisions numeric(12,2) := 0;
BEGIN
  IF NOT public.can_access_establishment(p_establishment_id) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  SELECT COALESCE(SUM(gross_amount), 0),
         COALESCE(SUM(total_fee_amount), 0),
         COALESCE(SUM(net_amount), 0)
    INTO v_gross, v_fees, v_net_sales
    FROM public.sales
   WHERE establishment_id = p_establishment_id
     AND status = 'completed'
     AND created_at::date BETWEEN p_start_date AND p_end_date;

  SELECT
    COALESCE(SUM(amount) FILTER (WHERE is_provision = false AND expense_type = 'fixed' AND status = 'paid'), 0),
    COALESCE(SUM(amount) FILTER (WHERE is_provision = false AND expense_type = 'variable' AND status = 'paid'), 0),
    COALESCE(SUM(amount) FILTER (WHERE is_provision = false AND expense_type = 'fixed' AND status = 'pending'), 0),
    COALESCE(SUM(amount) FILTER (WHERE is_provision = false AND expense_type = 'variable' AND status = 'pending'), 0),
    COALESCE(SUM(amount) FILTER (WHERE is_provision = true AND status <> 'cancelled'), 0)
  INTO v_fixed_paid, v_var_paid, v_fixed_pending, v_var_pending, v_provisions
  FROM public.expenses
  WHERE establishment_id = p_establishment_id
    AND due_date BETWEEN p_start_date AND p_end_date;

  RETURN jsonb_build_object(
    'gross_revenue', v_gross,
    'total_fees', v_fees,
    'net_sales_revenue', v_net_sales,
    'fixed_expenses_paid', v_fixed_paid,
    'variable_expenses_paid', v_var_paid,
    'realized_net_profit', ROUND(v_net_sales - (v_fixed_paid + v_var_paid), 2),
    'fixed_expenses_pending', v_fixed_pending,
    'variable_expenses_pending', v_var_pending,
    'projected_net_profit', ROUND(v_net_sales - (v_fixed_paid + v_var_paid + v_fixed_pending + v_var_pending), 2),
    'accounting_provisions_total', v_provisions
  );
END;
$$;
