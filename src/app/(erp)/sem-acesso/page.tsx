'use client';

import React from 'react';
import { useFormStatus } from 'react-dom';
import { LogOut } from 'lucide-react';
import { Button, Card, PageHeader } from '@/components/ui';
import { signOutAction } from '@/modules/auth/actions';

function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" loading={pending} loadingText="Saindo...">
      <LogOut className="h-4 w-4" />
      Sair desta conta
    </Button>
  );
}

export default function SemAcessoPage() {
  return (
    <Card variant="flat" className="flex flex-col gap-5">
      <PageHeader
        title="Acesso pendente"
        helpTitle="Por que estou vendo esta tela"
        helpText="Sua senha está certa, mas nenhum perfil de menu foi atribuído à sua conta ainda. Peça ao gestor do estabelecimento para liberar seu acesso."
      />
      <Card variant="soft" title="Nenhum menu liberado ainda">
        <div className="flex flex-col gap-4">
          <p className="typo-body-md text-ink-muted">
            Peça ao gestor do estabelecimento para vincular um perfil de acesso à sua conta e entre novamente.
          </p>
          <div>
            <form action={signOutAction}>
              <SignOutButton />
            </form>
          </div>
        </div>
      </Card>
    </Card>
  );
}
