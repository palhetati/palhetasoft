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
  TruncatedText,
} from '@/components/ui';
import { CASH_MOVEMENT_LABELS } from '@/lib/domain-labels';
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [points, setPoints] = useState<Array<{ id: string; name: string }>>([]);
  const [openRegisters, setOpenRegisters] = useState<OpenRegisterView[]>([]);
  const [closedHistory, setClosedHistory] = useState<ClosedRegisterView[]>([]);
  const [page, setPage] = useState(1);
  const [totalClosed, setTotalClosed] = useState(0);

  const [pointModal, setPointModal] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [movementModalRegId, setMovementModalRegId] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [closeModalReg, setCloseModalReg] = useState<OpenRegisterView | null>(null);
  const [declaredCashInput, setDeclaredCashInput] = useState('0');
  const [closeNotesInput, setCloseNotesInput] = useState('');
  const [closeError, setCloseError] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{ tone: 'success' | 'warning'; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const loadOpenAndPoints = useCallback(async () => {
    if (!establishmentId) {
      setInitialLoading(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const [{ data: pts }, { data: openRows }] = await Promise.all([
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
    setInitialLoading(false);
  }, [establishmentId]);

  const loadClosedHistory = useCallback(
    async (targetPage: number) => {
      if (!establishmentId) {
        setHistoryLoading(false);
        return;
      }

      setHistoryLoading(true);
      const supabase = createSupabaseBrowserClient();
      const from = (targetPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: closedRows, count } = await supabase
        .from('cash_registers')
        .select(
          'id, closing_cash_expected, closing_cash_declared, cash_difference_amount, closed_at, register_points(name)',
          { count: 'exact' }
        )
        .eq('establishment_id', establishmentId)
        .eq('status', 'closed')
        .order('closed_at', { ascending: false })
        .range(from, to);

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
      setHistoryLoading(false);
    },
    [establishmentId]
  );

  useEffect(() => {
    void loadOpenAndPoints();
  }, [loadOpenAndPoints]);

  useEffect(() => {
    void loadClosedHistory(page);
  }, [loadClosedHistory, page]);

  const refreshAll = async (targetPage = page) => {
    await Promise.all([loadOpenAndPoints(), loadClosedHistory(targetPage)]);
  };

  return (
    <Card variant="flat" className="flex flex-col gap-5">
      <PageHeader
        title={title}
        subtitle="Abra, acompanhe e feche os caixas do dia."
        helpTitle={helpTitle}
        helpText={helpText}
        actions={
          <>
            <Button
              variant="utility"
              onClick={() => {
                setModalError(null);
                setPointModal(true);
              }}
            >
              Novo ponto de caixa
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setModalError(null);
                setOpenModal(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Abrir turno de caixa
            </Button>
          </>
        }
      />

      {feedback && (
        <Alert tone={feedback.tone} title="Movimentação de caixa">
          {feedback.text}
        </Alert>
      )}

      {initialLoading ? (
        <Card variant="soft" title="Caixas abertos">
          <LoadingState compact label="Carregando..." />
        </Card>
      ) : openRegisters.length === 0 ? (
        <Card variant="soft" title="Caixas abertos">
          <p className="typo-body-md text-ink-muted">
            Nenhum caixa aberto agora. Abra um turno para começar a vender.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))]">
          {openRegisters.map((reg) => (
            <Card
              key={reg.id}
              variant="soft"
              title={reg.pointName}
              subtitle={`Aberto em ${formatDateBR(reg.openedAt)}`}
              helpTitle="Dinheiro esperado na gaveta"
              helpText="Soma o troco inicial, as vendas em dinheiro e os suprimentos, e desconta as sangrias e as despesas pagas em dinheiro. PIX e cartões ficam separados."
              headerAction={<Badge sticker="green">Turno aberto</Badge>}
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <span className="typo-caption text-ink-muted">Dinheiro esperado na gaveta</span>
                  <p className="typo-heading-2 tabular-nums text-ink">
                    {formatBRL(reg.expectedPhysicalCash)}
                  </p>
                  <span className="typo-caption text-ink-muted">
                    Troco inicial: {formatBRL(reg.openingBalance)}
                  </span>
                </div>

                <dl className="grid gap-3 border-t border-hairline pt-3 grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))]">
                  {[
                    { key: 'pix', label: 'PIX' },
                    { key: 'debit_card', label: 'Cartão de débito' },
                    { key: 'credit_card', label: 'Cartão de crédito' },
                  ].map((m) => (
                    <div key={m.key} className="flex flex-col gap-0.5">
                      <dt className="typo-caption text-ink-muted">{m.label}</dt>
                      <dd className="typo-body-sm font-medium tabular-nums text-ink">
                        {formatBRL(reg.nonCashBreakdown[m.key] ?? 0)}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="flex flex-wrap justify-end gap-2 border-t border-hairline pt-3">
                  <Button
                    size="sm"
                    variant="utility"
                    onClick={() => {
                      setModalError(null);
                      setMovementModalRegId(reg.id);
                    }}
                  >
                    Suprimento ou sangria
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setDeclaredCashInput(reg.expectedPhysicalCash.toFixed(2));
                      setCloseNotesInput('');
                      setCloseError(null);
                      setCloseModalReg(reg);
                    }}
                  >
                    Fechar caixa
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card
        variant="flat"
        title="Histórico de fechamentos"
        headerAction={
          <span className="typo-caption text-ink-muted">{totalClosed} itens</span>
        }
      >
        <ResponsiveDataTable
          keyExtractor={(r) => r.id}
          loading={historyLoading}
          emptyMessage="Nenhum caixa encerrado ainda."
          data={closedHistory}
          pagination={{
            mode: 'numbered',
            page,
            pageSize: PAGE_SIZE,
            totalCount: totalClosed,
            loading: historyLoading,
            onPageChange: (next) => setPage(next),
          }}
          columns={[
            {
              key: 'ponto',
              header: 'Ponto de caixa',
              render: (r) => <TruncatedText text={r.pointName} maxWidthClass="max-w-[200px]" />,
            },
            { key: 'data', header: 'Fechado em', render: (r) => formatDateBR(r.closedAt) },
            {
              key: 'esp',
              header: 'Esperado em espécie',
              align: 'right',
              render: (r) => <span className="tabular-nums">{formatBRL(r.expectedCash)}</span>,
            },
            {
              key: 'dec',
              header: 'Contado na gaveta',
              align: 'right',
              render: (r) => <span className="tabular-nums">{formatBRL(r.declaredCash)}</span>,
            },
            {
              key: 'dif',
              header: 'Diferença',
              align: 'right',
              render: (r) => (
                <Badge sticker={r.difference === 0 ? 'green' : 'orange'}>
                  <span className="tabular-nums">{formatBRL(r.difference)}</span>
                </Badge>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={pointModal} onClose={() => setPointModal(false)} title="Novo ponto de caixa">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setModalError(null);
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await createRegisterPointAction(fd);
              if (res.error) setModalError(res.error);
              else {
                setFeedback({ tone: 'success', text: 'Ponto de caixa criado com sucesso.' });
                setPointModal(false);
                await loadOpenAndPoints();
              }
            });
          }}
        >
          {modalError && (
            <Alert tone="warning" title="Não foi possível criar">
              {modalError}
            </Alert>
          )}
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
            <Input
              name="name"
              label="Nome do ponto"
              placeholder="Ex: Caixa portaria principal"
              containerClassName="col-span-full"
              required
            />
            <Input
              name="location_note"
              label="Localização (opcional)"
              placeholder="Ex: Entrada do balneário"
              containerClassName="col-span-full"
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="utility" disabled={isPending} onClick={() => setPointModal(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isPending}
              loadingText="Criando..."
            >
              Criar ponto
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Abrir turno de caixa">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setModalError(null);
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await openCashRegisterAction(fd);
              if (res.error) setModalError(res.error);
              else {
                setFeedback({ tone: 'success', text: 'Turno aberto com sucesso.' });
                setOpenModal(false);
                await loadOpenAndPoints();
              }
            });
          }}
        >
          {modalError && (
            <Alert tone="warning" title="Não foi possível abrir o turno">
              {modalError}
            </Alert>
          )}
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
            <Select
              name="register_point_id"
              label="Ponto de atendimento"
              options={points.map((p) => ({ value: p.id, label: p.name }))}
            />
            <Input
              name="opening_balance"
              type="number"
              step="0.01"
              min="0"
              defaultValue="100.00"
              label="Troco inicial em dinheiro (R$)"
              required
            />
            <Input
              name="notes"
              label="Observação (opcional)"
              containerClassName="col-span-full"
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="utility" disabled={isPending} onClick={() => setOpenModal(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isPending}
              loadingText="Abrindo..."
            >
              Abrir turno
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(movementModalRegId)}
        onClose={() => setMovementModalRegId(null)}
        title="Suprimento ou sangria"
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setModalError(null);
            const fd = new FormData(e.currentTarget);
            fd.set('cash_register_id', movementModalRegId ?? '');
            startTransition(async () => {
              const res = await recordDrawerMovementAction(fd);
              if (res.error) setModalError(res.error);
              else {
                setFeedback({ tone: 'success', text: 'Movimentação salva na gaveta.' });
                setMovementModalRegId(null);
                await loadOpenAndPoints();
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
            <Select
              name="movement_type"
              label="Tipo de operação"
              options={[
                {
                  value: 'supply_inflow',
                  label: `${CASH_MOVEMENT_LABELS.supply_inflow} (entrada na gaveta)`,
                },
                {
                  value: 'bleed_outflow',
                  label: `${CASH_MOVEMENT_LABELS.bleed_outflow} (retirada para o cofre)`,
                },
              ]}
            />
            <Input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              label="Valor em dinheiro (R$)"
              required
            />
            <Input
              name="description"
              label="Motivo"
              placeholder="Ex: Recolhimento parcial da tarde"
              containerClassName="col-span-full"
              required
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
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
              loadingText="Salvando..."
            >
              Salvar movimentação
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(closeModalReg)}
        onClose={() => setCloseModalReg(null)}
        title={`Fechar o caixa ${closeModalReg?.pointName ?? ''}?`}
        description="O turno não aceitará novas vendas e o valor contado na gaveta ficará salvo para conferência."
        tone="primary"
        confirmLabel="Fechar caixa"
        loadingLabel="Fechando..."
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
              setFeedback({ tone: 'success', text: 'Caixa fechado e conferido com sucesso.' });
              setCloseModalReg(null);
              setPage(1);
              await refreshAll(1);
            }
          });
        }}
      >
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={declaredCashInput}
            onChange={(e) => setDeclaredCashInput(e.target.value)}
            label="Total em dinheiro contado na gaveta (R$)"
            containerClassName="col-span-full"
            required
          />
          <Input
            value={closeNotesInput}
            onChange={(e) => setCloseNotesInput(e.target.value)}
            label="Observações do fechamento (opcional)"
            containerClassName="col-span-full"
          />
        </div>
      </ConfirmModal>
    </Card>
  );
}
