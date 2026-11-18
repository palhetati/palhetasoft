import React from 'react';
import { getCurrentErpContext } from '@/modules/auth/actions';
import { EmployeesClient } from './employees-client';

export default async function EmployeesPage() {
  const { session, moduleHelp } = await getCurrentErpContext('/funcionarios');

  return (
    <EmployeesClient
      establishmentId={session.activeEstablishmentId}
      title={moduleHelp?.label ?? 'Funcionários CLT e Diaristas'}
      helpTitle={moduleHelp?.helpTitle ?? 'Gestão de Funcionários CLT e Diaristas'}
      helpText={
        moduleHelp?.helpText ??
        'Cadastre funcionários CLT visualizando automaticamente todos os encargos e reservas contábeis parametrizados, ou registre pagamentos rápidos de diaristas como despesa variável.'
      }
    />
  );
}
