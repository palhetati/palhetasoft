import type { NavigationNode, SystemModuleRow } from './types';

export function buildNavigationTree(
  modules: SystemModuleRow[],
  grantedModuleIds: string[],
  enabledModuleIds: string[],
  isSuperAdmin: boolean
): NavigationNode[] {
  const activeModules = modules.filter((m) => m.is_active);
  const byId = new Map<string, SystemModuleRow>(activeModules.map((m) => [m.id, m]));
  const childrenByParent = new Map<string | null, SystemModuleRow[]>();

  for (const mod of activeModules) {
    const list = childrenByParent.get(mod.parent_id) ?? [];
    list.push(mod);
    childrenByParent.set(mod.parent_id, list);
  }

  const includedIds = new Set<string>();

  if (isSuperAdmin) {
    for (const mod of activeModules) {
      if (enabledModuleIds.length === 0 || mod.module_scope === 'super_admin' || enabledModuleIds.includes(mod.id)) {
        includedIds.add(mod.id);
      }
    }
    // Ensure ancestors of included nodes are also included
    for (const id of Array.from(includedIds)) {
      let current = byId.get(id);
      while (current?.parent_id) {
        const parent = byId.get(current.parent_id);
        if (!parent) break;
        includedIds.add(parent.id);
        current = parent;
      }
    }
  } else {
    const enabledSet = new Set(enabledModuleIds);
    const expandedGrants = new Set<string>();

    const collectDescendants = (moduleId: string) => {
      const mod = byId.get(moduleId);
      if (!mod || mod.module_scope === 'super_admin') return;
      expandedGrants.add(mod.id);
      const kids = childrenByParent.get(mod.id) ?? [];
      for (const kid of kids) {
        collectDescendants(kid.id);
      }
    };

    for (const grantId of grantedModuleIds) {
      collectDescendants(grantId);
    }

    for (const id of expandedGrants) {
      const mod = byId.get(id);
      if (!mod) continue;
      if (enabledSet.has(id)) {
        includedIds.add(id);
        // Pull up ancestors purely as grouping wrappers
        let curParentId = mod.parent_id;
        while (curParentId) {
          const parent = byId.get(curParentId);
          if (!parent) break;
          includedIds.add(parent.id);
          curParentId = parent.parent_id;
        }
      }
    }
  }

  const buildSubtree = (parentId: string | null): NavigationNode[] => {
    const siblings = (childrenByParent.get(parentId) ?? [])
      .filter((m) => includedIds.has(m.id))
      .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label));

    return siblings
      .map((m) => {
        const children = buildSubtree(m.id);
        return {
          id: m.id,
          parentId: m.parent_id,
          code: m.code,
          label: m.label,
          routePath: m.route_path,
          iconName: m.icon_name,
          helpTitle: m.help_title,
          helpText: m.help_text,
          moduleScope: m.module_scope,
          sortOrder: m.sort_order,
          children,
        };
      })
      .filter((node) => node.routePath !== null || node.children.length > 0);
  };

  return buildSubtree(null);
}

export function flattenNavigationTreeFromRows(
  rows: Array<{
    id: string;
    parent_id: string | null;
    code: string;
    label: string;
    route_path: string | null;
    icon_name: string;
    help_title: string;
    help_text: string;
    module_scope: 'super_admin' | 'core_erp' | 'balneario';
    sort_order: number;
  }>
): NavigationNode[] {
  const byParent = new Map<string | null, typeof rows>();
  for (const r of rows) {
    const list = byParent.get(r.parent_id) ?? [];
    list.push(r);
    byParent.set(r.parent_id, list);
  }

  const walk = (parentId: string | null): NavigationNode[] => {
    const items = (byParent.get(parentId) ?? []).sort(
      (a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label)
    );
    return items.map((m) => ({
      id: m.id,
      parentId: m.parent_id,
      code: m.code,
      label: m.label,
      routePath: m.route_path,
      iconName: m.icon_name,
      helpTitle: m.help_title,
      helpText: m.help_text,
      moduleScope: m.module_scope,
      sortOrder: m.sort_order,
      children: walk(m.id),
    }));
  };

  return walk(null);
}
