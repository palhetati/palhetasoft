import React from 'react';
import {
  Folder,
  LayoutDashboard,
  Package,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserCheck,
  Users,
  Vault,
  Wallet,
  Waves,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Folder,
  LayoutDashboard,
  Package,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserCheck,
  Users,
  Vault,
  Wallet,
  Waves,
};

export function DynamicIcon({ name, className = 'h-4 w-4' }: { name: string; className?: string }) {
  const IconComp = ICON_MAP[name] ?? Folder;
  return <IconComp className={className} />;
}
