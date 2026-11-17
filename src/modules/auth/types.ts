export type ModuleScope = 'super_admin' | 'core_erp' | 'balneario';

export interface SystemModuleRow {
  id: string;
  parent_id: string | null;
  code: string;
  label: string;
  route_path: string | null;
  icon_name: string;
  help_title: string;
  help_text: string;
  module_scope: ModuleScope;
  sort_order: number;
  is_active: boolean;
}

export interface NavigationNode {
  id: string;
  parentId: string | null;
  code: string;
  label: string;
  routePath: string | null;
  iconName: string;
  helpTitle: string;
  helpText: string;
  moduleScope: ModuleScope;
  sortOrder: number;
  children: NavigationNode[];
}

export interface SessionNavSnapshot {
  userId: string;
  fullName: string;
  email: string;
  isSuperAdmin: boolean;
  canCancelSales: boolean;
  activeEstablishmentId: string | null;
  activeEstablishmentName: string | null;
  tree: NavigationNode[];
  allowedPaths: string[];
  generatedAt: string;
}
