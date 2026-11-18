import React from 'react';
import { Alert, PageHeader } from '@/components/ui';

export default function SemAcessoPage() {
  return (
    <div>
      <PageHeader
        title="Acesso Pendente"
        helpTitle="Por que estou vendo esta tela"
        helpText="Sua conta foi autenticada com sucesso, porém ainda não há nenhum módulo ou perfil liberado para o seu usuário. Solicite ao administrador do estabelecimento a vinculação do seu perfil."
      />
      <Alert tone="info" title="Nenhum módulo atribuído ao seu perfil">
        Peça ao gestor da sua empresa para vincular um perfil de acesso à sua conta e depois saia e entre novamente no sistema.
      </Alert>
    </div>
  );
}
