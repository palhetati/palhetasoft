'use client';

import React, { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Minus, Plus, RotateCcw, ShoppingBag, Trash2 } from 'lucide-react';
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
  RowActions,
  Select,
} from '@/components/ui';
import { humanizeCategory } from '@/lib/domain-labels';
import { formatBRL, roundCents } from '@/lib/formatters';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cancelPdvSaleAction, finalizePdvSaleAction } from '@/modules/pdv/actions';
import type { PaymentMethodCode } from '@/modules/pdv/payment-processor';

export interface PdvProduct {
  id: string;
  name: string;
  category: string;
  unit_price: number;
  track_stock: boolean;
  stock_quantity: number;
}

export interface PdvMethodOption {
  code: PaymentMethodCode;
  label: string;
  fee_percent: number;
}

export interface PdvRecentSale {
  id: string;
  customer_name: string | null;
  gross_amount: number;
  status: string;
}

export interface PdvClientProps {
  establishmentId: string | null;
  canCancelSales: boolean;
  title: string;
  helpTitle: string;
  helpText: string;
}

const BATCH_SIZE = 12;

export function PdvClient({
  establishmentId,
  canCancelSales,
  title,
  helpTitle,
  helpText,
}: PdvClientProps) {
  const [loading, setLoading] = useState(true);
  const [openRegisters, setOpenRegisters] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedRegisterId, setSelectedRegisterId] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<PdvMethodOption[]>([]);

  // Infinite scroll state for Products
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [products, setProducts] = useState<PdvProduct[]>([]);
  const [hasMoreProducts, setHasMoreProducts] = useState(false);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);

  // Infinite scroll state for Recent Sales
  const [recentSales, setRecentSales] = useState<PdvRecentSale[]>([]);
  const [hasMoreSales, setHasMoreSales] = useState(false);
  const [loadingMoreSales, setLoadingMoreSales] = useState(false);

  const [cart, setCart] = useState<Array<{ product: PdvProduct; quantity: number }>>([]);
  const [discount, setDiscount] = useState('0');
  const [customerName, setCustomerName] = useState('');
  const [splitMode, setSplitMode] = useState(false);
  const [primaryMethod, setPrimaryMethod] = useState<PaymentMethodCode>('pix');
  const [secondaryMethod, setSecondaryMethod] = useState<PaymentMethodCode>('cash');
  const [primarySplitAmount, setPrimarySplitAmount] = useState('0');
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const [cancelSaleTarget, setCancelSaleTarget] = useState<PdvRecentSale | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{ tone: 'success' | 'warning'; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const fetchProductsBatch = useCallback(
    async (offset: number, append: boolean) => {
      if (!establishmentId) return;
      if (append) setLoadingMoreProducts(true);

      const supabase = createSupabaseBrowserClient();
      let q = supabase
        .from('products')
        .select('id, name, category, unit_price, track_stock, stock_quantity', { count: 'exact' })
        .eq('establishment_id', establishmentId)
        .eq('is_active', true);

      if (categoryFilter !== 'all') q = q.eq('category', categoryFilter);
      if (search.trim()) q = q.ilike('name', `%${search.trim()}%`);

      const { data, count } = await q.order('name').range(offset, offset + BATCH_SIZE - 1);
      const mapped = ((data ?? []) as PdvProduct[]).map((p) => ({
        ...p,
        unit_price: Number(p.unit_price),
        stock_quantity: Number(p.stock_quantity),
      }));

      setProducts((prev) => (append ? [...prev, ...mapped] : mapped));
      setHasMoreProducts(offset + mapped.length < (count ?? 0));
      setLoadingMoreProducts(false);
    },
    [establishmentId, categoryFilter, search]
  );

  const fetchSalesBatch = useCallback(
    async (offset: number, append: boolean) => {
      if (!establishmentId) return;
      if (append) setLoadingMoreSales(true);

      const supabase = createSupabaseBrowserClient();
      const { data, count } = await supabase
        .from('sales')
        .select('id, customer_name, gross_amount, status', { count: 'exact' })
        .eq('establishment_id', establishmentId)
        .order('created_at', { ascending: false })
        .range(offset, offset + BATCH_SIZE - 1);

      const mapped = (data ?? []).map((s) => ({
        ...s,
        gross_amount: Number(s.gross_amount),
      }));

      setRecentSales((prev) => (append ? [...prev, ...mapped] : mapped));
      setHasMoreSales(offset + mapped.length < (count ?? 0));
      setLoadingMoreSales(false);
    },
    [establishmentId]
  );

  const loadInitialSetup = useCallback(async () => {
    if (!establishmentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const [{ data: regs }, { data: methods }] = await Promise.all([
      supabase
        .from('cash_registers')
        .select('id, register_points(name)')
        .eq('establishment_id', establishmentId)
        .eq('status', 'open'),
      supabase
        .from('payment_method_configs')
        .select('code, label, fee_percent')
        .eq('establishment_id', establishmentId)
        .eq('is_active', true),
    ]);

    const mappedRegs = (regs ?? []).map((r: Record<string, unknown>) => {
      const point = r.register_points as { name?: string } | null;
      return {
        id: String(r.id),
        label: point?.name ?? 'Caixa em Operação',
      };
    });

    setOpenRegisters(mappedRegs);
    setSelectedRegisterId((prev) => prev || mappedRegs[0]?.id || '');

    const mappedMethods = (methods ?? []).map((m) => ({
      code: m.code as PaymentMethodCode,
      label: m.label,
      fee_percent: Number(m.fee_percent),
    }));
    setPaymentMethods(mappedMethods);
    if (mappedMethods[0]) setPrimaryMethod(mappedMethods[0].code);

    await Promise.all([fetchProductsBatch(0, false), fetchSalesBatch(0, false)]);
    setLoading(false);
  }, [establishmentId, fetchProductsBatch, fetchSalesBatch]);

  useEffect(() => {
    void loadInitialSetup();
  }, [loadInitialSetup]);

  const subtotal = roundCents(
    cart.reduce((acc, item) => acc + roundCents(item.product.unit_price * item.quantity), 0)
  );
  const discountValue = Math.max(0, Number(discount) || 0);
  const totalGross = Math.max(0, roundCents(subtotal - discountValue));

  const addToCart = (product: PdvProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const changeQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const handleCheckout = () => {
    if (!selectedRegisterId) {
      setFeedback({ tone: 'warning', text: 'Abra um turno de caixa antes de vender.' });
      return;
    }

    const firstVal = splitMode ? roundCents(Number(primarySplitAmount) || 0) : totalGross;
    const secondVal = splitMode ? roundCents(totalGross - firstVal) : 0;

    const splits = splitMode
      ? [
          { payment_method: primaryMethod, gross_amount: firstVal },
          ...(secondVal > 0 ? [{ payment_method: secondaryMethod, gross_amount: secondVal }] : []),
        ]
      : [{ payment_method: primaryMethod, gross_amount: totalGross }];

    startTransition(async () => {
      const res = await finalizePdvSaleAction({
        cashRegisterId: selectedRegisterId,
        customerName,
        discountAmount: discountValue,
        items: cart.map((c) => ({
          product_id: c.product.id,
          product_name: c.product.name,
          quantity: c.quantity,
          unit_price: c.product.unit_price,
        })),
        splits,
      });

      if (res.error) {
        setFeedback({ tone: 'warning', text: res.error });
      } else {
        setCart([]);
        setDiscount('0');
        setCustomerName('');
        setMobileCartOpen(false);
        setFeedback({ tone: 'success', text: 'Venda registrada com sucesso.' });
        await Promise.all([fetchProductsBatch(0, false), fetchSalesBatch(0, false)]);
      }
    });
  };

  const cartSummaryContent = (
    <div className="flex flex-col gap-4">
      <Select
        label="Caixa em Operação"
        value={selectedRegisterId}
        onChange={(e) => setSelectedRegisterId(e.target.value)}
        options={openRegisters.map((r) => ({ value: r.id, label: r.label }))}
      />

      <Input
        label="Identificação do Cliente (opcional)"
        placeholder="Ex: Visitante João"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
      />

      <div className="flex max-h-60 flex-col gap-2 overflow-y-auto border-y border-hairline py-3">
        {cart.length === 0 ? (
          <p className="typo-body-sm py-3 text-center text-ink-muted">
            Adicione itens do catálogo acima para montar o pedido.
          </p>
        ) : (
          cart.map(({ product, quantity }) => (
            <div key={product.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="typo-body-sm truncate font-medium">{product.name}</p>
                <span className="typo-caption text-ink-muted">
                  {quantity}x {formatBRL(product.unit_price)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="icon-circular"
                  aria-label={`Diminuir ${product.name}`}
                  onClick={() => changeQty(product.id, -1)}
                  className="!min-h-[34px] !min-w-[34px] !p-1"
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-6 text-center typo-body-sm font-semibold">{quantity}</span>
                <Button
                  variant="icon-circular"
                  aria-label={`Aumentar ${product.name}`}
                  onClick={() => changeQty(product.id, 1)}
                  className="!min-h-[34px] !min-w-[34px] !p-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Input
        type="number"
        step="0.01"
        min="0"
        label="Desconto (R$)"
        value={discount}
        onChange={(e) => setDiscount(e.target.value)}
      />

      <div className="flex flex-col gap-3 rounded-md bg-canvas-soft p-3">
        <div className="flex items-center justify-between">
          <span className="typo-body-sm text-ink-muted">Total a Receber</span>
          <span className="typo-heading-2 text-ink">{formatBRL(totalGross)}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={!splitMode ? 'primary' : 'utility'}
            onClick={() => setSplitMode(false)}
          >
            Pagamento Único
          </Button>
          <Button
            size="sm"
            variant={splitMode ? 'primary' : 'utility'}
            onClick={() => {
              setSplitMode(true);
              setPrimarySplitAmount((totalGross / 2).toFixed(2));
            }}
          >
            Dividir Pagamento
          </Button>
        </div>

        <Select
          label={splitMode ? 'Primeira Forma de Pagamento' : 'Forma de Pagamento'}
          value={primaryMethod}
          onChange={(e) => setPrimaryMethod(e.target.value as PaymentMethodCode)}
          options={paymentMethods.map((m) => ({
            value: m.code,
            label: m.fee_percent > 0 ? `${m.label} (taxa ${m.fee_percent}%)` : m.label,
          }))}
        />

        {splitMode && (
          <div className="flex flex-col gap-3">
            <Input
              type="number"
              step="0.01"
              label="Valor da Primeira Parte (R$)"
              value={primarySplitAmount}
              onChange={(e) => setPrimarySplitAmount(e.target.value)}
            />
            <Select
              label={`Segunda Parte (${formatBRL(
                Math.max(0, totalGross - (Number(primarySplitAmount) || 0))
              )})`}
              value={secondaryMethod}
              onChange={(e) => setSecondaryMethod(e.target.value as PaymentMethodCode)}
              options={paymentMethods.map((m) => ({ value: m.code, label: m.label }))}
            />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {cart.length > 0 && (
          <Button variant="utility" onClick={() => setCart([])} aria-label="Limpar carrinho">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="primary"
          fullWidth
          disabled={cart.length === 0}
          loading={isPending}
          loadingText="Carregando..."
          onClick={handleCheckout}
        >
          Finalizar Venda ({formatBRL(totalGross)})
        </Button>
      </div>
    </div>
  );

  return (
    <Card variant="flat" className="flex flex-col gap-5 pb-20 lg:pb-6">
      <PageHeader
        title={title}
        subtitle="Atendimento rápido no balcão com pagamento único ou dividido."
        helpTitle={helpTitle}
        helpText={helpText}
      />

      {feedback && (
        <Alert tone={feedback.tone} title="Retorno do PDV">
          {feedback.text}
        </Alert>
      )}

      {loading ? (
        <LoadingState label="Carregando..." />
      ) : openRegisters.length === 0 ? (
        <Card variant="soft" className="flex flex-col gap-4">
          <Alert tone="warning" title="Nenhum ponto de caixa aberto">
            Para iniciar as vendas no PDV, abra primeiro o turno do seu ponto de atendimento na tela de Caixa.
          </Alert>
          <div>
            <Link href="/caixa">
              <Button variant="primary">Ir para Controle de Caixas</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Card 1: Busca e Catálogo com Scroll Infinito */}
          <Card variant="soft" title="Catálogo de Produtos" className="flex flex-col gap-4">
            <Input
              placeholder="Buscar produto pelo nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'Todos' },
                { key: 'bar', label: 'Bar e Bebidas' },
                { key: 'restaurante', label: 'Restaurante' },
                { key: 'loja', label: 'Loja' },
                { key: 'geral', label: 'Geral' },
              ].map((cat) => (
                <Button
                  key={cat.key}
                  size="sm"
                  variant={categoryFilter === cat.key ? 'primary' : 'utility'}
                  onClick={() => setCategoryFilter(cat.key)}
                >
                  {cat.label}
                </Button>
              ))}
            </div>

            <ResponsiveDataTable
              keyExtractor={(p) => p.id}
              emptyMessage="Nenhum produto encontrado."
              data={products}
              pagination={{
                mode: 'infinite',
                hasMore: hasMoreProducts,
                loadingMore: loadingMoreProducts,
                onLoadMore: () => void fetchProductsBatch(products.length, true),
              }}
              columns={[
                { key: 'nome', header: 'Produto', render: (p) => p.name },
                {
                  key: 'setor',
                  header: 'Setor',
                  render: (p) => <Badge sticker="sky">{humanizeCategory(p.category)}</Badge>,
                },
                {
                  key: 'est',
                  header: 'Estoque',
                  render: (p) =>
                    p.track_stock ? (
                      <Badge sticker={p.stock_quantity <= 0 ? 'orange' : 'green'}>
                        {p.stock_quantity} un
                      </Badge>
                    ) : (
                      <span className="typo-caption text-ink-muted">Livre</span>
                    ),
                },
                {
                  key: 'preco',
                  header: 'Preço',
                  align: 'right',
                  render: (p) => <strong>{formatBRL(p.unit_price)}</strong>,
                },
                {
                  key: 'add',
                  header: 'Adicionar',
                  align: 'right',
                  render: (p) => (
                    <RowActions
                      actions={[
                        {
                          key: 'add',
                          label: `Adicionar ${p.name} ao pedido`,
                          icon: <Plus className="h-4 w-4 text-primary" />,
                          onClick: () => addToCart(p),
                        },
                      ]}
                    />
                  ),
                },
              ]}
            />
          </Card>

          {/* Card 2: Resumo e Fechamento do Pedido */}
          <Card variant="flat" title="Resumo e Fechamento do Pedido">
            {cartSummaryContent}
          </Card>

          {/* Card 3: Vendas Recentes com Scroll Infinito */}
          <Card variant="flat" title="Vendas Recentes do Estabelecimento">
            <ResponsiveDataTable
              keyExtractor={(r) => r.id}
              emptyMessage="Nenhuma venda registrada ainda."
              data={recentSales}
              pagination={{
                mode: 'infinite',
                hasMore: hasMoreSales,
                loadingMore: loadingMoreSales,
                onLoadMore: () => void fetchSalesBatch(recentSales.length, true),
              }}
              columns={[
                {
                  key: 'id',
                  header: 'Identificação',
                  render: (r) => r.customer_name || `Venda #${r.id.slice(0, 6)}`,
                },
                {
                  key: 'status',
                  header: 'Situação',
                  render: (r) => (
                    <Badge sticker={r.status === 'completed' ? 'green' : 'orange'}>
                      {r.status === 'completed' ? 'Concluída' : 'Estornada'}
                    </Badge>
                  ),
                },
                {
                  key: 'valor',
                  header: 'Valor Total',
                  align: 'right',
                  render: (r) => formatBRL(r.gross_amount),
                },
                {
                  key: 'estorno',
                  header: 'Ações',
                  align: 'right',
                  render: (r) =>
                    canCancelSales && r.status === 'completed' ? (
                      <RowActions
                        actions={[
                          {
                            key: 'cancel',
                            label: 'Estornar venda e devolver itens ao estoque',
                            icon: <RotateCcw className="h-4 w-4" />,
                            tone: 'danger',
                            disabled: isPending,
                            onClick: () => {
                              setCancelError(null);
                              setCancelSaleTarget(r);
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

      {/* Barra Fixa Mobile para acesso rápido ao pedido */}
      {openRegisters.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface p-3 shadow-elevated lg:hidden">
          <Button variant="primary" fullWidth onClick={() => setMobileCartOpen(true)}>
            <ShoppingBag className="h-4 w-4" />
            Pedido ({cart.reduce((a, b) => a + b.quantity, 0)} itens) · {formatBRL(totalGross)}
          </Button>
        </div>
      )}

      <Modal
        open={mobileCartOpen}
        onClose={() => setMobileCartOpen(false)}
        title="Fechar Pedido no PDV"
      >
        {cartSummaryContent}
      </Modal>

      {/* ConfirmModal Compartilhado para Estorno de Venda */}
      <ConfirmModal
        open={Boolean(cancelSaleTarget)}
        onClose={() => setCancelSaleTarget(null)}
        title="Deseja estornar esta venda?"
        description={
          cancelSaleTarget
            ? `O valor de ${formatBRL(cancelSaleTarget.gross_amount)} será revertido no livro do caixa aberto e os produtos controlados voltarão automaticamente para o estoque.`
            : ''
        }
        confirmLabel="Confirmar Estorno"
        loadingLabel="Carregando..."
        loading={isPending}
        errorMessage={cancelError}
        onConfirm={() => {
          if (!cancelSaleTarget) return;
          startTransition(async () => {
            const res = await cancelPdvSaleAction(cancelSaleTarget.id);
            if (res.error) {
              setCancelError(res.error);
            } else {
              setCancelSaleTarget(null);
              setFeedback({ tone: 'success', text: 'Venda estornada com sucesso.' });
              await Promise.all([fetchProductsBatch(0, false), fetchSalesBatch(0, false)]);
            }
          });
        }}
      />
    </Card>
  );
}
