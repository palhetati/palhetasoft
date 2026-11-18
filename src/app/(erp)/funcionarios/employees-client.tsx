'use client';

import React, { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { CalendarPlus, HandCoins, Plus } from 'lucide-react';
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  ConfirmModal,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  ResponsiveDataTable,
  RowActions,
  Select,
} from '@/components/ui';
import { humanizeTaxRegime } from '@/lib/domain-labels';
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
  const [loading, setLoading] = useState(true);

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
  const [cltConfirmEmp, setCltConfirmEmp] = useState<EmployeeRow | null>(null);
  const [cltConfirmError, setCltConfirmError] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{ tone: 'success' | 'warning'; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(
    async (targetPage: number) => {
      if (!establishmentId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const supabase = createSupabaseBrowserClient();
      const from = (targetPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const [{ data: empRows, count }, { data: est }, { data: paramRows }, { data: regRows }] =
        await Promise.all([
          supabase
            .from('employees')
            .select('*', { count: 'exact' })
            .eq('establishment_id', establishmentId)
            .eq('is_active', true)
            .order('full_name')
            .range(from, to),
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
            label: pt?.name ?? 'Caixa em Operação',
          };
        })
      );
      setLoading(false);
    },
    [establishmentId]
  );

  useEffect(() => {
    void loadData(page);
  }, [loadData, page]);

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
        subtitle="Cadastre colaboradores CLT visualizando encargos trabalhistas ou lance pagamentos de diaristas."
        helpTitle={helpTitle}
        helpText={helpText}
      />

      {feedback && (
        <Alert tone={feedback.tone} title="Gestão de Equipe">
          {feedback.text}
        </Alert>
      )}

      {loading ? (
        <LoadingState label="Carregando..." />
      ) : (
        <div className="flex flex-col gap-5">
          {/* Card 1: Cadastro de Colaborador (empilhado em flex-col) */}
          <Card
            variant="soft"
            title="Novo Colaborador"
            subtitle="Escolha entre carteira assinada (CLT) ou prestador diarista."
          >
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                startTransition(async () => {
                  const res = await createEmployeeAction(fd);
                  if (res.error) setFeedback({ tone: 'warning', text: res.error });
                  else {
                    setFeedback({ tone: 'success', text: 'Colaborador cadastrado com sucesso.' });
                    await loadData(1);
                  }
                });
              }}
            >
              <Input
                name="full_name"
                label="Nome Completo"
                placeholder="Ex: Maria Souza"
                required
              />
              <Input
                name="role_title"
                label="Cargo ou Função"
                placeholder="Ex: Cozinheira ou Salva Vidas"
                required
              />
              <Select
                name="contract_type"
                label="Vínculo de Trabalho"
                value={contractType}
                onChange={(e) => setContractType(e.target.value as 'clt' | 'non_clt')}
                options={[
                  { value: 'clt', label: 'Carteira Assinada (CLT)' },
                  { value: 'non_clt', label: 'Diarista ou Prestador Extra' },
                ]}
              />

              <Input name="document_cpf" label="CPF (opcional)" placeholder="000.000.000-00" />
              <Input name="phone" label="Telefone ou WhatsApp" placeholder="(00) 90000-0000" />

              {contractType === 'clt' ? (
                <div className="flex flex-col gap-3 rounded-md bg-surface p-4 border border-hairline">
                  <Input
                    name="base_salary_monthly"
                    type="number"
                    step="0.01"
                    min="0"
                    label="Salário Base Bruto Mensal (R$)"
                    value={salaryInput}
                    onChange={(e) => setSalaryInput(e.target.value)}
                    required
                  />
                  <Input
                    name="transport_allowance_monthly"
                    type="number"
                    step="0.01"
                    min="0"
                    label="Vale Transporte Mensal (R$)"
                    value={vtInput}
                    onChange={(e) => setVtInput(e.target.value)}
                  />
                  <Input
                    name="meal_allowance_monthly"
                    type="number"
                    step="0.01"
                    min="0"
                    label="Vale Alimentação ou Refeição (R$)"
                    value={vaInput}
                    onChange={(e) => setVaInput(e.target.value)}
                  />
                  <Input
                    name="other_benefits_monthly"
                    type="number"
                    step="0.01"
                    min="0"
                    label="Outros Benefícios (R$)"
                    value={otherInput}
                    onChange={(e) => setOtherInput(e.target.value)}
                  />
                </div>
              ) : (
                <Input
                  name="daily_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue="120.00"
                  label="Valor Combinado por Diária (R$)"
                  required
                />
              )}

              <div>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isPending}
                  loadingText="Carregando..."
                >
                  <Plus className="h-4 w-4" />
                  Salvar Colaborador
                </Button>
              </div>
            </form>
          </Card>

          {/* Card 2: Demonstrativo Contábil CLT Parametrizado (abaixo do formulário em flex-col) */}
          {contractType === 'clt' && !cltParams ? (
            <Alert tone="warning" title="Regras trabalhistas não encontradas">
              Configure as alíquotas vigentes da CLT na área de Administração para visualizar os cálculos automáticos.
            </Alert>
          ) : contractType === 'clt' && liveBreakdown && cltParams ? (
            <Card
              variant="flat"
              title="Demonstrativo de Custos e Obrigações CLT"
              subtitle={`Regime tributário da empresa: ${humanizeTaxRegime(taxRegime)}`}
              helpTitle="Como ler os Custos da CLT"
              helpText="Os valores abaixo seguem as alíquotas cadastradas nas Configurações Gerais do Sistema. As obrigações mensais saem todo mês nas guias, enquanto as reservas de décimo terceiro e férias mostram quanto guardar mensalmente."
            >
              <div className="flex flex-col gap-3">
                <Card variant="soft" className="!p-3">
                  <span className="typo-caption text-ink-muted">
                    Saída Mensal nas Guias e Folha
                  </span>
                  <p className="typo-heading-3 text-ink">
                    {formatBRL(liveBreakdown.monthlyCashOutflowTotal)}
                  </p>
                </Card>

                <Card variant="soft" className="!p-3">
                  <span className="typo-caption text-ink-muted">
                    Reserva Mensal Recomendada (13º Salário e Férias)
                  </span>
                  <p className="typo-heading-3 text-primary">
                    {formatBRL(liveBreakdown.monthlyProvisionsTotal)}
                  </p>
                </Card>

                <Accordion title="1. O que pagar todo mês (Salário, FGTS, INSS e Benefícios)" defaultOpen>
                  <ul className="flex flex-col gap-2 typo-body-sm">
                    <li className="flex justify-between">
                      <span>Salário Líquido ao Colaborador (dia {cltParams.dueDays.salaryDay}):</span>
                      <strong>{formatBRL(liveBreakdown.netSalaryToEmployee)}</strong>
                    </li>
                    <li className="flex justify-between text-ink-muted">
                      <span>Desconto de INSS retido na folha:</span>
                      <span>{formatBRL(liveBreakdown.employeeInssWithheld)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Guia FGTS ({cltParams.fgtsRate}%, dia {cltParams.dueDays.fgtsDay}):</span>
                      <strong>{formatBRL(liveBreakdown.fgtsMonthly)}</strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Guia Previdenciária INSS e IRRF (dia {cltParams.dueDays.inssDay}):</span>
                      <strong>{formatBRL(liveBreakdown.inssGuideTotal)}</strong>
                    </li>
                    <li className="flex justify-between">
                      <span>
                        Custo Líquido de Benefícios (descontada cota de até {cltParams.vtEmployeeCapPercent}%):
                      </span>
                      <strong>{formatBRL(liveBreakdown.employerBenefitsNetCost)}</strong>
                    </li>
                  </ul>
                </Accordion>

                <Accordion title="2. O que reservar todo mês (13º Salário e Férias com 1/3)" defaultOpen>
                  <ul className="flex flex-col gap-2 typo-body-sm">
                    <li className="flex justify-between">
                      <span>Reserva Mensal de 13º Salário + Encargos:</span>
                      <strong>{formatBRL(liveBreakdown.provision13thTotal)}</strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Reserva Mensal de Férias + 1/3 Constitucional + Encargos:</span>
                      <strong>{formatBRL(liveBreakdown.provisionVacationTotal)}</strong>
                    </li>
                    <li className="flex justify-between border-t border-hairline pt-2 font-semibold">
                      <span>Custo Efetivo Total Mensal do Colaborador:</span>
                      <span>{formatBRL(liveBreakdown.effectiveTotalMonthlyCost)}</span>
                    </li>
                  </ul>
                </Accordion>
              </div>
            </Card>
          ) : null}

          {/* Card 3: Equipe Cadastrada com Paginação Numerada */}
          <Card variant="flat" title={`Equipe Cadastrada (${totalCount})`} className="flex flex-col gap-4">
            <div className="max-w-xs">
              <Input
                type="month"
                label="Mês de Referência para Gerar Folha CLT"
                value={competenceMonth}
                onChange={(e) => setCompetenceMonth(e.target.value)}
              />
            </div>

            <ResponsiveDataTable
              keyExtractor={(r) => r.id}
              emptyMessage="Nenhum colaborador cadastrado ainda."
              data={employees}
              pagination={{
                mode: 'numbered',
                page,
                pageSize: PAGE_SIZE,
                totalCount,
                loading,
                onPageChange: (next) => setPage(next),
              }}
              columns={[
                {
                  key: 'nome',
                  header: 'Colaborador',
                  render: (r) => (
                    <div>
                      <p className="font-medium text-ink">{r.full_name}</p>
                      <span className="typo-caption text-ink-muted">{r.role_title}</span>
                    </div>
                  ),
                },
                {
                  key: 'vinculo',
                  header: 'Vínculo',
                  render: (r) =>
                    r.contract_type === 'clt' ? (
                      <Badge sticker="purple">Carteira Assinada (CLT)</Badge>
                    ) : (
                      <Badge sticker="pink">Diarista / Prestador</Badge>
                    ),
                },
                {
                  key: 'remuneracao',
                  header: 'Remuneração Base',
                  align: 'right',
                  render: (r) =>
                    r.contract_type === 'clt'
                      ? `${formatBRL(r.base_salary_monthly)} / mês`
                      : `${formatBRL(r.daily_rate)} / diária`,
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
                            label: `Gerar obrigações e reservas CLT de ${competenceMonth}`,
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
                            onClick: () => setDiaristaModalEmp(r),
                          },
                        ]}
                      />
                    ),
                },
              ]}
            />
          </Card>
        </div>
      )}

      {/* ConfirmModal Compartilhado para Geração de Obrigações CLT */}
      <ConfirmModal
        open={Boolean(cltConfirmEmp)}
        onClose={() => setCltConfirmEmp(null)}
        title={`Gerar lançamentos de ${competenceMonth} para ${cltConfirmEmp?.full_name ?? ''}?`}
        description="Serão criados os títulos separados de Salário, FGTS, INSS e Benefícios em Despesas Fixas, além das reservas mensais recomendadas de décimo terceiro e férias."
        tone="primary"
        confirmLabel="Gerar Lançamentos"
        loadingLabel="Carregando..."
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
                text: `${res.insertedCount} lançamentos gerados nas Despesas para ${cltConfirmEmp.full_name}.`,
              });
            }
          });
        }}
      />

      {/* Modal: Lançar Diária */}
      <Modal
        open={Boolean(diaristaModalEmp)}
        onClose={() => setDiaristaModalEmp(null)}
        title={`Lançar Diária: ${diaristaModalEmp?.full_name ?? ''}`}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set('employee_id', diaristaModalEmp?.id ?? '');
            fd.set('employee_name', diaristaModalEmp?.full_name ?? '');
            startTransition(async () => {
              const res = await launchDiaristaPaymentAction(fd);
              if (res.error) setFeedback({ tone: 'warning', text: res.error });
              else {
                setFeedback({
                  tone: 'success',
                  text: 'Diária registrada em Despesas Variáveis com sucesso.',
                });
                setDiaristaModalEmp(null);
              }
            });
          }}
        >
          <Input
            name="days_worked"
            type="number"
            step="0.5"
            min="0.5"
            defaultValue="1"
            label="Quantidade de Diárias Trabalhadas"
            required
          />
          <Input
            name="daily_rate"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={diaristaModalEmp?.daily_rate.toFixed(2) ?? '120.00'}
            label="Valor por Diária (R$)"
            required
          />
          <Select
            name="pay_now"
            label="Situação do Pagamento"
            options={[
              { value: 'true', label: 'Pago hoje' },
              { value: 'false', label: 'Deixar pendente em Contas a Pagar' },
            ]}
          />
          <Select
            name="cash_register_id"
            label="Origem do Dinheiro (se pago hoje)"
            options={[
              { value: '', label: 'PIX ou Conta Bancária da Empresa' },
              ...openRegisters.map((reg) => ({
                value: reg.id,
                label: `Dinheiro da Gaveta: ${reg.label}`,
              })),
            ]}
          />

          <div className="flex justify-end gap-2">
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
              loadingText="Carregando..."
            >
              Confirmar Lançamento
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
