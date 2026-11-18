'use client';

import React, { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { PackagePlus, Plus } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  ChoiceChips,
  ConfirmModal,
  Input,
  Modal,
  PageHeader,
  ResponsiveDataTable,
  RowActions,
  Select,
  TruncatedText,
} from '@/components/ui';
import { humanizeCategory } from '@/lib/domain-labels';
import { formatBRL } from '@/lib/formatters';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { adjustProductStockAction, upsertProductAction } from '@/modules/products/actions';

export interface ProductItem {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  unit_price: number;
  cost_price: number;
  track_stock: boolean;
  stock_quantity: number;
  min_stock_alert: number;
}

export interface ProductsClientProps {
  establishmentId: string | null;
  title: string;
  helpTitle: string;
  helpText: string;
}

const PAGE_SIZE = 10;

export function ProductsClient({
  establishmentId,
  title,
  helpTitle,
  helpText,
}: ProductsClientProps) {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const requestRef = useRef(0);

  const [products, setProducts] = useState<ProductItem[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [trackStock, setTrackStock] = useState<'true' | 'false'>('true');

  const [stockTarget, setStockTarget] = useState<ProductItem | null>(null);
  const [stockDelta, setStockDelta] = useState('10');
  const [stockError, setStockError] = useState<string | null>(null);

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

  const loadProducts = useCallback(
    async (targetPage: number) => {
      if (!establishmentId) {
        setLoading(false);
        return;
      }

      const reqId = ++requestRef.current;
      setLoading(true);
      const supabase = createSupabaseBrowserClient();
      const from = (targetPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('establishment_id', establishmentId)
        .eq('is_active', true);

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }
      if (debouncedSearch) {
        query = query.ilike('name', `%${debouncedSearch}%`);
      }

      const { data, count } = await query.order('name').range(from, to);

      if (reqId !== requestRef.current) return;

      setProducts(
        ((data ?? []) as ProductItem[]).map((p) => ({
          ...p,
          unit_price: Number(p.unit_price),
          cost_price: Number(p.cost_price),
          stock_quantity: Number(p.stock_quantity),
          min_stock_alert: Number(p.min_stock_alert),
        }))
      );
      setTotalCount(count ?? 0);
      setLoading(false);
    },
    [establishmentId, categoryFilter, debouncedSearch]
  );

  useEffect(() => {
    void loadProducts(page);
  }, [loadProducts, page]);

  return (
    <Card variant="flat" className="flex flex-col gap-5">
      <PageHeader
        title={title}
        subtitle="Itens vendidos no estabelecimento, preços e acompanhamento de estoque."
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
            Novo produto
          </Button>
        }
      />

      {feedback && (
        <Alert tone={feedback.tone} title="Catálogo atualizado">
          {feedback.text}
        </Alert>
      )}

      <Card variant="soft" title="Filtros">
        <div className="flex flex-col gap-4">
          <Input
            type="search"
            aria-label="Buscar produto pelo nome"
            placeholder="Buscar produto pelo nome"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ChoiceChips
            ariaLabel="Filtrar por setor"
            value={categoryFilter}
            onChange={(next) => {
              setPage(1);
              setCategoryFilter(next);
            }}
            options={[
              { value: 'all', label: 'Todos os setores' },
              { value: 'bar', label: 'Bar e bebidas' },
              { value: 'restaurante', label: 'Restaurante e cozinha' },
              { value: 'loja', label: 'Loja e conveniência' },
              { value: 'geral', label: 'Itens gerais' },
            ]}
          />
        </div>
      </Card>

      <Card
        variant="flat"
        title="Produtos cadastrados"
        headerAction={<span className="typo-caption text-ink-muted">{totalCount} itens</span>}
      >
        <ResponsiveDataTable
          keyExtractor={(row) => row.id}
          loading={loading}
          emptyMessage="Nenhum produto encontrado neste setor."
          data={products}
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
              header: 'Produto',
              render: (r) => (
                <div className="min-w-0">
                  <TruncatedText text={r.name} maxWidthClass="max-w-[220px]" />
                  {r.sku && <span className="typo-caption text-ink-faint">Código: {r.sku}</span>}
                </div>
              ),
            },
            {
              key: 'cat',
              header: 'Setor',
              render: (r) => <Badge sticker="sky">{humanizeCategory(r.category)}</Badge>,
            },
            {
              key: 'estoque',
              header: 'Estoque atual',
              render: (r) =>
                r.track_stock ? (
                  <Badge sticker={r.stock_quantity <= r.min_stock_alert ? 'orange' : 'green'}>
                    <span className="tabular-nums">{r.stock_quantity} un</span>
                  </Badge>
                ) : (
                  <span className="typo-caption text-ink-muted">Venda livre</span>
                ),
            },
            {
              key: 'preco',
              header: 'Preço de venda',
              align: 'right',
              render: (r) => <span className="tabular-nums">{formatBRL(r.unit_price)}</span>,
            },
            {
              key: 'ajuste',
              header: 'Ações',
              align: 'right',
              render: (r) =>
                r.track_stock ? (
                  <RowActions
                    actions={[
                      {
                        key: 'add-stock',
                        label: 'Repor unidades no estoque',
                        icon: <PackagePlus className="h-4 w-4 text-primary" />,
                        disabled: isPending,
                        onClick: () => {
                          setStockDelta('10');
                          setStockError(null);
                          setStockTarget(r);
                        },
                      },
                    ]}
                  />
                ) : null,
            },
          ]}
        />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo produto">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setModalError(null);
            const fd = new FormData(e.currentTarget);
            fd.set('track_stock', trackStock);
            startTransition(async () => {
              const res = await upsertProductAction(fd);
              if (res.error) setModalError(res.error);
              else {
                setFeedback({ tone: 'success', text: 'Produto salvo no cardápio.' });
                setModalOpen(false);
                setPage(1);
                await loadProducts(1);
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
              name="name"
              label="Nome do produto"
              placeholder="Ex: Água mineral sem gás"
              containerClassName="col-span-full"
              required
            />
            <Input name="sku" label="Código interno (opcional)" placeholder="Ex: BAR-010" />
            <Select
              name="category"
              label="Setor"
              options={[
                { value: 'bar', label: 'Bar e bebidas' },
                { value: 'restaurante', label: 'Restaurante e cozinha' },
                { value: 'loja', label: 'Loja e conveniência' },
                { value: 'geral', label: 'Itens gerais' },
              ]}
            />
            <Input
              name="unit_price"
              type="number"
              step="0.01"
              min="0"
              label="Preço de venda (R$)"
              required
            />
            <Input
              name="cost_price"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
              label="Custo estimado (R$)"
            />
          </div>

          <div className="flex flex-col gap-2 border-t border-hairline pt-3">
            <span className="typo-caption font-medium text-ink-secondary">
              Controle de estoque
            </span>
            <ChoiceChips
              ariaLabel="Controle de estoque"
              value={trackStock}
              onChange={setTrackStock}
              options={[
                { value: 'true', label: 'Controlar quantidade' },
                { value: 'false', label: 'Venda livre (prato ou serviço)' },
              ]}
            />
          </div>

          {trackStock === 'true' && (
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
              <Input
                name="stock_quantity"
                type="number"
                step="1"
                defaultValue="0"
                label="Quantidade inicial"
              />
              <Input
                name="min_stock_alert"
                type="number"
                step="1"
                defaultValue="10"
                label="Avisar abaixo de quantas unidades?"
              />
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
              Salvar produto
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(stockTarget)}
        onClose={() => setStockTarget(null)}
        title={`Repor estoque de "${stockTarget?.name ?? ''}"?`}
        description="As unidades informadas serão somadas imediatamente ao saldo disponível para venda no PDV."
        tone="primary"
        confirmLabel="Repor estoque"
        loadingLabel="Repondo..."
        loading={isPending}
        errorMessage={stockError}
        onConfirm={() => {
          if (!stockTarget) return;
          const qty = Number(stockDelta);
          if (!qty || Number.isNaN(qty)) {
            setStockError('Informe uma quantidade válida diferente de zero.');
            return;
          }
          startTransition(async () => {
            const res = await adjustProductStockAction(stockTarget.id, qty);
            if (res?.error) {
              setStockError(res.error);
            } else {
              setFeedback({
                tone: 'success',
                text: `Estoque de "${stockTarget.name}" atualizado com sucesso.`,
              });
              setStockTarget(null);
              await loadProducts(page);
            }
          });
        }}
      >
        <Input
          type="number"
          step="1"
          value={stockDelta}
          onChange={(e) => setStockDelta(e.target.value)}
          label="Quantidade a somar (use sinal negativo para baixa)"
          required
        />
      </ConfirmModal>
    </Card>
  );
}
