import React from 'react';
import type { SessionNavSnapshot } from '@/modules/auth/types';
import { SidebarNav } from './sidebar-nav';
import { MobileNav } from './mobile-nav';

export interface AppShellProps {
  session: SessionNavSnapshot;
  establishments: Array<{ id: string; name: string }>;
  children: React.ReactNode;
}

export function AppShell({ session, establishments, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-canvas-soft lg:flex">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:block lg:w-72 lg:border-r lg:border-hairline lg:bg-surface">
        <SidebarNav session={session} establishments={establishments} />
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:pl-72">
        <MobileNav session={session} establishments={establishments} />
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
