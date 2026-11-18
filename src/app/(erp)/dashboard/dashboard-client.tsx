'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Badge,
  Button,
  Card,
  ChoiceChips,
  LoadingState,
  PageHeader,
  ResponsiveDataTable,
  StatCard,
  TruncatedText,
} from '@/components/ui';
import { humanizeSaleStatus } from '@/lib/domain-labels';
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const requestRef = useRef(0);

  const [summary, setSummary] = useState<FinancialSummaryOutput | null>(null);
  const [openRegistersCount, setOpenRegistersCount] = useState(0);
  const [recentSales, setRecentSales] = useState<RecentSaleRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startDate = periodo === 'hoje' ? todayStr : firstOfMonth;
  const endDate = periodo === 'hoje' ? todayStr : endOfMonth;

  const loadData = useCallback(async () => {
    if (!establishmentId) {
      setInitialLoading(false);
      return;
    }

    const reqId = ++requestRef.current;
    setRefreshing(true);
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

    if (reqId !== requestRef.current) return;

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

    setRefreshing(false);
    setInitialLoading(false);
  }, [establishmentId, startDate, endDate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (!establishmentId) {
    return (
      <Card variant="flat" className="flex flex-col gap-5">
        <PageHeader title={title} helpTitle={helpTitle} helpText={helpText} />
        <Card variant="soft" title="Nenhuma empresa selecionada">
          <p className="typo-body-md text-ink-muted">
            Escolha um estabelecimento no menu lateral para acompanhar os resultados.
          </p>
        </Card>
      </Card>
    );
  }

  return (
    <Card variant="flat" className="flex flex-col gap-5">
      <PageHeader
        title={title}
        subtitle={`Período: ${formatDateBR(startDate)} até ${formatDateBR(endDate)}`}
        helpTitle={helpTitle}
        helpText={helpText}
        actions={
          <>
            <ChoiceChips
              ariaLabel="Período analisado"
              value={periodo}
              onChange={setPeriodo}
              options={[
                { value: 'hoje', label: 'Hoje' },
                { value: 'mes', label: 'Este mês' },
              ]}
            />
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

      {initialLoading || !summary ? (
        <LoadingState label="Carregando..." />
      ) : refreshing ? (
        <LoadingState label="Atualizando..." />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))]">
            <StatCard
              tone="featured"
              label="Líquido realizado"
              value={formatBRL(summary.realizedNetProfit)}
              footnote={`Caixas abertos agora: ${openRegistersCount}`}
              helpTitle="O que é o líquido realizado"
              helpText="Soma as vendas já descontadas das taxas e subtrai apenas as despesas pagas no período."
            />
            <StatCard
              label="Faturamento bruto"
              value={formatBRL(summary.grossRevenue)}
              footnote={`Taxas: ${formatBRL(summary.totalFees)} · Líquido: ${formatBRL(summary.netSalesRevenue)}`}
            />
            <StatCard
              label="Líquido previsto"
              value={formatBRL(summary.projectedNetProfit)}
              footnote={`Contas pendentes: ${formatBRL(summary.fixedExpensesPending + summary.variableExpensesPending)}`}
              helpTitle="O que é o líquido previsto"
              helpText="Mostra quanto sobrará depois de quitar todas as contas fixas e variáveis pendentes do período."
            />
            <StatCard
              label="Reserva trabalhista (CLT)"
              value={formatBRL(summary.accountingProvisionsTotal)}
              footnote="Provisão de 13º salário e férias"
              helpTitle="Para que serve esta reserva"
              helpText="Indica quanto guardar no mês para décimo terceiro e férias com um terço, sem descontar duas vezes do caixa real."
            />
          </div>

          <Card
            variant="soft"
            title="Despesas fixas e variáveis"
            subtitle="Valores já pagos e contas pendentes no período"
          >
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2">
                <span className="typo-body-sm font-medium text-ink">Despesas fixas</span>
                <span className="typo-body-sm tabular-nums text-ink-secondary">
                  Pagas: <strong className="font-semibold text-ink">{formatBRL(summary.fixedExpensesPaid)}</strong> · Pendentes:{' '}
                  <strong className="font-semibold text-accent-orange-deep">
                    {formatBRL(summary.fixedExpensesPending)}
                  </strong>
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="typo-body-sm font-medium text-ink">Despesas variáveis</span>
                <span className="typo-body-sm tabular-nums text-ink-secondary">
                  Pagas: <strong className="font-semibold text-ink">{formatBRL(summary.variableExpensesPaid)}</strong> · Pendentes:{' '}
                  <strong className="font-semibold text-accent-orange-deep">
                    {formatBRL(summary.variableExpensesPending)}
                  </strong>
                </span>
              </div>
            </div>
          </Card>

          <Card
            variant="flat"
            title="Últimas vendas"
            headerAction={
              <span className="typo-caption text-ink-muted">{recentSales.length} itens</span>
            }
          >
            <ResponsiveDataTable
              keyExtractor={(row) => row.id}
              emptyMessage="Nenhuma venda neste período."
              data={recentSales}
              columns={[
                {
                  key: 'cliente',
                  header: 'Identificação',
                  render: (r) => (
                    <TruncatedText
                      text={r.customer_name || `Venda #${r.id.slice(0, 6)}`}
                      maxWidthClass="max-w-[200px]"
                    />
                  ),
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
                      {humanizeSaleStatus(r.status)}
                    </Badge>
                  ),
                },
                {
                  key: 'bruto',
                  header: 'Valor bruto',
                  align: 'right',
                  render: (r) => <span className="tabular-nums">{formatBRL(r.gross_amount)}</span>,
                },
                {
                  key: 'liquido',
                  header: 'Valor líquido',
                  align: 'right',
                  render: (r) => <span className="tabular-nums">{formatBRL(r.net_amount)}</span>,
                },
              ]}
            />
          </Card>
        </div>
      )}
    </Card>
  );
}
