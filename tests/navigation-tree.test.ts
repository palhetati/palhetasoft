import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildNavigationTree } from '@/modules/auth/navigation-tree';
import type { SystemModuleRow } from '@/modules/auth/types';

const SAMPLE_MODULES: SystemModuleRow[] = [
  {
    id: 'mod-fin',
    parent_id: null,
    code: 'erp.financeiro',
    label: 'Financeiro',
    route_path: null,
    icon_name: 'Wallet',
    help_title: 'Gestão Financeira',
    help_text: 'Acompanhe o fluxo financeiro da empresa com clareza.',
    module_scope: 'core_erp',
    sort_order: 20,
    is_active: true,
  },
  {
    id: 'mod-dash',
    parent_id: 'mod-fin',
    code: 'erp.dashboard',
    label: 'Visão Geral',
    route_path: '/dashboard',
    icon_name: 'LayoutDashboard',
    help_title: 'Painel Financeiro',
    help_text: 'Consulte o faturamento bruto, as despesas pagas, as contas pendentes e o lucro líquido.',
    module_scope: 'core_erp',
    sort_order: 1,
    is_active: true,
  },
  {
    id: 'mod-exp',
    parent_id: 'mod-fin',
    code: 'erp.despesas',
    label: 'Despesas',
    route_path: '/despesas',
    icon_name: 'Receipt',
    help_title: 'Controle de Despesas',
    help_text: 'Cadastre e dê baixa nas despesas fixas e variáveis do estabelecimento.',
    module_scope: 'core_erp',
    sort_order: 2,
    is_active: true,
  },
  {
    id: 'mod-ops',
    parent_id: null,
    code: 'erp.operacao',
    label: 'Operação',
    route_path: null,
    icon_name: 'Store',
    help_title: 'Operação Diária',
    help_text: 'Módulos de atendimento, frente de caixa e catálogo.',
    module_scope: 'core_erp',
    sort_order: 10,
    is_active: true,
  },
  {
    id: 'mod-pdv',
    parent_id: 'mod-ops',
    code: 'erp.pdv',
    label: 'PDV',
    route_path: '/pdv',
    icon_name: 'ShoppingBag',
    help_title: 'Ponto de Venda',
    help_text: 'Registre vendas rápidas com pagamento único ou dividido.',
    module_scope: 'core_erp',
    sort_order: 1,
    is_active: true,
  },
  {
    id: 'mod-caixa',
    parent_id: 'mod-ops',
    code: 'erp.caixa',
    label: 'Caixa',
    route_path: '/caixa',
    icon_name: 'Vault',
    help_title: 'Controle de Caixa',
    help_text: 'Abra e feche turnos por ponto de venda conferindo a gaveta física.',
    module_scope: 'core_erp',
    sort_order: 2,
    is_active: true,
  },
  {
    id: 'mod-admin',
    parent_id: null,
    code: 'platform.admin',
    label: 'Administração',
    route_path: '/admin',
    icon_name: 'ShieldCheck',
    help_title: 'Administração da Plataforma',
    help_text: 'Gerencie empresas, árvore de menus, perfis de acesso e parâmetros globais.',
    module_scope: 'super_admin',
    sort_order: 99,
    is_active: true,
  },
];

describe('Dynamic Module Tree & Migration 001 Invariants', () => {
  it('inherits all active children when a parent module is granted, pulls parent wrapper when only a child is granted, and deduplicates overlapping profiles', () => {
    const enabledForTenant = ['mod-fin', 'mod-dash', 'mod-exp', 'mod-ops', 'mod-pdv', 'mod-caixa'];
    // Profile A grants parent 'mod-fin' + child 'mod-dash'; Profile B grants child 'mod-pdv'
    const grantedUnion = ['mod-fin', 'mod-dash', 'mod-pdv'];

    const tree = buildNavigationTree(SAMPLE_MODULES, grantedUnion, enabledForTenant, false);

    // Sorted by sort_order: Operação (10) first, Financeiro (20) second, no super_admin
    expect(tree.map((n) => n.code)).toEqual(['erp.operacao', 'erp.financeiro']);

    // Operação includes ONLY 'erp.pdv', NOT sibling 'erp.caixa'
    expect(tree[0].children.map((c) => c.code)).toEqual(['erp.pdv']);

    // Financeiro inherits BOTH 'erp.dashboard' and 'erp.despesas' without duplicates
    expect(tree[1].children.map((c) => c.code)).toEqual(['erp.dashboard', 'erp.despesas']);
  });

  it('grants full access including super_admin modules when isSuperAdmin is true', () => {
    const tree = buildNavigationTree(SAMPLE_MODULES, [], [], true);
    expect(tree.map((n) => n.code)).toEqual(['erp.operacao', 'erp.financeiro', 'platform.admin']);
    expect(tree[0].children).toHaveLength(2);
    expect(tree[1].children).toHaveLength(2);
  });

  it('defines Migration 001 with parametros_web, dash-free help_text check, RLS, and resolve_user_navigation RPC', () => {
    const sqlPath = path.resolve(
      process.cwd(),
      'supabase/migrations/20261117000001_platform_rbac_and_params.sql'
    );
    const sql = fs.readFileSync(sqlPath, 'utf8');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.parametros_web');
    expect(sql).toContain('chave_parametro text NOT NULL');
    expect(sql).toContain('valor_parametro text NOT NULL');
    expect(sql).toContain('help_text text NOT NULL');
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.resolve_user_navigation');
  });
});
