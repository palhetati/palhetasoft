'use client';

import React, { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { Ban, CheckCircle2, Plus } from 'lucide-react';
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
  TruncatedText,
} from '@/components/ui';
import {
  humanizeExpenseClassification,
  humanizeExpenseStatus,
} from '@/lib/domain-labels';
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [initialLoading, setInitialLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const requestRef = useRef(0);

  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [openRegisters, setOpenRegisters] = useState<Array<{ id: string; label: string }>>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [payNow, setPayNow] = useState(false);
  const [payMethod, setPayMethod] = useState('pix');

  const [settleExpense, setSettleExpense] = useState<ExpenseRow | null>(null);
  const [settleMethod, setSettleMethod] = useState('pix');
  const [settleRegisterId, setSettleRegisterId] = useState('');
  const [settleError, setSettleError] = useState<string | null>(null);

  const [cancelTarget, setCancelTarget] = useState<ExpenseRow | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{ tone: 'success' | 'warning'; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadAuxData = useCallback(async () => {
    if (!establishmentId) {
      setInitialLoading(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const [{ data: catData }, { data: regData }] = await Promise.all([
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

    setCategories(catData ?? []);
    setOpenRegisters(
      (regData ?? []).map((r: Record<string, unknown>) => {
        const pt = r.register_points as { name?: string } | null;
        return {
          id: String(r.id),
          label: pt?.name ?? 'Caixa aberto',
        };
      })
    );
    setInitialLoading(false);
  }, [establishmentId]);

  const loadExpenses = useCallback(
    async (targetPage: number) => {
      if (!establishmentId) {
        setListLoading(false);
        return;
      }

      const reqId = ++requestRef.current;
      setListLoading(true);
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

      if (statusFilter === 'pending') {
        query = query.eq('status', 'pending');
      }

      if (debouncedSearch) {
        query = query.ilike('description', `%${debouncedSearch}%`);
      }

      const { data: expData, count } = await query
        .order('due_date', { ascending: false })
        .range(from, to);

      if (reqId !== requestRef.current) return;

      setExpenses(
        ((expData ?? []) as ExpenseRow[]).map((e) => ({
          ...e,
          amount: Number(e.amount),
        }))
      );
      setTotalCount(count ?? 0);
      setListLoading(false);
    },
    [establishmentId, filterType, statusFilter, debouncedSearch]
  );

  useEffect(() => {
    void loadAuxData();
  }, [loadAuxData]);

  useEffect(() => {
    void loadExpenses(page);
  }, [loadExpenses, page]);

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <Card variant="flat" className="flex flex-col gap-5">
      <PageHeader
        title={title}
        subtitle="Controle contas fixas, gastos variáveis e reservas trabalhistas."
        helpTitle={helpTitle}
        helpText={helpText}
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setModalError(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nova despesa
          </Button>
        }
      />

      {feedback && (
        <Alert tone={feedback.tone} title="Atualização financeira">
          {feedback.text}
        </Alert>
      )}

      {initialLoading ? (
        <LoadingState label="Carregando..." />
      ) : (
        <div className="flex flex-col gap-5">
          <Card variant="soft" title="Filtros">
            <div className="flex flex-col gap-4">
              <Input
                type="search"
                aria-label="Buscar despesa pela descrição"
                placeholder="Buscar despesa pela descrição"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <ChoiceChips
                  ariaLabel="Filtrar por tipo de despesa"
                  value={filterType}
                  onChange={(next) => {
                    setPage(1);
                    setFilterType(next);
                  }}
                  options={[
                    { value: 'all', label: 'Todas' },
                    { value: 'fixed', label: 'Fixas' },
                    { value: 'variable', label: 'Variáveis' },
                    { value: 'provisions', label: 'Reservas trabalhistas' },
                  ]}
                />

                <ChoiceChips
                  ariaLabel="Filtrar por situação"
                  value={statusFilter}
                  onChange={(next) => {
                    setPage(1);
                    setStatusFilter(next);
                  }}
                  options={[
                    { value: 'all', label: 'Todas as situações' },
                    { value: 'pending', label: 'Somente pendentes' },
                  ]}
                />
              </div>
            </div>
          </Card>

          <Card
            variant="flat"
            title="Relação de despesas"
            headerAction={
              <span className="typo-caption text-ink-muted">{totalCount} itens</span>
            }
          >
            <ResponsiveDataTable
              keyExtractor={(row) => row.id}
              loading={listLoading}
              emptyMessage="Nenhuma despesa encontrada para este filtro."
              data={expenses}
              pagination={{
                mode: 'numbered',
                page,
                pageSize: PAGE_SIZE,
                totalCount,
                loading: listLoading,
                onPageChange: (next) => setPage(next),
              }}
              columns={[
                {
                  key: 'desc',
                  header: 'Descrição',
                  render: (r) => (
                    <TruncatedText text={r.description} maxWidthClass="max-w-[240px]" />
                  ),
                },
                {
                  key: 'tipo',
                  header: 'Classificação',
                  render: (r) => (
                    <Badge
                      sticker={
                        r.is_provision ? 'teal' : r.expense_type === 'fixed' ? 'purple' : 'orange'
                      }
                    >
                      {humanizeExpenseClassification(r.expense_type, r.is_provision)}
                    </Badge>
                  ),
                },
                { key: 'venc', header: 'Vencimento', render: (r) => formatDateBR(r.due_date) },
                {
                  key: 'status',
                  header: 'Situação',
                  render: (r) => (
                    <Badge sticker={r.status === 'paid' ? 'green' : 'orange'}>
                      {humanizeExpenseStatus(r.status)}
                    </Badge>
                  ),
                },
                {
                  key: 'valor',
                  header: 'Valor',
                  align: 'right',
                  render: (r) => <span className="tabular-nums">{formatBRL(r.amount)}</span>,
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
                              setSettleError(null);
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
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova despesa">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setModalError(null);
            const fd = new FormData(e.currentTarget);
            fd.set('pay_now', payNow ? 'true' : 'false');
            startTransition(async () => {
              const res = await createExpenseAction(fd);
              if (res.error) {
                setModalError(res.error);
              } else {
                setFeedback({ tone: 'success', text: 'Despesa salva com sucesso.' });
                setModalOpen(false);
                setPage(1);
                await loadExpenses(1);
              }
            });
          }}
        >
          {modalError && (
            <Alert tone="warning" title="Não foi possível salvar">
              {modalError}
            </Alert>
          )}

          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
            <Input
              name="description"
              label="Descrição"
              placeholder="Ex: Conta de energia ou compra de gelo"
              containerClassName="col-span-full"
              required
            />

            <Select
              name="expense_type"
              label="Tipo de despesa"
              options={[
                { value: 'fixed', label: 'Despesa fixa' },
                { value: 'variable', label: 'Despesa variável' },
              ]}
            />

            <Select
              name="category_id"
              label="Categoria"
              options={[
                { value: '', label: 'Geral' },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />

            <Input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              label="Valor (R$)"
              required
            />

            <Input
              name="due_date"
              type="date"
              label="Vencimento"
              defaultValue={todayStr}
              required
            />
          </div>

          <div className="flex flex-col gap-2 border-t border-hairline pt-3">
            <span className="typo-caption font-medium text-ink-secondary">
              Situação do pagamento
            </span>
            <ChoiceChips
              ariaLabel="Situação do pagamento"
              value={payNow ? 'paid' : 'pending'}
              onChange={(val) => setPayNow(val === 'paid')}
              options={[
                { value: 'pending', label: 'Pendente (contas a pagar)' },
                { value: 'paid', label: 'Já está paga agora' },
              ]}
            />
          </div>

          {payNow && (
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
              <Select
                name="payment_method"
                label="Meio de pagamento"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                options={[
                  { value: 'pix', label: 'PIX ou conta bancária' },
                  { value: 'cash', label: 'Dinheiro físico' },
                  { value: 'debit_card', label: 'Cartão de débito' },
                ]}
              />

              {payMethod === 'cash' && (
                <Select
                  name="cash_register_id"
                  label="Retirar de qual caixa aberto?"
                  options={[
                    { value: '', label: 'Cofre externo (sem mexer na gaveta)' },
                    ...openRegisters.map((r) => ({ value: r.id, label: r.label })),
                  ]}
                />
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button variant="utility" disabled={isPending} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isPending}
              loadingText="Salvando..."
            >
              Salvar despesa
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(settleExpense)}
        onClose={() => setSettleExpense(null)}
        title={`Registrar o pagamento de "${settleExpense?.description ?? ''}"?`}
        description={`O valor de ${formatBRL(settleExpense?.amount ?? 0)} entrará como despesa paga no caixa real do período.`}
        tone="primary"
        confirmLabel="Registrar pagamento"
        loadingLabel="Salvando..."
        loading={isPending}
        errorMessage={settleError}
        onConfirm={() => {
          if (!settleExpense) return;
          startTransition(async () => {
            const res = await markExpensePaidAction(
              settleExpense.id,
              settleMethod,
              settleMethod === 'cash' ? settleRegisterId || null : null
            );
            if (res.error) setSettleError(res.error);
            else {
              setFeedback({ tone: 'success', text: 'Despesa marcada como paga.' });
              setSettleExpense(null);
              await Promise.all([loadAuxData(), loadExpenses(page)]);
            }
          });
        }}
      >
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
          <Select
            label="Forma de pagamento usada"
            value={settleMethod}
            onChange={(e) => setSettleMethod(e.target.value)}
            containerClassName="col-span-full"
            options={[
              { value: 'pix', label: 'PIX ou conta bancária' },
              { value: 'cash', label: 'Dinheiro em espécie' },
              { value: 'debit_card', label: 'Cartão de débito' },
            ]}
          />

          {settleMethod === 'cash' && (
            <Select
              label="Retirar de qual caixa aberto?"
              value={settleRegisterId}
              onChange={(e) => setSettleRegisterId(e.target.value)}
              containerClassName="col-span-full"
              options={[
                { value: '', label: 'Cofre externo (sem mexer na gaveta)' },
                ...openRegisters.map((reg) => ({ value: reg.id, label: reg.label })),
              ]}
            />
          )}
        </div>
      </ConfirmModal>

      <ConfirmModal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title={`Cancelar a despesa "${cancelTarget?.description ?? ''}"?`}
        description={
          cancelTarget
            ? `Esta conta de ${formatBRL(cancelTarget.amount)} sairá da lista de despesas pendentes.`
            : ''
        }
        confirmLabel="Cancelar despesa"
        loadingLabel="Cancelando..."
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
