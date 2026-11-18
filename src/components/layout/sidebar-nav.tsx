'use client';

import React, { useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, LogOut } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import type { NavigationNode, SessionNavSnapshot } from '@/modules/auth/types';
import { signOutAction } from '@/modules/auth/actions';
import { DynamicIcon } from './icon-resolver';
import { TenantSwitcher } from './tenant-switcher';

function SignOutSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="utility" fullWidth loading={pending} loadingText="Saindo...">
      <LogOut className="h-4 w-4" />
      Sair da conta
    </Button>
  );
}

export interface SidebarNavProps {
  session: SessionNavSnapshot;
  establishments: Array<{ id: string; name: string }>;
  onNavigate?: () => void;
}

function NavTreeBranch({
  node,
  pathname,
  onNavigate,
}: {
  node: NavigationNode;
  pathname: string;
  onNavigate?: () => void;
}) {
  const hasChildren = node.children.length > 0;
  const isChildActive = node.children.some(
    (c) => c.routePath && (pathname === c.routePath || pathname.startsWith(`${c.routePath}/`))
  );
  const [expanded, setExpanded] = useState(true || isChildActive);

  if (!hasChildren && node.routePath) {
    const active = pathname === node.routePath || pathname.startsWith(`${node.routePath}/`);
    return (
      <Link
        href={node.routePath}
        onClick={onNavigate}
        className={`flex min-h-[40px] items-center gap-3 rounded-sm px-3 py-2 typo-body-sm transition-all duration-200 ease-out ${
          active
            ? 'bg-canvas-soft font-semibold text-primary border-l-2 border-primary'
            : 'text-ink-secondary hover:bg-canvas-soft hover:translate-x-0.5'
        }`}
      >
        <DynamicIcon name={node.iconName} className="h-4 w-4 shrink-0" />
        <span className="truncate">{node.label}</span>
      </Link>
    );
  }

  return (
    <div className="space-y-1">
      <Button
        variant="utility"
        fullWidth
        onClick={() => setExpanded((prev) => !prev)}
        className="!justify-between !border-0 !bg-transparent !px-3 !py-2 !min-h-[38px] hover:!bg-canvas-soft"
      >
        <span className="flex items-center gap-2.5 typo-eyebrow uppercase text-ink-muted">
          <DynamicIcon name={node.iconName} className="h-3.5 w-3.5" />
          {node.label}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-ink-faint transition-transform duration-200 ease-out ${expanded ? 'rotate-180' : ''}`}
        />
      </Button>
      <div
        className={`ml-3 overflow-hidden border-l border-hairline pl-2 transition-all duration-200 ease-out ${
          expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="space-y-0.5 py-0.5">
          {node.children.map((child) => (
            <NavTreeBranch
              key={child.id}
              node={child}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SidebarNav({ session, establishments, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col justify-between bg-surface p-4">
      <div className="space-y-5 overflow-y-auto">
        <div className="flex items-center justify-between px-2 pt-1">
          <div>
            <span className="typo-title font-bold text-ink">Palheta Soft</span>
            {session.activeEstablishmentName && (
              <p className="typo-caption truncate text-ink-muted">
                {session.activeEstablishmentName}
              </p>
            )}
          </div>
          {session.isSuperAdmin && <Badge sticker="purple">Super</Badge>}
        </div>

        {session.isSuperAdmin && (
          <TenantSwitcher
            establishments={establishments}
            activeEstablishmentId={session.activeEstablishmentId}
          />
        )}

        <nav className="space-y-2" aria-label="Menu principal">
          {session.tree.map((node) => (
            <NavTreeBranch
              key={node.id}
              node={node}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      </div>

      <div className="mt-6 border-t border-hairline pt-4">
        <div className="mb-3 px-2">
          <p className="typo-body-sm font-medium text-ink truncate">{session.fullName}</p>
          <p className="typo-caption text-ink-faint truncate">{session.email}</p>
        </div>
        <form action={signOutAction}>
          <SignOutSubmitButton />
        </form>
      </div>
    </div>
  );
}
