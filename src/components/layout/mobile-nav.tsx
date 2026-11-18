'use client';

import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui';
import type { SessionNavSnapshot } from '@/modules/auth/types';
import { SidebarNav } from './sidebar-nav';

export interface MobileNavProps {
  session: SessionNavSnapshot;
  establishments: Array<{ id: string; name: string }>;
}

export function MobileNav({ session, establishments }: MobileNavProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-hairline bg-surface px-4 py-2.5 lg:hidden">
        <div>
          <span className="typo-title font-bold text-ink">Palheta Soft</span>
          {session.activeEstablishmentName && (
            <p className="typo-caption text-ink-muted">{session.activeEstablishmentName}</p>
          )}
        </div>
        <Button
          variant="utility"
          aria-label="Abrir menu de navegação"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu className="h-5 w-5" />
          Menu
        </Button>
      </header>

      <div
        className={`fixed inset-0 z-50 flex transition-opacity duration-200 ease-out lg:hidden ${
          drawerOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!drawerOpen}
      >
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[1px] transition-opacity duration-200 ease-out"
          onClick={() => setDrawerOpen(false)}
        />
        <div
          className={`relative z-10 flex h-full w-80 max-w-[85vw] flex-col border-r border-hairline bg-surface shadow-elevated transition-transform duration-200 ease-out ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex justify-end border-b border-hairline p-2">
            <Button
              variant="icon-circular"
              aria-label="Fechar menu"
              onClick={() => setDrawerOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <SidebarNav
              session={session}
              establishments={establishments}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
