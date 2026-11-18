import React from 'react';
import { Alert, Card, PageHeader } from '@/components/ui';

export default function SemAcessoPage() {
  return (
    <Card variant="flat" className="flex flex-col gap-5">
      <PageHeader
        title="Acesso Pendente"
        helpTitle="Por que estou vendo esta tela"
        helpText="Sua conta foi autenticada com sucesso, porém ainda não há nenhum módulo liberado para o seu perfil. Solicite ao gestor a liberação das suas telas."
      />
      <Alert tone="info" title="Nenhum menu liberado ainda">
        Peça ao gestor do estabelecimento para atribuir um perfil à sua conta e entre novamente no sistema.
      </Alert>
    </Card>
  );
}
