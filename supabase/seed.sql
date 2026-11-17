-- ============================================================================
-- PALHETA SOFT ERP - SEED INICIAL PARA DOCKER LOCAL
-- Todos os textos voltados ao usuario estao livres de travessoes.
-- Senha padrao das contas de teste: palheta123
-- ============================================================================

DO $$
DECLARE
  v_est_id uuid := '11111111-1111-4111-8111-111111111111';
  v_super_id uuid := '00000000-0000-4000-8000-000000000001';
  v_owner_id uuid := '00000000-0000-4000-8000-000000000002';
  v_cashier_id uuid := '00000000-0000-4000-8000-000000000003';

  v_mod_fin uuid := '20000000-0000-4000-8000-000000000001';
  v_mod_dash uuid := '20000000-0000-4000-8000-000000000002';
  v_mod_exp uuid := '20000000-0000-4000-8000-000000000003';
  v_mod_ops uuid := '20000000-0000-4000-8000-000000000004';
  v_mod_pdv uuid := '20000000-0000-4000-8000-000000000005';
  v_mod_caixa uuid := '20000000-0000-4000-8000-000000000006';
  v_mod_prod uuid := '20000000-0000-4000-8000-000000000007';
  v_mod_rh uuid := '20000000-0000-4000-8000-000000000008';
  v_mod_func uuid := '20000000-0000-4000-8000-000000000009';
  v_mod_admin uuid := '20000000-0000-4000-8000-000000000010';

  v_prof_owner uuid := '30000000-0000-4000-8000-000000000001';
  v_prof_cashier uuid := '30000000-0000-4000-8000-000000000002';
BEGIN
  -- 1. Estabelecimento Piloto
  INSERT INTO public.establishments (id, name, slug, document_cnpj, business_vertical, tax_regime, allow_negative_stock)
  VALUES (
    v_est_id,
    'Balneário Águas Claras',
    'balneario-aguas-claras',
    '12.345.678/0001-90',
    'balneario',
    'simples_nacional',
    true
  ) ON CONFLICT (id) DO NOTHING;

  -- 2. Parametros Globais (parametros_web) incluindo CLT 100% parametrizada
  INSERT INTO public.parametros_web (establishment_id, chave_parametro, valor_parametro, descricao)
  VALUES (
    NULL,
    'clt_tributos_vigentes',
    '{"fgtsRate":8,"vacationBonusFraction":0.333333,"thirteenthFraction":0.083333,"vacationMonthlyFraction":0.083333,"vtEmployeeCapPercent":6,"inssBrackets":[{"upTo":1518.00,"rate":7.5},{"upTo":2793.88,"rate":9.0},{"upTo":4190.83,"rate":12.0},{"upTo":8157.41,"rate":14.0}],"irrfBrackets":[{"upTo":2259.20,"rate":0,"deduction":0},{"upTo":2826.65,"rate":7.5,"deduction":169.44},{"upTo":3751.05,"rate":15.0,"deduction":381.44},{"upTo":4664.68,"rate":22.5,"deduction":662.77},{"upTo":9999999,"rate":27.5,"deduction":896.00}],"employerRatesByRegime":{"simples_nacional":{"employerInssRate":0,"ratRate":0},"mei":{"employerInssRate":0,"ratRate":0},"lucro_presumido":{"employerInssRate":20.0,"ratRate":2.0},"lucro_real":{"employerInssRate":20.0,"ratRate":2.0}},"dueDays":{"salaryDay":5,"fgtsDay":20,"inssDay":20,"benefitsDay":1}}',
    'Tabela global vigente de aliquotas, faixas progressivas, provisoes e vencimentos trabalhistas da CLT.'
  ) ON CONFLICT DO NOTHING;

  -- 3. Arvore de Modulos com Textos de Ajuda sem travessoes
  INSERT INTO public.system_modules (id, parent_id, code, label, route_path, icon_name, help_title, help_text, module_scope, sort_order)
  VALUES
    (v_mod_fin, NULL, 'erp.financeiro', 'Financeiro', NULL, 'Wallet', 'Módulo Financeiro', 'Reúne a visão geral de resultados, receitas, taxas e todas as despesas do estabelecimento.', 'core_erp', 10),
    (v_mod_dash, v_mod_fin, 'erp.dashboard', 'Visão Geral', '/dashboard', 'LayoutDashboard', 'Como usar a Visão Geral', 'Acompanhe aqui o faturamento bruto das vendas, as taxas descontadas, o lucro líquido que já entrou no caixa e a previsão considerando contas pendentes do período.', 'core_erp', 1),
    (v_mod_exp, v_mod_fin, 'erp.despesas', 'Despesas', '/despesas', 'Receipt', 'Como gerenciar Despesas', 'Cadastre contas fixas como aluguel, internet e folha salarial, além de gastos variáveis como reposição de bebidas, insumos e diárias. Você pode dar baixa bancária ou pagar direto com dinheiro de um caixa aberto.', 'core_erp', 2),

    (v_mod_ops, NULL, 'erp.operacao', 'Operação e Vendas', NULL, 'Store', 'Operação Diária', 'Controle de frente de caixa, vendas rápidas no balcão e catálogo de produtos.', 'core_erp', 20),
    (v_mod_pdv, v_mod_ops, 'erp.pdv', 'PDV', '/pdv', 'ShoppingBag', 'Como vender no PDV', 'Selecione o caixa aberto do seu ponto de atendimento, adicione os produtos pedidos pelo cliente e escolha uma ou mais formas de pagamento para concluir a venda na hora.', 'core_erp', 1),
    (v_mod_caixa, v_mod_ops, 'erp.caixa', 'Caixa', '/caixa', 'Vault', 'Como operar os Caixas', 'Abra o turno informando o troco inicial de cada ponto, registre suprimentos ou sangrias ao longo do dia e faça o fechamento conferindo o dinheiro físico na gaveta.', 'core_erp', 2),
    (v_mod_prod, v_mod_ops, 'erp.produtos', 'Produtos', '/produtos', 'Package', 'Catálogo de Produtos', 'Mantenha atualizados os preços de venda, categorias de bar ou restaurante e ative o controle de estoque nos itens que desejar acompanhar.', 'core_erp', 3),

    (v_mod_rh, NULL, 'erp.pessoas', 'Equipe e RH', NULL, 'Users', 'Gestão de Pessoas', 'Administração de colaboradores contratados pela CLT e prestadores diaristas.', 'core_erp', 30),
    (v_mod_func, v_mod_rh, 'erp.funcionarios', 'Funcionários', '/funcionarios', 'UserCheck', 'Gestão de Funcionários CLT e Diaristas', 'Cadastre funcionários CLT visualizando automaticamente todos os encargos e reservas contábeis parametrizados, ou registre pagamentos rápidos de diaristas como despesa variável.', 'core_erp', 1),

    (v_mod_admin, NULL, 'platform.admin', 'Administração', '/admin', 'ShieldCheck', 'Governança e Parâmetros', 'Gerencie empresas clientes, configure a árvore de menus e textos de ajuda, monte perfis de acesso e ajuste os parâmetros tributários globais do sistema.', 'super_admin', 90)
  ON CONFLICT (id) DO NOTHING;

  -- 4. Habilitar todos os modulos core_erp para o Balneario Aguas Claras
  INSERT INTO public.establishment_modules (establishment_id, module_id)
  SELECT v_est_id, id FROM public.system_modules WHERE module_scope = 'core_erp'
  ON CONFLICT DO NOTHING;

  -- 5. Criar usuarios no Supabase Auth local (superadmin, dono e operador de caixa)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES
    (v_super_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'superadmin@palhetasoft.com', crypt('palheta123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Super Admin Palheta"}', now(), now()),
    (v_owner_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@aguasclaras.com', crypt('palheta123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Gestor Águas Claras"}', now(), now()),
    (v_cashier_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'caixa@aguasclaras.com', crypt('palheta123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Operador Caixa Bar"}', now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES
    (gen_random_uuid(), v_super_id, jsonb_build_object('sub', v_super_id::text, 'email', 'superadmin@palhetasoft.com'), 'email', v_super_id::text, now(), now(), now()),
    (gen_random_uuid(), v_owner_id, jsonb_build_object('sub', v_owner_id::text, 'email', 'admin@aguasclaras.com'), 'email', v_owner_id::text, now(), now(), now()),
    (gen_random_uuid(), v_cashier_id, jsonb_build_object('sub', v_cashier_id::text, 'email', 'caixa@aguasclaras.com'), 'email', v_cashier_id::text, now(), now(), now())
  ON CONFLICT DO NOTHING;

  INSERT INTO public.app_users (id, establishment_id, full_name, email, is_super_admin, is_active)
  VALUES
    (v_super_id, NULL, 'Super Admin Palheta', 'superadmin@palhetasoft.com', true, true),
    (v_owner_id, v_est_id, 'Gestor Águas Claras', 'admin@aguasclaras.com', false, true),
    (v_cashier_id, v_est_id, 'Operador Caixa Bar', 'caixa@aguasclaras.com', false, true)
  ON CONFLICT (id) DO NOTHING;

  -- 6. Perfis de Acesso e Heranca Pai/Filho
  INSERT INTO public.access_profiles (id, establishment_id, name, description, can_cancel_sales, is_system)
  VALUES
    (v_prof_owner, v_est_id, 'Diretoria e Gestão', 'Acesso completo a todos os módulos operacionais, financeiros e de equipe.', true, true),
    (v_prof_cashier, v_est_id, 'Atendimento de Caixa e PDV', 'Acesso exclusivo ao PDV e abertura ou fechamento de caixa.', false, true)
  ON CONFLICT (id) DO NOTHING;

  -- Diretoria recebe os 3 modulos-pai (herda todos os filhos automaticamente)
  INSERT INTO public.profile_modules (profile_id, module_id)
  VALUES
    (v_prof_owner, v_mod_fin),
    (v_prof_owner, v_mod_ops),
    (v_prof_owner, v_mod_rh),
    -- Caixa recebe apenas os filhos PDV e Caixa
    (v_prof_cashier, v_mod_pdv),
    (v_prof_cashier, v_mod_caixa)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_profiles (user_id, profile_id)
  VALUES
    (v_owner_id, v_prof_owner),
    (v_cashier_id, v_prof_cashier)
  ON CONFLICT DO NOTHING;

  -- 7. Meios de Pagamento, Pontos de Caixa, Categorias e Produtos Iniciais
  INSERT INTO public.payment_method_configs (establishment_id, code, label, settlement_mode, fee_percent, fixed_fee_amount, is_active)
  VALUES
    (v_est_id, 'cash', 'Dinheiro em Espécie', 'manual_pos', 0, 0, true),
    (v_est_id, 'pix', 'PIX', 'manual_pos', 0, 0, true),
    (v_est_id, 'debit_card', 'Cartão de Débito', 'manual_pos', 1.39, 0, true),
    (v_est_id, 'credit_card', 'Cartão de Crédito', 'manual_pos', 3.19, 0, true),
    (v_est_id, 'customer_credit', 'Crédito Pré-Pago do Cliente', 'manual_pos', 0, 0, false)
  ON CONFLICT (establishment_id, code) DO NOTHING;

  INSERT INTO public.register_points (establishment_id, name, location_note)
  VALUES
    (v_est_id, 'Caixa Bar da Piscina', 'Quiosque central próximo às piscinas naturais'),
    (v_est_id, 'Caixa Restaurante', 'Salão principal de refeições')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.financial_categories (establishment_id, name, type, color_token, is_system)
  VALUES
    (v_est_id, 'Vendas de Alimentos e Bebidas', 'income', 'accent-green', true),
    (v_est_id, 'Folha Salarial e Encargos CLT', 'expense_fixed', 'accent-purple', true),
    (v_est_id, 'Energia, Internet e Estrutura Fixa', 'expense_fixed', 'accent-sky', true),
    (v_est_id, 'Reposição de Bebidas e Cozinha', 'expense_variable', 'accent-orange', true),
    (v_est_id, 'Diaristas e Equipe Extra', 'expense_variable', 'accent-pink', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.products (establishment_id, name, sku, category, unit_price, cost_price, track_stock, stock_quantity, min_stock_alert)
  VALUES
    (v_est_id, 'Água de Coco Gelada', 'BAR-001', 'bar', 8.00, 3.50, true, 120, 20),
    (v_est_id, 'Cerveja Lata 350ml', 'BAR-002', 'bar', 7.50, 3.90, true, 240, 48),
    (v_est_id, 'Porção de Peixe Frito Regional', 'REST-001', 'restaurante', 68.00, 26.00, false, 0, 0),
    (v_est_id, 'Almoço Executivo Completo', 'REST-002', 'restaurante', 42.00, 15.00, false, 0, 0)
  ON CONFLICT DO NOTHING;
END $$;
