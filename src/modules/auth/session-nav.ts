import type { NavigationNode, SessionNavSnapshot } from './types';

export const NAV_SESSION_COOKIE = 'palheta_nav_session';

export function extractAllowedPaths(tree: NavigationNode[]): string[] {
  const paths = new Set<string>();

  const walk = (nodes: NavigationNode[]) => {
    for (const node of nodes) {
      if (node.routePath) {
        paths.add(node.routePath);
      }
      if (node.children.length > 0) {
        walk(node.children);
      }
    }
  };

  walk(tree);
  return Array.from(paths);
}

export function serializeNavigationSession(payload: SessionNavSnapshot): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, 'utf8').toString('base64url');
}

export function parseNavigationSession(raw?: string | null): SessionNavSnapshot | null {
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as SessionNavSnapshot;
    if (!parsed || typeof parsed.userId !== 'string' || !Array.isArray(parsed.tree)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isRouteAllowed(snapshot: SessionNavSnapshot, pathname: string): boolean {
  if (snapshot.isSuperAdmin) return true;
  return snapshot.allowedPaths.some(
    (allowed) => pathname === allowed || pathname.startsWith(`${allowed}/`)
  );
}

export function findModuleHelpByPath(
  tree: NavigationNode[],
  pathname: string
): { label: string; helpTitle: string; helpText: string } | null {
  for (const node of tree) {
    if (node.routePath && (pathname === node.routePath || pathname.startsWith(`${node.routePath}/`))) {
      return {
        label: node.label,
        helpTitle: node.helpTitle,
        helpText: node.helpText,
      };
    }
    if (node.children.length > 0) {
      const found = findModuleHelpByPath(node.children, pathname);
      if (found) return found;
    }
  }
  return null;
}
