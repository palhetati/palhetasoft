'use client';

import React, { useState, useTransition } from 'react';
import { CircleHelp } from 'lucide-react';
import { Alert, Badge, Button, Card, Input, Tooltip } from '@/components/ui';
import { signInAction } from '@/modules/auth/actions';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas-soft px-4 py-8">
      <Card variant="elevated" className="flex w-full max-w-md flex-col gap-5 rounded-xl p-6 sm:p-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Badge sticker="primary">Gestão Empresarial</Badge>
            <Tooltip content="Ver explicação desta tela">
              <Button
                variant="icon-circular"
                aria-label="Ajuda: Acesso ao Sistema"
                aria-expanded={helpOpen}
                onClick={() => setHelpOpen((prev) => !prev)}
                className="!min-h-[36px] !min-w-[36px] !p-1.5"
              >
                <CircleHelp className="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="typo-heading-1 text-ink">Palheta Soft</h1>
            <p className="typo-body-sm text-ink-muted">
              Entre com seu e-mail e senha para acessar o estabelecimento.
            </p>
          </div>

          <div
            className={`overflow-hidden transition-all duration-200 ease-out ${
              helpOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <Card variant="soft" className="!p-3.5">
              <p className="typo-eyebrow uppercase text-primary">Como entrar no sistema</p>
              <p className="typo-body-sm mt-1 text-ink-secondary">
                Utilize o e-mail e a senha fornecidos pelo gestor do seu estabelecimento. Caso tenha esquecido sua senha, solicite a redefinição à administração.
              </p>
            </Card>
          </div>
        </div>

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

          <div className="pt-1">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={isPending}
              loadingText="Carregando..."
            >
              Entrar no sistema
            </Button>
          </div>
        </form>

        <p className="typo-caption border-t border-hairline pt-4 text-center text-ink-muted">
          O cadastro de empresas e contas é gerenciado pela administração. Solicite seu acesso ao responsável.
        </p>
      </Card>
    </div>
  );
}
