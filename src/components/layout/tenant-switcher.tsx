'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingState, Select } from '@/components/ui';
import { switchSuperAdminTenantAction } from '@/modules/auth/actions';

export interface TenantSwitcherProps {
  establishments: Array<{ id: string; name: string }>;
  activeEstablishmentId: string | null;
}

export function TenantSwitcher({
  establishments,
  activeEstablishmentId,
}: TenantSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (establishments.length === 0) return null;

  return (
    <div className="rounded-md border border-hairline bg-canvas-soft p-3">
      <Select
        label="Empresa ativa (Suporte)"
        disabled={isPending}
        value={activeEstablishmentId ?? establishments[0]?.id ?? ''}
        onChange={(e) => {
          const nextId = e.target.value;
          startTransition(async () => {
            await switchSuperAdminTenantAction(nextId);
            router.refresh();
          });
        }}
        options={establishments.map((est) => ({
          value: est.id,
          label: est.name,
        }))}
      />
      {isPending && (
        <div className="mt-2">
          <LoadingState compact label="Carregando..." />
        </div>
      )}
    </div>
  );
}
