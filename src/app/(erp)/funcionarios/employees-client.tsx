'use client';

import React, { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { CalendarPlus, HandCoins, Plus } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  ChoiceChips,
  ConfirmModal,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  ResponsiveDataTable,
  RowActions,
  Select,
  StatCard,
  TruncatedText,
} from '@/components/ui';
import { humanizeContractType, humanizeTaxRegime } from '@/lib/domain-labels';
import { formatBRL } from '@/lib/formatters';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  calculateCltAccountingBreakdown,
  type CltTaxParameters,
} from '@/modules/employees/clt-calculator';
import {
  createEmployeeAction,
  generateCltMonthlyExpensesAction,
  launchDiaristaPaymentAction,
} from '@/modules/employees/actions';
import { resolveParametroValue } from '@/modules/parametros/service';
import type { ParametroWebRow } from '@/modules/parametros/types';

export interface EmployeeRow {
  id: string;
  full_name: string;
  role_title: string;
  contract_type: 'clt' | 'non_clt';
  base_salary_monthly: number;
  daily_rate: number;
  transport_allowance_monthly: number;
  meal_allowance_monthly: number;
  other_benefits_monthly: number;
}

export interface EmployeesClientProps {
  establishmentId: string | null;
  title: string;
  helpTitle: string;
  helpText: string;
}

const PAGE_SIZE = 10;

export function EmployeesClient({
  establishmentId,
  title,
  helpTitle,
  helpText,
}: EmployeesClientProps) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [competenceMonth, setCompetenceMonth] = useState(currentMonth);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [initialLoading, setInitialLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);

  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [taxRegime, setTaxRegime] = useState('simples_nacional');
  const [cltParams, setCltParams] = useState<CltTaxParameters | null>(null);
  const [openRegisters, setOpenRegisters] = useState<Array<{ id: string; label: string }>>([]);

  const [contractType, setContractType] = useState<'clt' | 'non_clt'>('clt');
  const [salaryInput, setSalaryInput] = useState('2200');
  const [vtInput, setVtInput] = useState('180');
  const [vaInput, setVaInput] = useState('350');
  const [otherInput, setOtherInput] = useState('0');

  const [diaristaModalEmp, setDiaristaModalEmp] = useState<EmployeeRow | null>(null);
  const [diaristaPayNow, setDiaristaPayNow] = useState<'true' | 'false'>('true');
  const [diaristaError, setDiaristaError] = useState<string | null>(null);

  const [cltConfirmEmp, setCltConfirmEmp] = useState<EmployeeRow | null>(null);
  const [cltConfirmError, setCltConfirmError] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{ tone: 'success' | 'warning'; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const loadConfig = useCallback(async () => {
    if (!establishmentId) {
      setInitialLoading(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const [{ data: est }, { data: paramRows }, { data: regRows }] = await Promise.all([
      supabase
        .from('establishments')
        .select('tax_regime')
        .eq('id', establishmentId)
        .maybeSingle(),
      supabase
        .from('parametros_web')
        .select('*')
        .eq('chave_parametro', 'clt_tributos_vigentes'),
      supabase
        .from('cash_registers')
        .select('id, register_points(name)')
        .eq('establishment_id', establishmentId)
        .eq('status', 'open'),
    ]);

    setTaxRegime(est?.tax_regime ?? 'simples_nacional');
    setCltParams(
      resolveParametroValue<CltTaxParameters>(
        (paramRows ?? []) as ParametroWebRow[],
        'clt_tributos_vigentes',
        establishmentId
      )
    );
    setOpenRegisters(
      (regRows ?? []).map((r: Record<string, unknown>) => {
        const pt = r.register_points as { name?: string } | null;
        return {
          id: String(r.id),
          label: pt?.name ?? 'Caixa aberto',
        };
      })
    );
    setInitialLoading(false);
  }, [establishmentId]);

  const loadEmployees = useCallback(
    async (targetPage: number) => {
      if (!establishmentId) {
        setTableLoading(false);
        return;
      }

      setTableLoading(true);
      const supabase = createSupabaseBrowserClient();
      const from = (targetPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: empRows, count } = await supabase
        .from('employees')
        .select('*', { count: 'exact' })
        .eq('establishment_id', establishmentId)
        .eq('is_active', true)
        .order('full_name')
        .range(from, to);

      setEmployees(
        ((empRows ?? []) as EmployeeRow[]).map((e) => ({
          ...e,
          base_salary_monthly: Number(e.base_salary_monthly),
          daily_rate: Number(e.daily_rate),
          transport_allowance_monthly: Number(e.transport_allowance_monthly),
          meal_allowance_monthly: Number(e.meal_allowance_monthly),
          other_benefits_monthly: Number(e.other_benefits_monthly),
        }))
      );
      setTotalCount(count ?? 0);
      setTableLoading(false);
    },
    [establishmentId]
  );

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    void loadEmployees(page);
  }, [loadEmployees, page]);

  const liveBreakdown = useMemo(() => {
    if (!cltParams || contractType !== 'clt') return null;
    return calculateCltAccountingBreakdown(
      {
        baseSalaryMonthly: Number(salaryInput) || 0,
        transportAllowanceMonthly: Number(vtInput) || 0,
        mealAllowanceMonthly: Number(vaInput) || 0,
        otherBenefitsMonthly: Number(otherInput) || 0,
      },
      taxRegime,
      cltParams
    );
  }, [cltParams, contractType, salaryInput, vtInput, vaInput, otherInput, taxRegime]);

  return (
    <Card variant="flat" className="flex flex-col gap-5">
      <PageHeader
        title={title}
        subtitle="Cadastre colaboradores CLT conferindo os encargos do mês ou lance diárias de prestadores."
        helpTitle={helpTitle}
        helpText={helpText}
      />

      {feedback && (
        <Alert tone={feedback.tone} title="Equipe atualizada">
          {feedback.text}
        </Alert>
      )}

      {initialLoading ? (
        <LoadingState label="Carregando..." />
      ) : (
        <div className="flex flex-col gap-5">
          {contractType === 'clt' && liveBreakdown && (
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))]">
              <StatCard
                tone="featured"
                label="Saída mensal na folha e guias"
                value={formatBRL(liveBreakdown.monthlyCashOutflowTotal)}
                footnote={`Regime: ${humanizeTaxRegime(taxRegime)}`}
                helpTitle="Saída mensal na folha"
                helpText="Soma o salário líquido pago ao colaborador, as guias mensais de FGTS e INSS e o custo líquido dos benefícios."
              />
              <StatCard
                label="Reserva mensal (13º e férias)"
                value={formatBRL(liveBreakdown.monthlyProvisionsTotal)}
                footnote="Valor para guardar todo mês"
                helpTitle="Reserva mensal recomendada"
                helpText="Indica quanto separar por mês para cobrir o décimo terceiro salário e as férias com um terço sem apertar o caixa no fim do ano."
              />
              <StatCard
                label="Custo total mensal do colaborador"
                value={formatBRL(liveBreakdown.effectiveTotalMonthlyCost)}
                footnote="Folha + encargos + reservas"
              />
            </div>
          )}

          <Card
            variant="soft"
            title="Novo colaborador"
            subtitle="Escolha o vínculo de trabalho e preencha a remuneração combinada."
          >
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                fd.set('contract_type', contractType);
                startTransition(async () => {
                  const res = await createEmployeeAction(fd);
                  if (res.error) setFeedback({ tone: 'warning', text: res.error });
                  else {
                    setFeedback({ tone: 'success', text: 'Colaborador cadastrado com sucesso.' });
                    setPage(1);
                    await loadEmployees(1);
                  }
                });
              }}
            >
              <div className="flex flex-col gap-2">
                <span className="typo-caption font-medium text-ink-secondary">
                  Vínculo de trabalho
                </span>
                <ChoiceChips
                  ariaLabel="Vínculo de trabalho"
                  value={contractType}
                  onChange={setContractType}
                  options={[
                    { value: 'clt', label: 'Carteira assinada (CLT)' },
                    { value: 'non_clt', label: 'Diarista / prestador' },
                  ]}
                />
              </div>

              <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                <Input
                  name="full_name"
                  label="Nome completo"
                  placeholder="Ex: Maria Souza"
                  required
                />
                <Input
                  name="role_title"
                  label="Cargo ou função"
                  placeholder="Ex: Cozinheira ou salva-vidas"
                  required
                />
                <Input name="document_cpf" label="CPF (opcional)" placeholder="000.000.000-00" />
                <Input name="phone" label="Telefone ou WhatsApp" placeholder="(00) 90000-0000" />
              </div>

              {contractType === 'clt' ? (
                <div className="grid gap-4 border-t border-hairline pt-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                  <Input
                    name="base_salary_monthly"
                    type="number"
                    step="0.01"
                    min="0"
                    label="Salário bruto mensal (R$)"
                    value={salaryInput}
                    onChange={(e) => setSalaryInput(e.target.value)}
                    required
                  />
                  <Input
                    name="transport_allowance_monthly"
                    type="number"
                    step="0.01"
                    min="0"
                    label="Vale-transporte mensal (R$)"
                    value={vtInput}
                    onChange={(e) => setVtInput(e.target.value)}
                  />
                  <Input
                    name="meal_allowance_monthly"
                    type="number"
                    step="0.01"
                    min="0"
                    label="Vale-alimentação ou refeição (R$)"
                    value={vaInput}
                    onChange={(e) => setVaInput(e.target.value)}
                  />
                  <Input
                    name="other_benefits_monthly"
                    type="number"
                    step="0.01"
                    min="0"
                    label="Outros benefícios (R$)"
                    value={otherInput}
                    onChange={(e) => setOtherInput(e.target.value)}
                  />
                </div>
              ) : (
                <div className="grid gap-4 border-t border-hairline pt-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                  <Input
                    name="daily_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue="120.00"
                    label="Valor combinado por diária (R$)"
                    required
                  />
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  loading={isPending}
                  loadingText="Salvando..."
                >
                  <Plus className="h-4 w-4" />
                  Salvar colaborador
                </Button>
              </div>
            </form>
          </Card>

          {contractType === 'clt' && !cltParams ? (
            <Alert tone="warning" title="Alíquotas trabalhistas não configuradas">
              Cadastre as alíquotas vigentes da CLT na tela de Administração para ver o detalhamento automático.
            </Alert>
          ) : contractType === 'clt' && liveBreakdown && cltParams ? (
            <Card
              variant="soft"
              title="Detalhamento mensal da CLT"
              subtitle="Simulação calculada com as alíquotas vigentes nas configurações gerais."
            >
              <div className="flex flex-col gap-4">
                <dl className="flex flex-col gap-2 typo-body-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <dt className="text-ink-secondary">
                      Salário líquido ao colaborador (vencimento dia {cltParams.dueDays.salaryDay})
                    </dt>
                    <dd className="tabular-nums font-medium text-ink">
                      {formatBRL(liveBreakdown.netSalaryToEmployee)}
                    </dd>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <dt className="text-ink-muted">Desconto de INSS retido no contracheque</dt>
                    <dd className="tabular-nums text-ink-muted">
                      {formatBRL(liveBreakdown.employeeInssWithheld)}
                    </dd>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <dt className="text-ink-secondary">
                      Guia FGTS ({cltParams.fgtsRate}%, dia {cltParams.dueDays.fgtsDay})
                    </dt>
                    <dd className="tabular-nums font-medium text-ink">
                      {formatBRL(liveBreakdown.fgtsMonthly)}
                    </dd>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <dt className="text-ink-secondary">
                      Guia previdenciária INSS e IRRF (dia {cltParams.dueDays.inssDay})
                    </dt>
                    <dd className="tabular-nums font-medium text-ink">
                      {formatBRL(liveBreakdown.inssGuideTotal)}
                    </dd>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <dt className="text-ink-secondary">
                      Benefícios líquidos (descontada cota de até {cltParams.vtEmployeeCapPercent}%)
                    </dt>
                    <dd className="tabular-nums font-medium text-ink">
                      {formatBRL(liveBreakdown.employerBenefitsNetCost)}
                    </dd>
                  </div>
                </dl>

                <dl className="flex flex-col gap-2 border-t border-hairline pt-3 typo-body-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <dt className="text-ink-secondary">
                      Reserva mensal de 13º salário com encargos
                    </dt>
                    <dd className="tabular-nums font-medium text-ink">
                      {formatBRL(liveBreakdown.provision13thTotal)}
                    </dd>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <dt className="text-ink-secondary">
                      Reserva mensal de férias + 1/3 com encargos
                    </dt>
                    <dd className="tabular-nums font-medium text-ink">
                      {formatBRL(liveBreakdown.provisionVacationTotal)}
                    </dd>
                  </div>
                </dl>
              </div>
            </Card>
          ) : null}

          <Card
            variant="flat"
            title="Equipe cadastrada"
            headerAction={
              <span className="typo-caption text-ink-muted">{totalCount} pessoas</span>
            }
          >
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
                <Input
                  type="month"
                  label="Mês de referência para gerar folha CLT"
                  value={competenceMonth}
                  onChange={(e) => setCompetenceMonth(e.target.value)}
                />
              </div>

              <ResponsiveDataTable
                keyExtractor={(r) => r.id}
                loading={tableLoading}
                emptyMessage="Nenhum colaborador cadastrado ainda."
                data={employees}
                pagination={{
                  mode: 'numbered',
                  page,
                  pageSize: PAGE_SIZE,
                  totalCount,
                  loading: tableLoading,
                  onPageChange: (next) => setPage(next),
                }}
                columns={[
                  {
                    key: 'nome',
                    header: 'Colaborador',
                    render: (r) => (
                      <div className="min-w-0">
                        <TruncatedText text={r.full_name} maxWidthClass="max-w-[220px]" />
                        <span className="typo-caption text-ink-muted">{r.role_title}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'vinculo',
                    header: 'Vínculo',
                    render: (r) => (
                      <Badge sticker={r.contract_type === 'clt' ? 'purple' : 'pink'}>
                        {humanizeContractType(r.contract_type)}
                      </Badge>
                    ),
                  },
                  {
                    key: 'remuneracao',
                    header: 'Remuneração',
                    align: 'right',
                    render: (r) => (
                      <span className="tabular-nums">
                        {r.contract_type === 'clt'
                          ? `${formatBRL(r.base_salary_monthly)} / mês`
                          : `${formatBRL(r.daily_rate)} / diária`}
                      </span>
                    ),
                  },
                  {
                    key: 'acao',
                    header: 'Ações',
                    align: 'right',
                    render: (r) =>
                      r.contract_type === 'clt' ? (
                        <RowActions
                          actions={[
                            {
                              key: 'gen-clt',
                              label: `Gerar folha e reservas CLT de ${competenceMonth}`,
                              icon: <CalendarPlus className="h-4 w-4 text-primary" />,
                              disabled: isPending,
                              onClick: () => {
                                setCltConfirmError(null);
                                setCltConfirmEmp(r);
                              },
                            },
                          ]}
                        />
                      ) : (
                        <RowActions
                          actions={[
                            {
                              key: 'pay-diaria',
                              label: 'Lançar pagamento de diária',
                              icon: <HandCoins className="h-4 w-4 text-accent-teal" />,
                              disabled: isPending,
                              onClick: () => {
                                setDiaristaError(null);
                                setDiaristaPayNow('true');
                                setDiaristaModalEmp(r);
                              },
                            },
                          ]}
                        />
                      ),
                  },
                ]}
              />
            </div>
          </Card>
        </div>
      )}

      <ConfirmModal
        open={Boolean(cltConfirmEmp)}
        onClose={() => setCltConfirmEmp(null)}
        title={`Gerar lançamentos de ${competenceMonth} para ${cltConfirmEmp?.full_name ?? ''}?`}
        description="Serão criadas as contas mensais de salário, FGTS, INSS e benefícios em Despesas, além das reservas recomendadas de décimo terceiro e férias."
        tone="primary"
        confirmLabel="Gerar lançamentos"
        loadingLabel="Gerando..."
        loading={isPending}
        errorMessage={cltConfirmError}
        onConfirm={() => {
          if (!cltConfirmEmp) return;
          startTransition(async () => {
            const res = await generateCltMonthlyExpensesAction(cltConfirmEmp.id, competenceMonth);
            if (res.error) {
              setCltConfirmError(res.error);
            } else {
              setCltConfirmEmp(null);
              setFeedback({
                tone: 'success',
                text: `${res.insertedCount} contas geradas em Despesas para ${cltConfirmEmp.full_name}.`,
              });
            }
          });
        }}
      />

      <Modal
        open={Boolean(diaristaModalEmp)}
        onClose={() => setDiaristaModalEmp(null)}
        title={`Lançar diária de ${diaristaModalEmp?.full_name ?? ''}`}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setDiaristaError(null);
            const fd = new FormData(e.currentTarget);
            fd.set('employee_id', diaristaModalEmp?.id ?? '');
            fd.set('employee_name', diaristaModalEmp?.full_name ?? '');
            fd.set('pay_now', diaristaPayNow);
            startTransition(async () => {
              const res = await launchDiaristaPaymentAction(fd);
              if (res.error) setDiaristaError(res.error);
              else {
                setFeedback({
                  tone: 'success',
                  text: 'Diária lançada em Despesas com sucesso.',
                });
                setDiaristaModalEmp(null);
              }
            });
          }}
        >
          {diaristaError && (
            <Alert tone="warning" title="Não foi possível lançar a diária">
              {diaristaError}
            </Alert>
          )}

          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
            <Input
              name="days_worked"
              type="number"
              step="0.5"
              min="0.5"
              defaultValue="1"
              label="Diárias trabalhadas"
              required
            />
            <Input
              name="daily_rate"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={diaristaModalEmp?.daily_rate.toFixed(2) ?? '120.00'}
              label="Valor por diária (R$)"
              required
            />
          </div>

          <div className="flex flex-col gap-2 border-t border-hairline pt-3">
            <span className="typo-caption font-medium text-ink-secondary">
              Situação do pagamento
            </span>
            <ChoiceChips
              ariaLabel="Situação do pagamento da diária"
              value={diaristaPayNow}
              onChange={setDiaristaPayNow}
              options={[
                { value: 'true', label: 'Pago hoje' },
                { value: 'false', label: 'Deixar pendente em contas a pagar' },
              ]}
            />
          </div>

          {diaristaPayNow === 'true' && (
            <Select
              name="cash_register_id"
              label="Origem do pagamento"
              options={[
                { value: '', label: 'PIX ou conta bancária da empresa' },
                ...openRegisters.map((reg) => ({
                  value: reg.id,
                  label: `Dinheiro da gaveta: ${reg.label}`,
                })),
              ]}
            />
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button
              variant="utility"
              disabled={isPending}
              onClick={() => setDiaristaModalEmp(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isPending}
              loadingText="Lançando..."
            >
              Lançar diária
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
