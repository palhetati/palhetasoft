import React from 'react';
import { getCurrentErpContext } from '@/modules/auth/actions';
import { getBrtDateParts } from '@/modules/dashboard/queries';
import { DashboardClient } from './dashboard-client';

export default async function DashboardPage() {
  const { session, moduleHelp } = await getCurrentErpContext('/dashboard');
  const { todayStr, firstOfMonth, endOfMonth } = getBrtDateParts();

  return (
    <DashboardClient
      establishmentId={session.activeEstablishmentId}
      title={moduleHelp?.label ?? 'Visão Geral Financeira'}
      helpTitle={moduleHelp?.helpTitle ?? 'Como usar a Visão Geral'}
      helpText={
        moduleHelp?.helpText ??
        'Acompanhe aqui o faturamento bruto das vendas, as taxas descontadas, o lucro líquido que já entrou no caixa e a previsão considerando contas pendentes do período.'
      }
      todayStr={todayStr}
      firstOfMonth={firstOfMonth}
      endOfMonth={endOfMonth}
    />
  );
}
