import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  isRouteAllowed,
  parseNavigationSession,
  serializeNavigationSession,
} from '@/modules/auth/session-nav';
import type { NavigationNode, SessionNavSnapshot } from '@/modules/auth/types';
import { prepareSplitSalePayload } from '@/modules/pdv/payment-processor';
import {
  resolveParametroValue,
  validateCltParametroJson,
} from '@/modules/parametros/service';

function makeLargeTree(): NavigationNode[] {
  return Array.from({ length: 4 }, (_, gIdx) => ({
    id: `grp-${gIdx}`,
    parentId: null,
    code: `erp.group_${gIdx}`,
    label: `Grupo Operacional ${gIdx}`,
    routePath: null,
    iconName: 'Folder',
    helpTitle: 'Título extenso de ajuda contextual para testar limite de cookie',
    helpText:
      'Explicação detalhada com bastante texto didático para garantir que o cookie de sessão permaneça compacto e abaixo de quatro mil bytes em todos os navegadores.',
    moduleScope: 'core_erp' as const,
    sortOrder: gIdx * 10,
    children: Array.from({ length: 3 }, (__, cIdx) => ({
      id: `mod-${gIdx}-${cIdx}`,
      parentId: `grp-${gIdx}`,
      code: `erp.mod_${gIdx}_${cIdx}`,
      label: `Módulo Completo ${gIdx}.${cIdx}`,
      routePath: `/modulo-${gIdx}-${cIdx}`,
      iconName: 'LayoutDashboard',
      helpTitle: 'Como operar este módulo específico no dia a dia',
      helpText:
        'Texto longo explicando passo a passo como registrar operações, conferir saldos e manter a contabilidade organizada sem estourar o cookie.',
      moduleScope: 'core_erp' as const,
      sortOrder: cIdx,
      children: [],
    })),
  }));
}

describe('Final Review Security, Cookie Size, Redirect & Accounting Fixes', () => {
  it('keeps signed palheta_nav_session well under 4096 bytes for 16 modules and rejects tampered cookies', () => {
    const snapshot: SessionNavSnapshot = {
      userId: '00000000-0000-4000-8000-000000000001',
      fullName: 'Super Admin Palheta',
      email: 'superadmin@palhetasoft.com',
      isSuperAdmin: false,
      canCancelSales: false,
      activeEstablishmentId: '11111111-1111-4111-8111-111111111111',
      activeEstablishmentName: 'Balneário Águas Claras',
      tree: makeLargeTree(),
      allowedPaths: ['/dashboard', '/pdv'],
      generatedAt: '2026-11-17T20:00:00Z',
    };

    const cookieVal = serializeNavigationSession(snapshot);
    expect(Buffer.byteLength(cookieVal, 'utf8')).toBeLessThan(3500);

    const parsed = parseNavigationSession(cookieVal);
    expect(parsed).not.toBeNull();
    expect(parsed?.isSuperAdmin).toBe(false);

    // Tampering with signature or payload must return null
    const [payloadPart] = cookieVal.split('.');
    const forgedToken = `${payloadPart}.forgedsignature123`;
    expect(parseNavigationSession(forgedToken)).toBeNull();

    // Plain unsigned base64url JSON must also be rejected
    const unsignedRaw = Buffer.from(
      JSON.stringify({ ...snapshot, isSuperAdmin: true }),
      'utf8'
    ).toString('base64url');
    expect(parseNavigationSession(unsignedRaw)).toBeNull();
  });

  it('prevents infinite redirect loops for zero-profile users and calls redirect outside try/catch in signInAction', () => {
    const emptyUserSnap: SessionNavSnapshot = {
      userId: 'u-empty',
      fullName: 'Sem Perfil',
      email: 'novo@empresa.com',
      isSuperAdmin: false,
      canCancelSales: false,
      activeEstablishmentId: 'est-1',
      activeEstablishmentName: 'Empresa',
      tree: [],
      allowedPaths: [],
      generatedAt: '2026-11-17T20:00:00Z',
    };

    expect(isRouteAllowed(emptyUserSnap, '/sem-acesso')).toBe(true);

    const authActionsSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/modules/auth/actions.ts'),
      'utf8'
    );
    // Ensure redirect(firstRoute) is NOT trapped inside try { ... } catch
    expect(authActionsSrc).toContain('let firstRoute =');
    expect(authActionsSrc).toMatch(/\}\s*redirect\(firstRoute\)/);
  });

  it('enforces RLS anti-escalation, auth.uid() binding in RPCs, and strict PDV item/split checks', () => {
    const mig1 = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/20261117000001_platform_rbac_and_params.sql'),
      'utf8'
    );
    const mig2 = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/20261117000002_erp_core_and_rpcs.sql'),
      'utf8'
    );

    expect(mig1).toContain('CREATE OR REPLACE FUNCTION public.can_manage_establishment');
    expect(mig1).toContain('is_super_admin = false');
    expect(mig2).toContain('v_caller_id uuid := auth.uid()');
    expect(mig2).toContain('jsonb_array_length(p_items) = 0');
    expect(mig2).toContain("AT TIME ZONE 'America/Sao_Paulo'");

    expect(() =>
      prepareSplitSalePayload(
        [{ product_id: 'p1', product_name: 'Água', quantity: 1, unit_price: 8 }],
        0,
        [
          { payment_method: 'pix', gross_amount: 8 },
          { payment_method: 'cash', gross_amount: 0 },
        ],
        []
      )
    ).toThrow(/valor maior que zero/i);
  });

  it('rejects malformed CLT JSON in parametros_web and returns null instead of unparsed strings for objects', () => {
    const badRows = [
      {
        id: '1',
        establishment_id: null,
        chave_parametro: 'clt_tributos_vigentes',
        valor_parametro: '{json_quebrado',
        descricao: null,
      },
    ];

    expect(
      resolveParametroValue<Record<string, unknown>>(badRows, 'clt_tributos_vigentes', null, true)
    ).toBeNull();
    expect(validateCltParametroJson('{json_quebrado').valid).toBe(false);
  });

  it('guards admin actions, seeds default payment methods for new establishments, and uses get_financial_dashboard RPC', () => {
    const adminActions = fs.readFileSync(
      path.resolve(process.cwd(), 'src/modules/admin/actions.ts'),
      'utf8'
    );
    const dashQueries = fs.readFileSync(
      path.resolve(process.cwd(), 'src/modules/dashboard/queries.ts'),
      'utf8'
    );

    expect(adminActions).toContain("from('payment_method_configs').insert");
    expect(adminActions).toContain('assertAdminOrManagerAccess');
    expect(dashQueries).toContain("rpc('get_financial_dashboard'");
  });
});
