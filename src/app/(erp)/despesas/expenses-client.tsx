'use client';

import React, { useCallback, useEffect, useState, useTransition } from 'react';
import { Ban, CheckCircle2, Plus } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmModal,
  Input,
  Modal,
  PageHeader,
  ResponsiveDataTable,
  RowActions,
  Select,
} from '@/components/ui';
import { formatBRL, formatDateBR } from '@/lib/formatters';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  cancelExpenseAction,
  createExpenseAction,
  markExpensePaidAction,
} from '@/modules/expenses/actions';

export interface ExpenseRow {
  id: string;
  description: string;
  expense_type: 'fixed' | 'variable';
  is_provision: boolean;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'cancelled';
  payment_method: string | null;
}

export interface ExpensesClientProps {
  establishmentId: string | null;
  title: string;
  helpTitle: string;
  helpText: string;
}

const PAGE_SIZE = 10;

export function ExpensesClient({
  establishmentId,
  title,
  helpTitle,
  helpText,
}: ExpensesClientProps) {
  const [filterType, setFilterType] = useState<'all' | 'fixed' | 'variable' | 'provisions'>('all');
  const [onlyPending, setOnlyPending] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [openRegisters, setOpenRegisters] = useState<Array<{ id: string; label: string }>>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [payNow, setPayNow] = useState(false);
  const [payMethod, setPayMethod] = useState('pix');

  const [settleExpense, setSettleExpense] = useState<ExpenseRow | null>(null);
  const [settleMethod, setSettleMethod] = useState('pix');
  const [settleRegisterId, setSettleRegisterId] = useState('');

  const [cancelTarget, setCancelTarget] = useState<ExpenseRow | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{ tone: 'success' | 'warning'; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const loadExpenses = useCallback(
    async (targetPage: number) => {
      if (!establishmentId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const supabase = createSupabaseBrowserClient();
      const from = (targetPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('expenses')
        .select(
          'id, description, expense_type, is_provision, amount, due_date, status, payment_method',
          { count: 'exact' }
        )
        .eq('establishment_id', establishmentId)
        .neq('status', 'cancelled');

      if (filterType === 'provisions') {
        query = query.eq('is_provision', true);
      } else if (filterType === 'fixed') {
        query = query.eq('is_provision', false).eq('expense_type', 'fixed');
      } else if (filterType === 'variable') {
        query = query.eq('is_provision', false).eq('expense_type', 'variable');
      }

      if (onlyPending) {
        query = query.eq('status', 'pending');
      }

      const [{ data: expData, count }, { data: catData }, { data: regData }] = await Promise.all([
        query.order('due_date', { ascending: false }).range(from, to),
        supabase
          .from('financial_categories')
          .select('id, name')
          .eq('establishment_id', establishmentId)
          .neq('type', 'income')
          .order('name'),
        supabase
          .from('cash_registers')
          .select('id, register_points(name)')
          .eq('establishment_id', establishmentId)
          .eq('status', 'open'),
      ]);

      setExpenses(
        ((expData ?? []) as ExpenseRow[]).map((e) => ({
          ...e,
          amount: Number(e.amount),
        }))
      );
      setTotalCount(count ?? 0);
      setCategories(catData ?? []);
      setOpenRegisters(
        (regData ?? []).map((r: Record<string, unknown>) => {
          const pt = r.register_points as { name?: string } | null;
          return {
            id: String(r.id),
            label: pt?.name ?? 'Caixa em Operação',
          };
        })
      );
      setLoading(false);
    },
    [establishmentId, filterType, onlyPending]
  );

  useEffect(() => {
    void loadExpenses(page);
  }, [loadExpenses, page]);

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <Card variant="flat" className="flex flex-col gap-5">
      <PageHeader
        title={title}
        subtitle="Controle suas contas fixas, gastos variáveis e reservas trabalhistas."
        helpTitle={helpTitle}
        helpText={helpText}
        actions={
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova Despesa
          </Button>
        }
      />

      {feedback && (
        <Alert tone={feedback.tone} title="Atualização financeira">
          {feedback.text}
        </Alert>
      )}

      <Card variant="soft" title="Filtros de Consulta" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'Todas' },
              { key: 'fixed', label: 'Despesas Fixas' },
              { key: 'variable', label: 'Despesas Variáveis' },
              { key: 'provisions', label: 'Reservas Trabalhistas' },
            ].map((item) => (
              <Button
                key={item.key}
                size="sm"
                variant={filterType === item.key ? 'primary' : 'utility'}
                disabled={loading}
                onClick={() => {
                  setPage(1);
                  setFilterType(item.key as typeof filterType);
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>

          <Button
            size="sm"
            variant={onlyPending ? 'primary' : 'utility'}
            disabled={loading}
            onClick={() => {
              setPage(1);
              setOnlyPending((prev) => !prev);
            }}
          >
            Somente Pendentes
          </Button>
        </div>
      </Card>

      <Card variant="flat" title="Relação de Despesas">
        <ResponsiveDataTable
          keyExtractor={(row) => row.id}
          loading={loading}
          emptyMessage="Nenhuma despesa encontrada para este filtro."
          data={expenses}
          pagination={{
            mode: 'numbered',
            page,
            pageSize: PAGE_SIZE,
            totalCount,
            loading,
            onPageChange: (next) => setPage(next),
          }}
          columns={[
            { key: 'desc', header: 'Descrição', render: (r) => r.description },
            {
              key: 'tipo',
              header: 'Classificação',
              render: (r) =>
                r.is_provision ? (
                  <Badge sticker="teal">Reserva CLT</Badge>
                ) : r.expense_type === 'fixed' ? (
                  <Badge sticker="purple">Fixa</Badge>
                ) : (
                  <Badge sticker="orange">Variável</Badge>
                ),
            },
            { key: 'venc', header: 'Vencimento', render: (r) => formatDateBR(r.due_date) },
            {
              key: 'status',
              header: 'Situação',
              render: (r) => (
                <Badge sticker={r.status === 'paid' ? 'green' : 'orange'}>
                  {r.status === 'paid' ? 'Paga' : 'Pendente'}
                </Badge>
              ),
            },
            {
              key: 'valor',
              header: 'Valor',
              align: 'right',
              render: (r) => <span className="font-semibold">{formatBRL(r.amount)}</span>,
            },
            {
              key: 'acoes',
              header: 'Ações',
              align: 'right',
              render: (r) =>
                r.status === 'pending' ? (
                  <RowActions
                    actions={[
                      {
                        key: 'pay',
                        label: 'Registrar pagamento desta despesa',
                        icon: <CheckCircle2 className="h-4 w-4 text-accent-teal" />,
                        disabled: isPending,
                        onClick: () => {
                          setSettleMethod('pix');
                          setSettleRegisterId('');
                          setSettleExpense(r);
                        },
                      },
                      {
                        key: 'cancel',
                        label: 'Cancelar despesa pendente',
                        icon: <Ban className="h-4 w-4" />,
                        tone: 'danger',
                        disabled: isPending,
                        onClick: () => {
                          setCancelError(null);
                          setCancelTarget(r);
                        },
                      },
                    ]}
                  />
                ) : null,
            },
          ]}
        />
      </Card>

      {/* Modal de Cadastro */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Cadastrar Despesa">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set('pay_now', payNow ? 'true' : 'false');
            startTransition(async () => {
              const res = await createExpenseAction(fd);
              if (res.error) {
                setFeedback({ tone: 'warning', text: res.error });
              } else {
                setFeedback({ tone: 'success', text: 'Despesa registrada com sucesso.' });
                setModalOpen(false);
                await loadExpenses(1);
              }
            });
          }}
        >
          <Input
            name="description"
            label="Descrição da Despesa"
            placeholder="Ex: Conta de Energia ou Compra de Gelo"
            required
          />

          <Select
            name="expense_type"
            label="Tipo de Despesa"
            options={[
              { value: 'fixed', label: 'Despesa Fixa' },
              { value: 'variable', label: 'Despesa Variável' },
            ]}
          />

          <Select
            name="category_id"
            label="Categoria Financeira"
            options={[
              { value: '', label: 'Geral' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />

          <Input name="amount" type="number" step="0.01" min="0.01" label="Valor (R$)" required />
          <Input
            name="due_date"
            type="date"
            label="Data de Vencimento"
            defaultValue={todayStr}
            required
          />

          <Select
            name="pay_status_toggle"
            label="Situação do Pagamento"
            value={payNow ? 'paid' : 'pending'}
            onChange={(e) => setPayNow(e.target.value === 'paid')}
            options={[
              { value: 'pending', label: 'Pendente (Contas a pagar)' },
              { value: 'paid', label: 'Já está paga agora' },
            ]}
          />

          {payNow && (
            <div className="flex flex-col gap-3">
              <Select
                name="payment_method"
                label="Meio de Pagamento"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                options={[
                  { value: 'pix', label: 'PIX ou Transferência Bancária' },
                  { value: 'cash', label: 'Dinheiro Físico' },
                  { value: 'debit_card', label: 'Cartão de Débito' },
                ]}
              />

              {payMethod === 'cash' && (
                <Select
                  name="cash_register_id"
                  label="Retirar de qual Caixa aberto?"
                  options={[
                    { value: '', label: 'Cofre externo (sem mexer na gaveta)' },
                    ...openRegisters.map((r) => ({ value: r.id, label: r.label })),
                  ]}
                />
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="utility" disabled={isPending} onClick={() => setModalOpen(false)}>
              Fechar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isPending}
              loadingText="Carregando..."
            >
              Salvar Despesa
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Baixa de Pagamento */}
      <ConfirmModal
        open={Boolean(settleExpense)}
        onClose={() => setSettleExpense(null)}
        title={`Confirmar pagamento de "${settleExpense?.description ?? ''}"?`}
        description={`O valor de ${formatBRL(settleExpense?.amount ?? 0)} passará a constar como pago no seu caixa real.`}
        tone="primary"
        confirmLabel="Confirmar Pagamento"
        loadingLabel="Carregando..."
        loading={isPending}
        onConfirm={() => {
          if (!settleExpense) return;
          startTransition(async () => {
            const res = await markExpensePaidAction(
              settleExpense.id,
              settleMethod,
              settleMethod === 'cash' ? settleRegisterId || null : null
            );
            if (res.error) setFeedback({ tone: 'warning', text: res.error });
            else {
              setFeedback({ tone: 'success', text: 'Despesa marcada como paga.' });
              setSettleExpense(null);
              await loadExpenses(page);
            }
          });
        }}
      >
        <div className="flex flex-col gap-3">
          <Select
            label="Forma de Pagamento Utilizada"
            value={settleMethod}
            onChange={(e) => setSettleMethod(e.target.value)}
            options={[
              { value: 'pix', label: 'PIX ou Conta Bancária' },
              { value: 'cash', label: 'Dinheiro em Espécie' },
              { value: 'debit_card', label: 'Cartão de Débito' },
            ]}
          />

          {settleMethod === 'cash' && (
            <Select
              label="Retirar de qual Caixa aberto?"
              value={settleRegisterId}
              onChange={(e) => setSettleRegisterId(e.target.value)}
              options={[
                { value: '', label: 'Cofre externo (sem mexer na gaveta)' },
                ...openRegisters.map((reg) => ({ value: reg.id, label: reg.label })),
              ]}
            />
          )}
        </div>
      </ConfirmModal>

      {/* Modal Compartilhado de Confirmação de Cancelamento */}
      <ConfirmModal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Deseja cancelar esta despesa?"
        description={
          cancelTarget
            ? `A despesa "${cancelTarget.description}" no valor de ${formatBRL(cancelTarget.amount)} deixará de aparecer nas contas pendentes.`
            : ''
        }
        confirmLabel="Cancelar Despesa"
        loadingLabel="Carregando..."
        loading={isPending}
        errorMessage={cancelError}
        onConfirm={() => {
          if (!cancelTarget) return;
          startTransition(async () => {
            const res = await cancelExpenseAction(cancelTarget.id);
            if (res?.error) {
              setCancelError(res.error);
            } else {
              setCancelTarget(null);
              setFeedback({ tone: 'success', text: 'Despesa cancelada com sucesso.' });
              await loadExpenses(page);
            }
          });
        }}
      />
    </Card>
  );
}
