import React from 'react';
import Link from 'next/link';
import {
  Alert,
  Badge,
  Button,
  Card,
  PageHeader,
  ResponsiveDataTable,
} from '@/components/ui';
import { formatBRL, formatDateBR } from '@/lib/formatters';
import { getCurrentErpContext } from '@/modules/auth/actions';
import { fetchDashboardData, getBrtDateParts } from '@/modules/dashboard/queries';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { session, moduleHelp } = await getCurrentErpContext('/dashboard');
  const params = await searchParams;
  const periodo = params.periodo ?? 'mes';

  const { todayStr, firstOfMonth, endOfMonth } = getBrtDateParts();

  const startDate = periodo === 'hoje' ? todayStr : firstOfMonth;
  const endDate = periodo === 'hoje' ? todayStr : endOfMonth;

  if (!session.activeEstablishmentId) {
    return (
      <div>
        <PageHeader
          title="Visão Geral"
          helpTitle="Como usar a Visão Geral"
          helpText="Selecione uma empresa ativa no menu lateral para visualizar os indicadores financeiros."
        />
        <Alert tone="info" title="Nenhuma empresa selecionada">
          Cadastre ou selecione um estabelecimento no menu lateral para visualizar resultados.
        </Alert>
      </div>
    );
  }

  const { summary, openRegistersCount, recentSales } = await fetchDashboardData(
    session.activeEstablishmentId,
    startDate,
    endDate
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={moduleHelp?.label ?? 'Visão Geral Financeira'}
        subtitle={`Período analisado: ${formatDateBR(startDate)} até ${formatDateBR(endDate)}`}
        helpTitle={moduleHelp?.helpTitle ?? 'Como usar a Visão Geral'}
        helpText={
          moduleHelp?.helpText ??
          'Acompanhe o faturamento bruto das vendas, as taxas descontadas, o lucro líquido que já entrou no caixa e a previsão considerando contas pendentes do período.'
        }
        actions={
          <>
            <Link href="/dashboard?periodo=hoje">
              <Button variant={periodo === 'hoje' ? 'primary' : 'utility'} size="sm">
                Hoje
              </Button>
            </Link>
            <Link href="/dashboard?periodo=mes">
              <Button variant={periodo === 'mes' ? 'primary' : 'utility'} size="sm">
                Este Mês
              </Button>
            </Link>
            <Link href="/pdv">
              <Button variant="primary" size="sm">
                Ir para o PDV
              </Button>
            </Link>
          </>
        }
      />

      {/* Primary KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Faturamento Bruto" subtitle={`Taxas: ${formatBRL(summary.totalFees)}`}>
          <p className="typo-heading-2 text-ink">{formatBRL(summary.grossRevenue)}</p>
          <p className="typo-caption mt-1 text-ink-muted">
            Receita após taxas: {formatBRL(summary.netSalesRevenue)}
          </p>
        </Card>

        <Card
          variant="featured-night"
          title="Líquido Realizado (Caixa Real)"
          helpTitle="O que é o Líquido Realizado"
          helpText="Representa o dinheiro que efetivamente sobrou no período. Soma as vendas líquidas de taxas e desconta apenas as despesas fixas e variáveis já marcadas como pagas."
        >
          <p className="typo-heading-2 text-on-primary">{formatBRL(summary.realizedNetProfit)}</p>
          <p className="typo-caption mt-1 text-on-primary/80">
            Caixas abertos agora: {openRegistersCount}
          </p>
        </Card>

        <Card
          title="Líquido Previsto do Período"
          helpTitle="O que é o Líquido Previsto"
          helpText="Projeta quanto sobrará após quitar todas as contas fixas e variáveis que ainda estão pendentes com vencimento neste período."
        >
          <p className="typo-heading-2 text-ink">{formatBRL(summary.projectedNetProfit)}</p>
          <p className="typo-caption mt-1 text-ink-muted">
            A pagar: {formatBRL(summary.fixedExpensesPending + summary.variableExpensesPending)}
          </p>
        </Card>

        <Card
          variant="soft"
          title="Reserva Contábil CLT"
          helpTitle="Para que serve a Reserva CLT"
          helpText="Mostra o valor mensal recomendado para guardar referente a décimo terceiro salário e férias com um terço. Esse valor fica separado para não descontar duas vezes do seu caixa real."
        >
          <p className="typo-heading-2 text-ink">{formatBRL(summary.accountingProvisionsTotal)}</p>
          <p className="typo-caption mt-1 text-ink-muted">Provisão de 13º e Férias</p>
        </Card>
      </div>

      {/* Fixed vs Variable Breakdown */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Despesas Fixas">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="typo-caption text-ink-muted">Pagas no período</span>
              <p className="typo-heading-3 text-ink">{formatBRL(summary.fixedExpensesPaid)}</p>
            </div>
            <div className="text-right">
              <span className="typo-caption text-ink-muted">Pendentes</span>
              <p className="typo-title text-accent-orange-deep">
                {formatBRL(summary.fixedExpensesPending)}
              </p>
            </div>
          </div>
        </Card>

        <Card title="Despesas Variáveis">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="typo-caption text-ink-muted">Pagas no período</span>
              <p className="typo-heading-3 text-ink">{formatBRL(summary.variableExpensesPaid)}</p>
            </div>
            <div className="text-right">
              <span className="typo-caption text-ink-muted">Pendentes</span>
              <p className="typo-title text-accent-orange-deep">
                {formatBRL(summary.variableExpensesPending)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Sales */}
      <section className="space-y-3">
        <h2 className="typo-title text-ink">Últimas Vendas Registradas</h2>
        <ResponsiveDataTable
          keyExtractor={(row) => row.id}
          emptyMessage="Nenhuma venda registrada neste estabelecimento ainda."
          data={recentSales}
          columns={[
            {
              key: 'cliente',
              header: 'Identificação',
              render: (r) => r.customer_name || `Venda #${r.id.slice(0, 6)}`,
            },
            {
              key: 'data',
              header: 'Data',
              render: (r) => formatDateBR(r.created_at),
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => (
                <Badge sticker={r.status === 'completed' ? 'green' : 'orange'}>
                  {r.status === 'completed' ? 'Concluída' : 'Estornada'}
                </Badge>
              ),
            },
            {
              key: 'bruto',
              header: 'Bruto',
              align: 'right',
              render: (r) => formatBRL(r.gross_amount),
            },
            {
              key: 'liquido',
              header: 'Líquido',
              align: 'right',
              render: (r) => formatBRL(r.net_amount),
            },
          ]}
        />
      </section>
    </div>
  );
}
