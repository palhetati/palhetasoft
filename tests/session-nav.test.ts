import { describe, expect, it } from 'vitest';
import {
  extractAllowedPaths,
  findModuleHelpByPath,
  isRouteAllowed,
  parseNavigationSession,
  serializeNavigationSession,
} from '@/modules/auth/session-nav';
import type { NavigationNode, SessionNavSnapshot } from '@/modules/auth/types';

const SAMPLE_TREE: NavigationNode[] = [
  {
    id: 'm1',
    parentId: null,
    code: 'erp.operacao',
    label: 'Operação',
    routePath: null,
    iconName: 'Store',
    helpTitle: 'Operação Diária',
    helpText: 'Controle de vendas e caixas.',
    moduleScope: 'core_erp',
    sortOrder: 10,
    children: [
      {
        id: 'm2',
        parentId: 'm1',
        code: 'erp.pdv',
        label: 'PDV',
        routePath: '/pdv',
        iconName: 'ShoppingBag',
        helpTitle: 'Como vender no PDV',
        helpText: 'Selecione o caixa aberto e adicione produtos.',
        moduleScope: 'core_erp',
        sortOrder: 1,
        children: [],
      },
    ],
  },
];

describe('Session Navigation Cache & Route Guard', () => {
  it('serializes and parses session snapshot cleanly while preserving immutability until logout', () => {
    const snapshot: SessionNavSnapshot = {
      userId: 'user-1',
      fullName: 'Operador Bar',
      email: 'caixa@aguasclaras.com',
      isSuperAdmin: false,
      canCancelSales: false,
      activeEstablishmentId: 'est-1',
      activeEstablishmentName: 'Balneário Águas Claras',
      tree: SAMPLE_TREE,
      allowedPaths: extractAllowedPaths(SAMPLE_TREE),
      generatedAt: '2026-11-17T19:00:00Z',
    };

    const encoded = serializeNavigationSession(snapshot);
    const decoded = parseNavigationSession(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded?.allowedPaths).toEqual(['/pdv']);
    expect(isRouteAllowed(decoded!, '/pdv')).toBe(true);
    expect(isRouteAllowed(decoded!, '/despesas')).toBe(false);
    expect(isRouteAllowed(decoded!, '/admin')).toBe(false);
  });

  it('grants unrestricted route access to Super-Admin and resolves module contextual help by path', () => {
    const superSnap: SessionNavSnapshot = {
      userId: 'super-1',
      fullName: 'Super Admin',
      email: 'superadmin@palhetasoft.com',
      isSuperAdmin: true,
      canCancelSales: true,
      activeEstablishmentId: 'est-1',
      activeEstablishmentName: 'Balneário Águas Claras',
      tree: SAMPLE_TREE,
      allowedPaths: ['/pdv'],
      generatedAt: '2026-11-17T19:00:00Z',
    };

    expect(isRouteAllowed(superSnap, '/admin')).toBe(true);
    expect(isRouteAllowed(superSnap, '/despesas')).toBe(true);

    const help = findModuleHelpByPath(SAMPLE_TREE, '/pdv');
    expect(help).toEqual({
      label: 'PDV',
      helpTitle: 'Como vender no PDV',
      helpText: 'Selecione o caixa aberto e adicione produtos.',
    });
  });
});
