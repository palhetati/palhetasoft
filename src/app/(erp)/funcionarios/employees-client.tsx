'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  ResponsiveDataTable,
  Select,
} from '@/components/ui';
import { formatBRL } from '@/lib/formatters';
import {
  calculateCltAccountingBreakdown,
  type CltTaxParameters,
} from '@/modules/employees/clt-calculator';
import {
  createEmployeeAction,
  generateCltMonthlyExpensesAction,
  launchDiaristaPaymentAction,
} from '@/modules/employees/actions';

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
  employees: EmployeeRow[];
  taxRegime: string;
  cltParams: CltTaxParameters | null;
  openRegisters: Array<{ id: string; label: string }>;
}

export function EmployeesClient({
  employees,
  taxRegime,
  cltParams,
  openRegisters,
}: EmployeesClientProps) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [competenceMonth, setCompetenceMonth] = useState(currentMonth);
  const [contractType, setContractType] = useState<'clt' | 'non_clt'>('clt');
  const [salaryInput, setSalaryInput] = useState('2200');
  const [vtInput, setVtInput] = useState('180');
  const [vaInput, setVaInput] = useState('350');
  const [otherInput, setOtherInput] = useState('0');

  const [diaristaModalEmp, setDiaristaModalEmp] = useState<EmployeeRow | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'warning'; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

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
    <div className="space-y-8">
      {feedback && (
        <Alert tone={feedback.tone} title="Gestão de Equipe">
          {feedback.text}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Form: Cadastrar Colaborador */}
        <div className="lg:col-span-6">
          <Card
            title="Cadastrar Colaborador"
            subtitle="Registre colaboradores fixos pela CLT ou diaristas de apoio."
          >
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                startTransition(async () => {
                  const res = await createEmployeeAction(fd);
                  if (res.error) setFeedback({ tone: 'warning', text: res.error });
                  else setFeedback({ tone: 'success', text: 'Colaborador cadastrado com sucesso.' });
                });
              }}
            >
              <Input
                name="full_name"
                label="Nome Completo"
                placeholder="Ex: Maria Souza"
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
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
                    { value: 'clt', label: 'CLT (Carteira Assinada)' },
                    { value: 'non_clt', label: 'Não CLT (Diarista ou Prestador)' },
                  ]}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="document_cpf" label="CPF (opcional)" placeholder="000.000.000-00" />
                <Input name="phone" label="Telefone / WhatsApp" placeholder="(00) 90000-0000" />
              </div>

              {contractType === 'clt' ? (
                <div className="space-y-4 rounded-md bg-canvas-soft p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      name="base_salary_monthly"
                      type="number"
                      step="0.01"
                      min="0"
                      label="Salário Base Bruto (R$)"
                      value={salaryInput}
                      onChange={(e) => setSalaryInput(e.target.value)}
                      required
                    />
                    <Input
                      name="transport_allowance_monthly"
                      type="number"
                      step="0.01"
                      min="0"
                      label="Vale Transporte Total (R$)"
                      value={vtInput}
                      onChange={(e) => setVtInput(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
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
                </div>
              ) : (
                <Input
                  name="daily_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue="120.00"
                  label="Valor da Diária Combinada (R$)"
                  required
                />
              )}

              <Button type="submit" variant="primary" fullWidth disabled={isPending}>
                <Plus className="h-4 w-4" />
                Salvar Colaborador
              </Button>
            </form>
          </Card>
        </div>

        {/* Live Parameterized CLT Accounting Guide */}
        <div className="lg:col-span-6">
          {contractType === 'clt' && !cltParams ? (
            <Alert tone="warning" title="Parâmetros tributários CLT não configurados">
              Cadastre ou valide a chave clt_tributos_vigentes em Administração (parametros_web) para exibir os cálculos automáticos da CLT.
            </Alert>
          ) : contractType === 'clt' && liveBreakdown && cltParams ? (
            <Card
              variant="elevated"
              title="Demonstrativo Contábil CLT Parametrizado"
              subtitle={`Regime tributário ativo: ${taxRegime}`}
              helpTitle="Como ler os Custos da CLT"
              helpText="Todos os percentuais abaixo vêm da tabela parametros_web. As obrigações mensais representam as guias e pagamentos que saem todo mês, enquanto as provisões de décimo terceiro e férias indicam quanto reservar por mês para não apertar seu caixa no fim do ano."
            >
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md bg-canvas-soft p-3">
                    <span className="typo-caption text-ink-muted">Saída Mensal (Folha + Guias)</span>
                    <p className="typo-heading-3 text-ink">
                      {formatBRL(liveBreakdown.monthlyCashOutflowTotal)}
                    </p>
                  </div>
                  <div className="rounded-md bg-canvas-soft p-3">
                    <span className="typo-caption text-ink-muted">
                      Reserva Recomendada (13º e Férias)
                    </span>
                    <p className="typo-heading-3 text-primary">
                      {formatBRL(liveBreakdown.monthlyProvisionsTotal)}
                    </p>
                  </div>
                </div>

                <Accordion title="1. O que pagar e cadastrar todo mês (Obrigações)" defaultOpen>
                  <ul className="space-y-2 typo-body-sm">
                    <li className="flex justify-between">
                      <span>Salário Líquido ao Funcionário (dia {cltParams.dueDays.salaryDay}):</span>
                      <strong>{formatBRL(liveBreakdown.netSalaryToEmployee)}</strong>
                    </li>
                    <li className="flex justify-between text-ink-muted">
                      <span>INSS retido do empregado na folha:</span>
                      <span>{formatBRL(liveBreakdown.employeeInssWithheld)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Guia FGTS ({cltParams.fgtsRate}%, vence dia {cltParams.dueDays.fgtsDay}):</span>
                      <strong>{formatBRL(liveBreakdown.fgtsMonthly)}</strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Guia Previdenciária INSS/IRRF (vence dia {cltParams.dueDays.inssDay}):</span>
                      <strong>{formatBRL(liveBreakdown.inssGuideTotal)}</strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Custo Líquido de Benefícios (VT/VA descontada cota {cltParams.vtEmployeeCapPercent}%):</span>
                      <strong>{formatBRL(liveBreakdown.employerBenefitsNetCost)}</strong>
                    </li>
                  </ul>
                </Accordion>

                <Accordion title="2. O que guardar todo mês (Provisões Trabalhistas)" defaultOpen>
                  <ul className="space-y-2 typo-body-sm">
                    <li className="flex justify-between">
                      <span>Provisão Mensal 13º Salário + Encargos:</span>
                      <strong>{formatBRL(liveBreakdown.provision13thTotal)}</strong>
                    </li>
                    <li className="flex justify-between">
                      <span>Provisão Mensal Férias + 1/3 Constitucional + Encargos:</span>
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
          ) : (
            <Card
              variant="soft"
              title="Prestadores e Diaristas (Não CLT)"
              subtitle="Ideal para reforço de fim de semana, feriados, músicos ou equipe extra."
            >
              <p className="typo-body-sm text-ink-secondary">
                Colaboradores cadastrados como Não CLT possuem valor de diária configurável. Na tabela abaixo, você pode lançar rapidamente os dias trabalhados gerando uma Despesa Variável já integrada ao seu painel financeiro ou paga direto pelo caixa aberto.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Employee Directory & One-Click Payroll / Diária Actions */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="typo-title text-ink">Equipe Cadastrada ({employees.length})</h2>
          <div className="w-52">
            <Input
              type="month"
              label="Competência Folha CLT"
              value={competenceMonth}
              onChange={(e) => setCompetenceMonth(e.target.value)}
            />
          </div>
        </div>

        <ResponsiveDataTable
          keyExtractor={(r) => r.id}
          emptyMessage="Nenhum funcionário ou diarista cadastrado ainda."
          data={employees}
          columns={[
            {
              key: 'nome',
              header: 'Colaborador',
              render: (r) => (
                <div>
                  <p className="font-semibold">{r.full_name}</p>
                  <span className="typo-caption text-ink-muted">{r.role_title}</span>
                </div>
              ),
            },
            {
              key: 'vinculo',
              header: 'Regime',
              render: (r) =>
                r.contract_type === 'clt' ? (
                  <Badge sticker="purple">CLT Mensalista</Badge>
                ) : (
                  <Badge sticker="pink">Não CLT / Diarista</Badge>
                ),
            },
            {
              key: 'remuneracao',
              header: 'Base',
              align: 'right',
              render: (r) =>
                r.contract_type === 'clt'
                  ? `${formatBRL(r.base_salary_monthly)} / mês`
                  : `${formatBRL(r.daily_rate)} / diária`,
            },
            {
              key: 'acao',
              header: 'Integração Financeira',
              align: 'right',
              render: (r) =>
                r.contract_type === 'clt' ? (
                  <Button
                    size="sm"
                    variant="utility"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        const res = await generateCltMonthlyExpensesAction(r.id, competenceMonth);
                        if (res.error) setFeedback({ tone: 'warning', text: res.error });
                        else {
                          setFeedback({
                            tone: 'success',
                            text: `${res.insertedCount} títulos e reservas de ${competenceMonth} gerados nas Despesas para ${r.full_name}.`,
                          });
                        }
                      });
                    }}
                  >
                    Gerar Obrigações ({competenceMonth})
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setDiaristaModalEmp(r)}
                  >
                    Lançar Diária
                  </Button>
                ),
            },
          ]}
        />
      </section>

      {/* Modal: Lançar Diária Não-CLT */}
      <Modal
        open={Boolean(diaristaModalEmp)}
        onClose={() => setDiaristaModalEmp(null)}
        title={`Lançar Diária: ${diaristaModalEmp?.full_name ?? ''}`}
      >
        <form
          className="space-y-4"
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
                  text: 'Diária lançada como Despesa Variável com sucesso.',
                });
                setDiaristaModalEmp(null);
              }
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="days_worked"
              type="number"
              step="0.5"
              min="0.5"
              defaultValue="1"
              label="Quantidade de Diárias"
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
          </div>

          <Select
            name="pay_now"
            label="Status do Pagamento"
            options={[
              { value: 'true', label: 'Pago hoje' },
              { value: 'false', label: 'Deixar pendente em Contas a Pagar' },
            ]}
          />

          <Select
            name="cash_register_id"
            label="Forma de Saída (se pago hoje)"
            options={[
              { value: '', label: 'PIX ou Conta Bancária da Empresa' },
              ...openRegisters.map((reg) => ({
                value: reg.id,
                label: `Dinheiro da Gaveta: ${reg.label}`,
              })),
            ]}
          />

          <div className="flex justify-end gap-2">
            <Button variant="utility" onClick={() => setDiaristaModalEmp(null)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              Confirmar Lançamento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
