'use client';

import React, { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Input,
  Modal,
  ResponsiveDataTable,
  Select,
} from '@/components/ui';
import { formatBRL, formatDateBR } from '@/lib/formatters';
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
  expenses: ExpenseRow[];
  categories: Array<{ id: string; name: string; type: string }>;
  openRegisters: Array<{ id: string; label: string }>;
}

export function ExpensesClient({
  expenses,
  categories,
  openRegisters,
}: ExpensesClientProps) {
  const [filterType, setFilterType] = useState<'all' | 'fixed' | 'variable' | 'provisions'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [settleExpense, setSettleExpense] = useState<ExpenseRow | null>(null);
  const [settleMethod, setSettleMethod] = useState('pix');
  const [settleRegisterId, setSettleRegisterId] = useState('');
  const [payNow, setPayNow] = useState(false);
  const [payMethod, setPayMethod] = useState('pix');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'warning'; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const filtered = expenses.filter((e) => {
    if (e.status === 'cancelled') return false;
    if (filterType === 'provisions' && !e.is_provision) return false;
    if (filterType === 'fixed' && (e.is_provision || e.expense_type !== 'fixed')) return false;
    if (filterType === 'variable' && (e.is_provision || e.expense_type !== 'variable')) return false;
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    return true;
  });

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={filterType === 'all' ? 'primary' : 'utility'}
            onClick={() => setFilterType('all')}
          >
            Todas
          </Button>
          <Button
            size="sm"
            variant={filterType === 'fixed' ? 'primary' : 'utility'}
            onClick={() => setFilterType('fixed')}
          >
            Fixas
          </Button>
          <Button
            size="sm"
            variant={filterType === 'variable' ? 'primary' : 'utility'}
            onClick={() => setFilterType('variable')}
          >
            Variáveis
          </Button>
          <Button
            size="sm"
            variant={filterType === 'provisions' ? 'primary' : 'utility'}
            onClick={() => setFilterType('provisions')}
          >
            Reservas CLT
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={filterStatus === 'pending' ? 'primary' : 'utility'}
            onClick={() => setFilterStatus(filterStatus === 'pending' ? 'all' : 'pending')}
          >
            Apenas Pendentes
          </Button>
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova Despesa
          </Button>
        </div>
      </div>

      {feedback && (
        <Alert tone={feedback.tone} title="Atualização financeira">
          {feedback.text}
        </Alert>
      )}

      <ResponsiveDataTable
        keyExtractor={(row) => row.id}
        emptyMessage="Nenhuma despesa encontrada para este filtro."
        data={filtered}
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
            header: 'Status',
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
            render: (r) => (
              <div className="flex flex-wrap justify-end gap-1.5">
                {r.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="utility"
                    disabled={isPending}
                    onClick={() => {
                      setSettleMethod('pix');
                      setSettleRegisterId('');
                      setSettleExpense(r);
                    }}
                  >
                    Dar Baixa
                  </Button>
                )}
                {r.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="danger-utility"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        const res = await cancelExpenseAction(r.id);
                        if (res?.error) setFeedback({ tone: 'warning', text: res.error });
                      });
                    }}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Cadastrar Despesa">
        <form
          className="space-y-4"
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

          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              label="Valor (R$)"
              required
            />
            <Input name="due_date" type="date" label="Data de Vencimento" defaultValue={todayStr} required />
          </div>

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
            <div className="grid gap-4 sm:grid-cols-2">
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
            <Button variant="utility" onClick={() => setModalOpen(false)}>
              Fechar
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              Salvar Despesa
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(settleExpense)}
        onClose={() => setSettleExpense(null)}
        title={`Dar Baixa: ${settleExpense?.description ?? ''}`}
      >
        <div className="space-y-4">
          <Select
            label="Meio de Pagamento Utilizado"
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

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="utility" onClick={() => setSettleExpense(null)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={isPending}
              onClick={() => {
                if (!settleExpense) return;
                startTransition(async () => {
                  const res = await markExpensePaidAction(
                    settleExpense.id,
                    settleMethod,
                    settleMethod === 'cash' ? settleRegisterId || null : null
                  );
                  if (res.error) setFeedback({ tone: 'warning', text: res.error });
                  else {
                    setFeedback({ tone: 'success', text: 'Despesa baixada como paga.' });
                    setSettleExpense(null);
                  }
                });
              }}
            >
              Confirmar Baixa ({formatBRL(settleExpense?.amount ?? 0)})
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
