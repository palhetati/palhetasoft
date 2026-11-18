'use client';

import React, { useCallback, useEffect, useState, useTransition } from 'react';
import { PackagePlus, Plus } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  PageHeader,
  ResponsiveDataTable,
  RowActions,
  Select,
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
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductItem[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [trackStock, setTrackStock] = useState('true');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'warning'; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const loadProducts = useCallback(
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
        .from('products')
        .select('*', { count: 'exact' })
        .eq('establishment_id', establishmentId)
        .eq('is_active', true);

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, count } = await query.order('name').range(from, to);

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
    [establishmentId, categoryFilter]
  );

  useEffect(() => {
    void loadProducts(page);
  }, [loadProducts, page]);

  return (
    <Card variant="flat" className="flex flex-col gap-5">
      <PageHeader
        title={title}
        subtitle="Itens comercializados no estabelecimento com preços e acompanhamento de estoque."
        helpTitle={helpTitle}
        helpText={helpText}
        actions={
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo Produto
          </Button>
        }
      />

      {feedback && (
        <Alert tone={feedback.tone} title="Catálogo atualizado">
          {feedback.text}
        </Alert>
      )}

      <Card variant="soft" title="Setores do Catálogo" className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'Todos os Setores' },
            { key: 'bar', label: 'Bar e Bebidas' },
            { key: 'restaurante', label: 'Restaurante e Cozinha' },
            { key: 'loja', label: 'Loja e Conveniência' },
            { key: 'geral', label: 'Itens Gerais' },
          ].map((item) => (
            <Button
              key={item.key}
              size="sm"
              variant={categoryFilter === item.key ? 'primary' : 'utility'}
              disabled={loading}
              onClick={() => {
                setPage(1);
                setCategoryFilter(item.key);
              }}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </Card>

      <Card variant="flat" title="Produtos Cadastrados">
        <ResponsiveDataTable
          keyExtractor={(row) => row.id}
          loading={loading}
          emptyMessage="Nenhum produto cadastrado neste setor."
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
                <div>
                  <p className="font-medium text-ink">{r.name}</p>
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
              header: 'Estoque Atual',
              render: (r) =>
                r.track_stock ? (
                  <Badge sticker={r.stock_quantity <= r.min_stock_alert ? 'orange' : 'green'}>
                    {r.stock_quantity} un
                  </Badge>
                ) : (
                  <span className="typo-caption text-ink-muted">Venda livre</span>
                ),
            },
            {
              key: 'preco',
              header: 'Preço de Venda',
              align: 'right',
              render: (r) => <span className="font-semibold">{formatBRL(r.unit_price)}</span>,
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
                        key: 'add10',
                        label: 'Somar 10 unidades ao estoque',
                        icon: <PackagePlus className="h-4 w-4 text-primary" />,
                        disabled: isPending,
                        onClick: () => {
                          startTransition(async () => {
                            await adjustProductStockAction(r.id, 10);
                            setFeedback({
                              tone: 'success',
                              text: `Estoque de "${r.name}" acrescido em 10 unidades.`,
                            });
                            await loadProducts(page);
                          });
                        },
                      },
                    ]}
                  />
                ) : null,
            },
          ]}
        />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Cadastrar Produto">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await upsertProductAction(fd);
              if (res.error) setFeedback({ tone: 'warning', text: res.error });
              else {
                setFeedback({ tone: 'success', text: 'Produto salvo no catálogo.' });
                setModalOpen(false);
                await loadProducts(1);
              }
            });
          }}
        >
          <Input
            name="name"
            label="Nome do Produto"
            placeholder="Ex: Água Mineral sem Gás"
            required
          />
          <Input name="sku" label="Código Interno (opcional)" placeholder="Ex: BAR-010" />
          <Select
            name="category"
            label="Setor do Estabelecimento"
            options={[
              { value: 'bar', label: 'Bar e Bebidas' },
              { value: 'restaurante', label: 'Restaurante e Cozinha' },
              { value: 'loja', label: 'Loja e Conveniência' },
              { value: 'geral', label: 'Itens Gerais' },
            ]}
          />
          <Input
            name="unit_price"
            type="number"
            step="0.01"
            min="0"
            label="Preço de Venda (R$)"
            required
          />
          <Input
            name="cost_price"
            type="number"
            step="0.01"
            min="0"
            defaultValue="0"
            label="Custo Estimado (R$)"
          />

          <Select
            name="track_stock"
            label="Controlar quantidade em estoque?"
            value={trackStock}
            onChange={(e) => setTrackStock(e.target.value)}
            options={[
              { value: 'true', label: 'Sim, baixar estoque automaticamente nas vendas' },
              { value: 'false', label: 'Não (prato preparado na hora ou serviço)' },
            ]}
          />

          {trackStock === 'true' && (
            <div className="flex flex-col gap-3">
              <Input
                name="stock_quantity"
                type="number"
                step="1"
                defaultValue="0"
                label="Quantidade Inicial"
              />
              <Input
                name="min_stock_alert"
                type="number"
                step="1"
                defaultValue="10"
                label="Avisar quando chegar em quantas unidades?"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="utility" disabled={isPending} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isPending}
              loadingText="Carregando..."
            >
              Salvar Produto
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
