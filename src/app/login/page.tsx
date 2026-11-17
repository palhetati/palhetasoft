'use client';

import React, { useState, useTransition } from 'react';
import { Alert, Badge, Button, Card, Input } from '@/components/ui';
import { signInAction } from '@/modules/auth/actions';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas-soft px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <Badge sticker="primary">ERP Empresarial</Badge>
          <h1 className="typo-heading-1 text-ink">Palheta Soft</h1>
          <p className="typo-body-md text-ink-muted">
            Acesse o sistema de gestão do seu estabelecimento.
          </p>
        </div>

        <Card variant="elevated" className="rounded-xl p-6 sm:p-8">
          <form
            className="space-y-4"
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
              label="E-mail de acesso"
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

            <div className="pt-2">
              <Button type="submit" variant="primary" fullWidth disabled={isPending}>
                {isPending ? 'Autenticando...' : 'Entrar no sistema'}
              </Button>
            </div>
          </form>

          <p className="typo-caption mt-6 border-t border-hairline pt-4 text-center text-ink-muted">
            O cadastro de empresas e usuários é exclusivo da administração. Solicite seu acesso ao gestor.
          </p>
        </Card>
      </div>
    </div>
  );
}
