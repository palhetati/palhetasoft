'use client';

import React, { useCallback, useEffect, useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import {
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
  Select,
} from '@/components/ui';
import { formatBRL, formatDateBR } from '@/lib/formatters';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  closeCashRegisterAction,
  createRegisterPointAction,
  openCashRegisterAction,
  recordDrawerMovementAction,
} from '@/modules/cash-register/actions';
import {
  calculateDrawerExpectedCash,
  type CashMovementInput,
} from '@/modules/cash-register/reconciliation';

export interface OpenRegisterView {
  id: string;
  pointName: string;
  openingBalance: number;
  expectedPhysicalCash: number;
  nonCashBreakdown: Record<string, number>;
  openedAt: string;
}

export interface ClosedRegisterView {
  id: string;
  pointName: string;
  expectedCash: number;
  declaredCash: number;
  difference: number;
  closedAt: string;
}

export interface CaixaClientProps {
  establishmentId: string | null;
  title: string;
  helpTitle: string;
  helpText: string;
}

const PAGE_SIZE = 10;

export function CaixaClient({
  establishmentId,
  title,
  helpTitle,
  helpText,
}: CaixaClientProps) {
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<Array<{ id: string; name: string }>>([]);
  const [openRegisters, setOpenRegisters] = useState<OpenRegisterView[]>([]);
  const [closedHistory, setClosedHistory] = useState<ClosedRegisterView[]>([]);
  const [page, setPage] = useState(1);
  const [totalClosed, setTotalClosed] = useState(0);

  const [pointModal, setPointModal] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [movementModalRegId, setMovementModalRegId] = useState<string | null>(null);
  const [closeModalReg, setCloseModalReg] = useState<OpenRegisterView | null>(null);
  const [declaredCashInput, setDeclaredCashInput] = useState('0');
  const [closeNotesInput, setCloseNotesInput] = useState('');
  const [closeError, setCloseError] = useState<string | null>(null);

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

      const [{ data: pts }, { data: openRows }, { data: closedRows, count }] = await Promise.all([
        supabase
          .from('register_points')
          .select('id, name')
          .eq('establishment_id', establishmentId)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('cash_registers')
          .select(
            'id, opening_balance, opened_at, register_points(name), cash_movements(movement_type, payment_method, amount)'
          )
          .eq('establishment_id', establishmentId)
          .eq('status', 'open')
          .order('opened_at', { ascending: false }),
        supabase
          .from('cash_registers')
          .select(
            'id, closing_cash_expected, closing_cash_declared, cash_difference_amount, closed_at, register_points(name)',
            { count: 'exact' }
          )
          .eq('establishment_id', establishmentId)
          .eq('status', 'closed')
          .order('closed_at', { ascending: false })
          .range(from, to),
      ]);

      setPoints(pts ?? []);

      setOpenRegisters(
        (openRows ?? []).map((row: Record<string, unknown>) => {
          const point = row.register_points as { name?: string } | null;
          const movements = ((row.cash_movements as CashMovementInput[]) ?? []).map((m) => ({
            ...m,
            amount: Number(m.amount),
          }));
          const recon = calculateDrawerExpectedCash(Number(row.opening_balance), movements);
          return {
            id: String(row.id),
            pointName: point?.name ?? 'Caixa',
            openingBalance: Number(row.opening_balance),
            expectedPhysicalCash: recon.expectedPhysicalCash,
            nonCashBreakdown: recon.nonCashBreakdown,
            openedAt: String(row.opened_at),
          };
        })
      );

      setClosedHistory(
        (closedRows ?? []).map((row: Record<string, unknown>) => {
          const point = row.register_points as { name?: string } | null;
          return {
            id: String(row.id),
            pointName: point?.name ?? 'Caixa',
            expectedCash: Number(row.closing_cash_expected ?? 0),
            declaredCash: Number(row.closing_cash_declared ?? 0),
            difference: Number(row.cash_difference_amount ?? 0),
            closedAt: String(row.closed_at ?? ''),
          };
        })
      );
      setTotalClosed(count ?? 0);
      setLoading(false);
    },
    [establishmentId]
  );

  useEffect(() => {
    void loadData(page);
  }, [loadData, page]);

  return (
    <Card variant="flat" className="flex flex-col gap-5">
      <PageHeader
        title={title}
        subtitle="Gerencie múltiplos pontos de caixa abertos ao mesmo tempo com conferência de gaveta."
        helpTitle={helpTitle}
        helpText={helpText}
        actions={
          <>
            <Button variant="utility" onClick={() => setPointModal(true)}>
              Novo Ponto de Caixa
            </Button>
            <Button variant="primary" onClick={() => setOpenModal(true)}>
              <Plus className="h-4 w-4" />
              Abrir Turno de Caixa
            </Button>
          </>
        }
      />

      {feedback && (
        <Alert tone={feedback.tone} title="Movimentação de caixa">
          {feedback.text}
        </Alert>
      )}

      {/* Seção de Caixas Abertos empilhados em flex-col */}
      <Card variant="soft" title={`Caixas Abertos Agora (${openRegisters.length})`}>
        {loading ? (
          <LoadingState label="Carregando..." />
        ) : openRegisters.length === 0 ? (
          <p className="typo-body-md py-4 text-ink-muted">
            Nenhum turno de caixa aberto no momento. Clique em Abrir Turno de Caixa para iniciar o atendimento.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {openRegisters.map((reg) => (
              <Card
                key={reg.id}
                variant="flat"
                title={reg.pointName}
                subtitle={`Aberto em ${formatDateBR(reg.openedAt)}`}
                helpTitle="Conferência Física da Gaveta"
                helpText="O saldo esperado na gaveta soma apenas o dinheiro vivo de troco inicial, vendas em espécie e suprimentos, descontando sangrias e despesas pagas em dinheiro. PIX e Cartões ficam separados abaixo."
                headerAction={<Badge sticker="green">Turno Aberto</Badge>}
              >
                <div className="flex flex-col gap-3">
                  <div className="rounded-md bg-canvas-soft p-3">
                    <span className="typo-caption text-ink-muted">
                      Dinheiro Físico Esperado na Gaveta
                    </span>
                    <p className="typo-heading-2 text-ink">
                      {formatBRL(reg.expectedPhysicalCash)}
                    </p>
                    <span className="typo-caption text-ink-faint">
                      Fundo inicial: {formatBRL(reg.openingBalance)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 typo-body-sm">
                    <span>
                      PIX no turno: <strong>{formatBRL(reg.nonCashBreakdown.pix ?? 0)}</strong>
                    </span>
                    <span>
                      Cartão de Débito:{' '}
                      <strong>{formatBRL(reg.nonCashBreakdown.debit_card ?? 0)}</strong>
                    </span>
                    <span>
                      Cartão de Crédito:{' '}
                      <strong>{formatBRL(reg.nonCashBreakdown.credit_card ?? 0)}</strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="utility"
                      onClick={() => setMovementModalRegId(reg.id)}
                    >
                      Suprimento ou Sangria
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setDeclaredCashInput(reg.expectedPhysicalCash.toFixed(2));
                        setCloseNotesInput('');
                        setCloseError(null);
                        setCloseModalReg(reg);
                      }}
                    >
                      Fechar Caixa
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Histórico Paginado no Backend */}
      <Card variant="flat" title="Histórico de Fechamentos">
        <ResponsiveDataTable
          keyExtractor={(r) => r.id}
          loading={loading}
          emptyMessage="Nenhum caixa encerrado ainda."
          data={closedHistory}
          pagination={{
            mode: 'numbered',
            page,
            pageSize: PAGE_SIZE,
            totalCount: totalClosed,
            loading,
            onPageChange: (next) => setPage(next),
          }}
          columns={[
            { key: 'ponto', header: 'Ponto de Caixa', render: (r) => r.pointName },
            { key: 'data', header: 'Fechado em', render: (r) => formatDateBR(r.closedAt) },
            {
              key: 'esp',
              header: 'Esperado em Espécie',
              align: 'right',
              render: (r) => formatBRL(r.expectedCash),
            },
            {
              key: 'dec',
              header: 'Contado na Gaveta',
              align: 'right',
              render: (r) => formatBRL(r.declaredCash),
            },
            {
              key: 'dif',
              header: 'Diferença',
              align: 'right',
              render: (r) => (
                <Badge sticker={r.difference === 0 ? 'green' : 'orange'}>
                  {formatBRL(r.difference)}
                </Badge>
              ),
            },
          ]}
        />
      </Card>

      {/* Modal: Novo Ponto de Caixa */}
      <Modal open={pointModal} onClose={() => setPointModal(false)} title="Novo Ponto de Caixa">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await createRegisterPointAction(fd);
              if (res.error) setFeedback({ tone: 'warning', text: res.error });
              else {
                setFeedback({ tone: 'success', text: 'Ponto de caixa criado com sucesso.' });
                setPointModal(false);
                await loadData(page);
              }
            });
          }}
        >
          <Input
            name="name"
            label="Nome do Ponto"
            placeholder="Ex: Caixa Portaria Principal"
            required
          />
          <Input
            name="location_note"
            label="Localização (opcional)"
            placeholder="Ex: Entrada do balneário"
          />
          <div className="flex justify-end gap-2">
            <Button variant="utility" disabled={isPending} onClick={() => setPointModal(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isPending}
              loadingText="Carregando..."
            >
              Criar Ponto
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Abrir Turno */}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Abrir Turno de Caixa">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await openCashRegisterAction(fd);
              if (res.error) setFeedback({ tone: 'warning', text: res.error });
              else {
                setFeedback({ tone: 'success', text: 'Turno aberto com sucesso.' });
                setOpenModal(false);
                await loadData(page);
              }
            });
          }}
        >
          <Select
            name="register_point_id"
            label="Ponto de Atendimento"
            options={points.map((p) => ({ value: p.id, label: p.name }))}
          />
          <Input
            name="opening_balance"
            type="number"
            step="0.01"
            min="0"
            defaultValue="100.00"
            label="Fundo de Troco Inicial em Dinheiro (R$)"
            required
          />
          <Input name="notes" label="Observação do Turno (opcional)" />
          <div className="flex justify-end gap-2">
            <Button variant="utility" disabled={isPending} onClick={() => setOpenModal(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isPending}
              loadingText="Carregando..."
            >
              Confirmar Abertura
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Suprimento ou Sangria */}
      <Modal
        open={Boolean(movementModalRegId)}
        onClose={() => setMovementModalRegId(null)}
        title="Registrar Suprimento ou Sangria"
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set('cash_register_id', movementModalRegId ?? '');
            startTransition(async () => {
              const res = await recordDrawerMovementAction(fd);
              if (res.error) setFeedback({ tone: 'warning', text: res.error });
              else {
                setFeedback({ tone: 'success', text: 'Movimentação registrada na gaveta.' });
                setMovementModalRegId(null);
                await loadData(page);
              }
            });
          }}
        >
          <Select
            name="movement_type"
            label="Tipo de Operação"
            options={[
              { value: 'supply_inflow', label: 'Suprimento (Entrada de troco na gaveta)' },
              { value: 'bleed_outflow', label: 'Sangria (Retirada de dinheiro para cofre)' },
            ]}
          />
          <Input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            label="Valor em Espécie (R$)"
            required
          />
          <Input
            name="description"
            label="Motivo"
            placeholder="Ex: Recolhimento parcial da tarde"
            required
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="utility"
              disabled={isPending}
              onClick={() => setMovementModalRegId(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isPending}
              loadingText="Carregando..."
            >
              Confirmar
            </Button>
          </div>
        </form>
      </Modal>

      {/* ConfirmModal Compartilhado para Fechamento de Caixa */}
      <ConfirmModal
        open={Boolean(closeModalReg)}
        onClose={() => setCloseModalReg(null)}
        title={`Encerrar o turno de ${closeModalReg?.pointName ?? 'Caixa'}?`}
        description="Conte as cédulas e moedas presentes fisicamente na gaveta e confirme o valor total abaixo para concluir o fechamento."
        tone="primary"
        confirmLabel="Encerrar Turno"
        loadingLabel="Carregando..."
        loading={isPending}
        errorMessage={closeError}
        onConfirm={() => {
          if (!closeModalReg) return;
          const fd = new FormData();
          fd.set('cash_register_id', closeModalReg.id);
          fd.set('declared_cash', declaredCashInput);
          fd.set('notes', closeNotesInput);
          startTransition(async () => {
            const res = await closeCashRegisterAction(fd);
            if (res.error) {
              setCloseError(res.error);
            } else {
              setFeedback({ tone: 'success', text: 'Caixa encerrado e conferido com sucesso.' });
              setCloseModalReg(null);
              await loadData(1);
            }
          });
        }}
      >
        <div className="flex flex-col gap-3">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={declaredCashInput}
            onChange={(e) => setDeclaredCashInput(e.target.value)}
            label="Total em Dinheiro Contado na Gaveta (R$)"
            required
          />
          <Input
            value={closeNotesInput}
            onChange={(e) => setCloseNotesInput(e.target.value)}
            label="Observações do Fechamento (opcional)"
          />
        </div>
      </ConfirmModal>
    </Card>
  );
}
