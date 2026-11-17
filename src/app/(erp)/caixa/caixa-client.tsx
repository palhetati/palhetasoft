'use client';

import React, { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  ResponsiveDataTable,
  Select,
} from '@/components/ui';
import { formatBRL, formatDateBR } from '@/lib/formatters';
import {
  closeCashRegisterAction,
  createRegisterPointAction,
  openCashRegisterAction,
  recordDrawerMovementAction,
} from '@/modules/cash-register/actions';

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
  points: Array<{ id: string; name: string; location_note: string | null }>;
  openRegisters: OpenRegisterView[];
  closedHistory: ClosedRegisterView[];
}

export function CaixaClient({ points, openRegisters, closedHistory }: CaixaClientProps) {
  const [pointModal, setPointModal] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [movementModalRegId, setMovementModalRegId] = useState<string | null>(null);
  const [closeModalReg, setCloseModalReg] = useState<OpenRegisterView | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'warning'; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => setOpenModal(true)}>
          <Plus className="h-4 w-4" />
          Abrir Turno de Caixa
        </Button>
        <Button variant="utility" onClick={() => setPointModal(true)}>
          Novo Ponto de Caixa (Ex: Bar, Restaurante)
        </Button>
      </div>

      {feedback && (
        <Alert tone={feedback.tone} title="Movimentação de caixa">
          {feedback.text}
        </Alert>
      )}

      <section className="space-y-3">
        <h2 className="typo-title text-ink">Caixas Abertos Agora ({openRegisters.length})</h2>
        {openRegisters.length === 0 ? (
          <Card variant="soft">
            <p className="typo-body-md text-ink-muted">
              Nenhum turno de caixa aberto no momento. Clique em Abrir Turno de Caixa para iniciar as vendas.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {openRegisters.map((reg) => (
              <Card
                key={reg.id}
                variant="elevated"
                title={reg.pointName}
                subtitle={`Aberto em ${formatDateBR(reg.openedAt)}`}
                helpTitle="Conferência Física da Gaveta"
                helpText="O saldo esperado na gaveta soma apenas o dinheiro vivo de troco inicial, vendas em espécie e suprimentos, descontando sangrias e despesas pagas em dinheiro. Vendas em PIX e Cartão aparecem separadas abaixo."
                headerAction={<Badge sticker="green">Turno Aberto</Badge>}
              >
                <div className="space-y-4">
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

                  <div className="flex flex-wrap gap-3 text-sm">
                    <div>
                      <span className="typo-caption text-ink-muted">PIX no turno: </span>
                      <strong>{formatBRL(reg.nonCashBreakdown.pix ?? 0)}</strong>
                    </div>
                    <div>
                      <span className="typo-caption text-ink-muted">Débito: </span>
                      <strong>{formatBRL(reg.nonCashBreakdown.debit_card ?? 0)}</strong>
                    </div>
                    <div>
                      <span className="typo-caption text-ink-muted">Crédito: </span>
                      <strong>{formatBRL(reg.nonCashBreakdown.credit_card ?? 0)}</strong>
                    </div>
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
                      onClick={() => setCloseModalReg(reg)}
                    >
                      Fechar Caixa
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="typo-title text-ink">Últimos Fechamentos</h2>
        <ResponsiveDataTable
          keyExtractor={(r) => r.id}
          emptyMessage="Nenhum caixa encerrado ainda."
          data={closedHistory}
          columns={[
            { key: 'ponto', header: 'Ponto de Caixa', render: (r) => r.pointName },
            { key: 'data', header: 'Fechado em', render: (r) => formatDateBR(r.closedAt) },
            {
              key: 'esp',
              header: 'Esperado (Espécie)',
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
      </section>

      {/* Modal: Novo Ponto de Caixa */}
      <Modal open={pointModal} onClose={() => setPointModal(false)} title="Novo Ponto de Caixa">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await createRegisterPointAction(fd);
              if (res.error) setFeedback({ tone: 'warning', text: res.error });
              else {
                setFeedback({ tone: 'success', text: 'Ponto de caixa criado.' });
                setPointModal(false);
              }
            });
          }}
        >
          <Input name="name" label="Nome do Ponto" placeholder="Ex: Caixa Portaria Principal" required />
          <Input name="location_note" label="Localização (opcional)" placeholder="Ex: Entrada do balneário" />
          <div className="flex justify-end gap-2">
            <Button variant="utility" onClick={() => setPointModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              Criar Ponto
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Abrir Turno */}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Abrir Turno de Caixa">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await openCashRegisterAction(fd);
              if (res.error) setFeedback({ tone: 'warning', text: res.error });
              else {
                setFeedback({ tone: 'success', text: 'Turno aberto com sucesso.' });
                setOpenModal(false);
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
            <Button variant="utility" onClick={() => setOpenModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              Confirmar Abertura
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Suprimento / Sangria */}
      <Modal
        open={Boolean(movementModalRegId)}
        onClose={() => setMovementModalRegId(null)}
        title="Registrar Suprimento ou Sangria"
      >
        <form
          className="space-y-4"
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
          <Input name="amount" type="number" step="0.01" min="0.01" label="Valor em Espécie (R$)" required />
          <Input name="description" label="Motivo" placeholder="Ex: Recolhimento parcial da tarde" required />
          <div className="flex justify-end gap-2">
            <Button variant="utility" onClick={() => setMovementModalRegId(null)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              Confirmar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Fechar Caixa */}
      <Modal
        open={Boolean(closeModalReg)}
        onClose={() => setCloseModalReg(null)}
        title={`Fechar ${closeModalReg?.pointName ?? 'Caixa'}`}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set('cash_register_id', closeModalReg?.id ?? '');
            startTransition(async () => {
              const res = await closeCashRegisterAction(fd);
              if (res.error) setFeedback({ tone: 'warning', text: res.error });
              else {
                setFeedback({ tone: 'success', text: 'Caixa encerrado e conferido.' });
                setCloseModalReg(null);
              }
            });
          }}
        >
          <p className="typo-body-sm text-ink-secondary">
            Conte as cédulas e moedas presentes fisicamente na gaveta e informe o valor total abaixo.
          </p>
          <Input
            name="declared_cash"
            type="number"
            step="0.01"
            min="0"
            defaultValue={closeModalReg?.expectedPhysicalCash.toFixed(2)}
            label="Total em Dinheiro Contado na Gaveta (R$)"
            required
          />
          <Input name="notes" label="Observações do Fechamento" />
          <div className="flex justify-end gap-2">
            <Button variant="utility" onClick={() => setCloseModalReg(null)}>
              Voltar
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              Encerrar Turno
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
