'use client';

import React, { useState, useTransition } from 'react';
import { Alert, Badge, Button, Card, Input, PageHeader } from '@/components/ui';
import { signInAction } from '@/modules/auth/actions';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas-soft px-4 py-8">
      <Card variant="flat" className="flex w-full max-w-md flex-col gap-5">
        <PageHeader
          title="Palheta Soft"
          subtitle="Entre com seu e-mail e senha para acessar o estabelecimento."
          helpTitle="Como entrar no sistema"
          helpText="Use o e-mail e a senha entregues pelo gestor do estabelecimento. Se esqueceu a senha, peça uma nova à administração."
          actions={<Badge sticker="primary">Gestão empresarial</Badge>}
        />

        <Card variant="soft" title="Acesso da conta">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              const formData = new FormData(e.currentTarget);
              startTransition(async () => {
                const res = await signInAction(formData);
                if (res?.error) {
                  setError(res.error);
                }
              });
            }}
          >
            {error && (
              <Alert tone="warning" title="Não foi possível entrar">
                {error}
              </Alert>
            )}

            <Input
              name="email"
              type="email"
              label="E-mail"
              placeholder="nome@empresa.com"
              required
              autoComplete="email"
            />

            <Input
              name="password"
              type="password"
              label="Senha"
              placeholder="Digite sua senha"
              required
              autoComplete="current-password"
            />

            <div className="pt-1">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={isPending}
                loadingText="Entrando..."
              >
                Entrar no sistema
              </Button>
            </div>
          </form>
        </Card>

        <p className="typo-caption text-center text-ink-muted">
          O cadastro de empresas e contas é feito pela administração. Fale com o responsável do seu estabelecimento se precisar de acesso.
        </p>
      </Card>
    </div>
  );
}
