'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Badge,
  Button,
  Card,
  LoadingState,
  PageHeader,
  ResponsiveDataTable,
} from '@/components/ui';
import { formatBRL, formatDateBR } from '@/lib/formatters';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { FinancialSummaryOutput } from '@/modules/dashboard/calculations';

interface RecentSaleRow {
  id: string;
  customer_name: string | null;
  gross_amount: number;
  net_amount: number;
  status: string;
  created_at: string;
}

export interface DashboardClientProps {
  establishmentId: string | null;
  title: string;
  helpTitle: string;
  helpText: string;
  todayStr: string;
  firstOfMonth: string;
  endOfMonth: string;
}

export function DashboardClient({
  establishmentId,
  title,
  helpTitle,
  helpText,
  todayStr,
  firstOfMonth,
  endOfMonth,
}: DashboardClientProps) {
  const [periodo, setPeriodo] = useState<'hoje' | 'mes'>('mes');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinancialSummaryOutput | null>(null);
  const [openRegistersCount, setOpenRegistersCount] = useState(0);
  const [recentSales, setRecentSales] = useState<RecentSaleRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startDate = periodo === 'hoje' ? todayStr : firstOfMonth;
  const endDate = periodo === 'hoje' ? todayStr : endOfMonth;

  const loadData = useCallback(async () => {
    if (!establishmentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    const supabase = createSupabaseBrowserClient();

    const [{ data: rpcData, error: rpcErr }, { count: openCount }, { data: salesRows }] =
      await Promise.all([
        supabase.rpc('get_financial_dashboard', {
          p_establishment_id: establishmentId,
          p_start_date: startDate,
          p_end_date: endDate,
        }),
        supabase
          .from('cash_registers')
          .select('id', { count: 'exact', head: true })
          .eq('establishment_id', establishmentId)
          .eq('status', 'open'),
        supabase
          .from('sales')
          .select('id, customer_name, gross_amount, net_amount, status, created_at')
          .eq('establishment_id', establishmentId)
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

    if (rpcErr) {
      setErrorMsg('Não foi possível carregar os indicadores financeiros agora.');
    } else {
      const raw = (rpcData ?? {}) as Record<string, number>;
      setSummary({
        grossRevenue: Number(raw.gross_revenue ?? 0),
        totalFees: Number(raw.total_fees ?? 0),
        netSalesRevenue: Number(raw.net_sales_revenue ?? 0),
        fixedExpensesPaid: Number(raw.fixed_expenses_paid ?? 0),
        variableExpensesPaid: Number(raw.variable_expenses_paid ?? 0),
        realizedNetProfit: Number(raw.realized_net_profit ?? 0),
        fixedExpensesPending: Number(raw.fixed_expenses_pending ?? 0),
        variableExpensesPending: Number(raw.variable_expenses_pending ?? 0),
        projectedNetProfit: Number(raw.projected_net_profit ?? 0),
        accountingProvisionsTotal: Number(raw.accounting_provisions_total ?? 0),
      });
      setOpenRegistersCount(openCount ?? 0);
      setRecentSales(
        (salesRows ?? []).map((r) => ({
          ...r,
          gross_amount: Number(r.gross_amount),
          net_amount: Number(r.net_amount),
        }))
      );
    }

    setLoading(false);
  }, [establishmentId, startDate, endDate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (!establishmentId) {
    return (
      <Card variant="flat" className="flex flex-col gap-5">
        <PageHeader title={title} helpTitle={helpTitle} helpText={helpText} />
        <Alert tone="info" title="Nenhuma empresa selecionada">
          Escolha um estabelecimento no menu lateral para acompanhar os resultados.
        </Alert>
      </Card>
    );
  }

  return (
    <Card variant="flat" className="flex flex-col gap-5">
      <PageHeader
        title={title}
        subtitle={`Período analisado: ${formatDateBR(startDate)} até ${formatDateBR(endDate)}`}
        helpTitle={helpTitle}
        helpText={helpText}
        actions={
          <>
            <Button
              size="sm"
              variant={periodo === 'hoje' ? 'primary' : 'utility'}
              disabled={loading}
              onClick={() => setPeriodo('hoje')}
            >
              Hoje
            </Button>
            <Button
              size="sm"
              variant={periodo === 'mes' ? 'primary' : 'utility'}
              disabled={loading}
              onClick={() => setPeriodo('mes')}
            >
              Este Mês
            </Button>
            <Link href="/pdv">
              <Button size="sm" variant="secondary">
                Abrir PDV
              </Button>
            </Link>
          </>
        }
      />

      {errorMsg && (
        <Alert tone="warning" title="Atenção">
          {errorMsg}
        </Alert>
      )}

      {loading || !summary ? (
        <LoadingState label="Carregando..." />
      ) : (
        <div className="flex flex-col gap-4">
          {/* Cards empilhados em flex-col (zero grid lado a lado) */}
          <Card
            variant="featured-night"
            title="Líquido Realizado (Caixa Real)"
            helpTitle="O que é o Líquido Realizado"
            helpText="Mostra o valor que efetivamente sobrou no período. Soma as vendas líquidas de taxas e desconta apenas as despesas fixas e variáveis já quitadas."
          >
            <p className="typo-heading-2 text-on-primary">{formatBRL(summary.realizedNetProfit)}</p>
            <p className="typo-caption mt-1 text-on-primary/80">
              Caixas abertos neste momento: {openRegistersCount}
            </p>
          </Card>

          <Card
            variant="soft"
            title="Faturamento Bruto e Taxas"
            subtitle={`Taxas descontadas no período: ${formatBRL(summary.totalFees)}`}
          >
            <p className="typo-heading-3 text-ink">{formatBRL(summary.grossRevenue)}</p>
            <p className="typo-caption mt-1 text-ink-muted">
              Receita líquida das vendas: {formatBRL(summary.netSalesRevenue)}
            </p>
          </Card>

          <Card
            variant="soft"
            title="Líquido Previsto do Período"
            helpTitle="O que é o Líquido Previsto"
            helpText="Projeta quanto sobrará após pagar todas as contas fixas e variáveis que ainda estão pendentes neste período."
          >
            <p className="typo-heading-3 text-ink">{formatBRL(summary.projectedNetProfit)}</p>
            <p className="typo-caption mt-1 text-ink-muted">
              Contas pendentes a pagar:{' '}
              {formatBRL(summary.fixedExpensesPending + summary.variableExpensesPending)}
            </p>
          </Card>

          <Card
            variant="soft"
            title="Despesas Fixas e Variáveis"
            subtitle="Resumo comparativo entre valores pagos e contas em aberto"
          >
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2">
                <span className="typo-body-sm font-medium text-ink">Despesas Fixas</span>
                <span className="typo-body-sm text-ink-secondary">
                  Pagas: <strong>{formatBRL(summary.fixedExpensesPaid)}</strong> · Pendentes:{' '}
                  <strong className="text-accent-orange-deep">
                    {formatBRL(summary.fixedExpensesPending)}
                  </strong>
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="typo-body-sm font-medium text-ink">Despesas Variáveis</span>
                <span className="typo-body-sm text-ink-secondary">
                  Pagas: <strong>{formatBRL(summary.variableExpensesPaid)}</strong> · Pendentes:{' '}
                  <strong className="text-accent-orange-deep">
                    {formatBRL(summary.variableExpensesPending)}
                  </strong>
                </span>
              </div>
            </div>
          </Card>

          <Card
            variant="soft"
            title="Reserva Trabalhista Recomendada (CLT)"
            helpTitle="Para que serve esta reserva"
            helpText="Indica quanto guardar no mês para décimo terceiro salário e férias com um terço, sem descontar duas vezes do seu caixa real."
          >
            <p className="typo-heading-3 text-ink">{formatBRL(summary.accountingProvisionsTotal)}</p>
            <p className="typo-caption mt-1 text-ink-muted">
              Provisão acumulada de décimo terceiro e férias
            </p>
          </Card>

          <Card variant="flat" title="Últimas Vendas Registradas">
            <ResponsiveDataTable
              keyExtractor={(row) => row.id}
              emptyMessage="Nenhuma venda registrada neste período."
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
                  header: 'Situação',
                  render: (r) => (
                    <Badge sticker={r.status === 'completed' ? 'green' : 'orange'}>
                      {r.status === 'completed' ? 'Concluída' : 'Estornada'}
                    </Badge>
                  ),
                },
                {
                  key: 'bruto',
                  header: 'Valor Bruto',
                  align: 'right',
                  render: (r) => formatBRL(r.gross_amount),
                },
                {
                  key: 'liquido',
                  header: 'Valor Líquido',
                  align: 'right',
                  render: (r) => formatBRL(r.net_amount),
                },
              ]}
            />
          </Card>
        </div>
      )}
    </Card>
  );
}
