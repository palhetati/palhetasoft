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
import { formatBRL } from '@/lib/formatters';
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

export function ProductsClient({ products }: { products: ProductItem[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [trackStock, setTrackStock] = useState('true');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'warning'; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const filtered = products.filter(
    (p) => categoryFilter === 'all' || p.category === categoryFilter
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'bar', label: 'Bar' },
            { key: 'restaurante', label: 'Restaurante' },
            { key: 'geral', label: 'Geral' },
          ].map((item) => (
            <Button
              key={item.key}
              size="sm"
              variant={categoryFilter === item.key ? 'primary' : 'utility'}
              onClick={() => setCategoryFilter(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <Button variant="primary" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {feedback && (
        <Alert tone={feedback.tone} title="Catálogo atualizado">
          {feedback.text}
        </Alert>
      )}

      <ResponsiveDataTable
        keyExtractor={(row) => row.id}
        emptyMessage="Nenhum produto cadastrado."
        data={filtered}
        columns={[
          {
            key: 'nome',
            header: 'Produto',
            render: (r) => (
              <div>
                <p className="font-semibold">{r.name}</p>
                {r.sku && <span className="typo-caption text-ink-faint">SKU: {r.sku}</span>}
              </div>
            ),
          },
          {
            key: 'cat',
            header: 'Categoria',
            render: (r) => <Badge sticker="sky">{r.category}</Badge>,
          },
          {
            key: 'estoque',
            header: 'Estoque',
            render: (r) =>
              r.track_stock ? (
                <Badge
                  sticker={r.stock_quantity <= r.min_stock_alert ? 'orange' : 'green'}
                >
                  {r.stock_quantity} un
                </Badge>
              ) : (
                <span className="typo-caption text-ink-muted">Livre</span>
              ),
          },
          {
            key: 'preco',
            header: 'Venda',
            align: 'right',
            render: (r) => <span className="font-semibold">{formatBRL(r.unit_price)}</span>,
          },
          {
            key: 'ajuste',
            header: 'Ajuste Rápido',
            align: 'right',
            render: (r) =>
              r.track_stock ? (
                <div className="flex justify-end gap-1.5">
                  <Button
                    size="sm"
                    variant="utility"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        await adjustProductStockAction(r.id, 10);
                      });
                    }}
                  >
                    +10
                  </Button>
                </div>
              ) : null,
          },
        ]}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Cadastrar Produto">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await upsertProductAction(fd);
              if (res.error) setFeedback({ tone: 'warning', text: res.error });
              else {
                setFeedback({ tone: 'success', text: 'Produto salvo no catálogo.' });
                setModalOpen(false);
              }
            });
          }}
        >
          <Input name="name" label="Nome do Produto" placeholder="Ex: Água Mineral sem Gás" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input name="sku" label="Código / SKU (opcional)" placeholder="Ex: BAR-010" />
            <Select
              name="category"
              label="Setor"
              options={[
                { value: 'bar', label: 'Bar' },
                { value: 'restaurante', label: 'Restaurante' },
                { value: 'loja', label: 'Loja ou Conveniência' },
                { value: 'geral', label: 'Geral' },
              ]}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

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
            <div className="grid gap-4 sm:grid-cols-2">
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
                label="Alerta de Estoque Mínimo"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="utility" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              Salvar Produto
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
