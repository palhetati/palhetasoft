'use client';

import React, { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
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
import { formatBRL, roundCents } from '@/lib/formatters';
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
  openRegisters: Array<{ id: string; label: string }>;
  products: PdvProduct[];
  paymentMethods: PdvMethodOption[];
  recentSales: PdvRecentSale[];
  canCancelSales: boolean;
}

export function PdvClient({
  openRegisters,
  products,
  paymentMethods,
  recentSales,
  canCancelSales,
}: PdvClientProps) {
  const [selectedRegisterId, setSelectedRegisterId] = useState(openRegisters[0]?.id ?? '');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cart, setCart] = useState<Array<{ product: PdvProduct; quantity: number }>>([]);
  const [discount, setDiscount] = useState('0');
  const [customerName, setCustomerName] = useState('');
  const [splitMode, setSplitMode] = useState(false);
  const [primaryMethod, setPrimaryMethod] = useState<PaymentMethodCode>(
    paymentMethods[0]?.code ?? 'pix'
  );
  const [secondaryMethod, setSecondaryMethod] = useState<PaymentMethodCode>('cash');
  const [primarySplitAmount, setPrimarySplitAmount] = useState('0');
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'warning'; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
      const matchesQuery = p.name.toLowerCase().includes(search.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [products, categoryFilter, search]);

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
        .map((i) =>
          i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i
        )
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
        setFeedback({
          tone: 'success',
          text: `Venda registrada com sucesso no caixa selecionado.`,
        });
      }
    });
  };

  if (openRegisters.length === 0) {
    return (
      <Card variant="elevated" className="space-y-4">
        <Alert tone="warning" title="Nenhum ponto de caixa aberto">
          Para iniciar as vendas no PDV, abra primeiro o turno do seu ponto de atendimento (por exemplo Caixa Bar ou Caixa Restaurante).
        </Alert>
        <Link href="/caixa">
          <Button variant="primary">Ir para Abertura de Caixa</Button>
        </Link>
      </Card>
    );
  }

  const cartSummaryContent = (
    <div className="space-y-4">
      <Select
        label="Caixa em Operação"
        value={selectedRegisterId}
        onChange={(e) => setSelectedRegisterId(e.target.value)}
        options={openRegisters.map((r) => ({ value: r.id, label: r.label }))}
      />

      <Input
        label="Cliente ou Mesa (opcional)"
        placeholder="Ex: Visitante João"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
      />

      <div className="max-h-60 space-y-2 overflow-y-auto border-y border-hairline py-3">
        {cart.length === 0 ? (
          <p className="typo-caption py-4 text-center text-ink-muted">
            Toque nos produtos para adicionar ao pedido.
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
                  className="!min-h-[36px] !min-w-[36px] !p-1.5"
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-6 text-center typo-body-sm font-semibold">{quantity}</span>
                <Button
                  variant="icon-circular"
                  aria-label={`Aumentar ${product.name}`}
                  onClick={() => changeQty(product.id, 1)}
                  className="!min-h-[36px] !min-w-[36px] !p-1.5"
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

      <div className="space-y-3 rounded-md bg-canvas-soft p-3">
        <div className="flex items-center justify-between">
          <span className="typo-caption text-ink-muted">Total a Receber</span>
          <span className="typo-heading-3 text-ink">{formatBRL(totalGross)}</span>
        </div>

        <div className="flex gap-2">
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
          label={splitMode ? '1ª Forma de Pagamento' : 'Forma de Pagamento'}
          value={primaryMethod}
          onChange={(e) => setPrimaryMethod(e.target.value as PaymentMethodCode)}
          options={paymentMethods.map((m) => ({
            value: m.code,
            label: m.fee_percent > 0 ? `${m.label} (taxa ${m.fee_percent}%)` : m.label,
          }))}
        />

        {splitMode && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              type="number"
              step="0.01"
              label="Valor da 1ª parte (R$)"
              value={primarySplitAmount}
              onChange={(e) => setPrimarySplitAmount(e.target.value)}
            />
            <Select
              label={`Restante (${formatBRL(
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
          disabled={cart.length === 0 || isPending}
          onClick={handleCheckout}
        >
          {isPending ? 'Processando...' : `Finalizar Venda (${formatBRL(totalGross)})`}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-24 lg:pb-0">
      {feedback && (
        <Alert tone={feedback.tone} title="Retorno do PDV">
          {feedback.text}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Product Grid */}
        <div className="space-y-4 lg:col-span-7">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <Input
                placeholder="Buscar produto pelo nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['all', 'bar', 'restaurante', 'geral'].map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant={categoryFilter === cat ? 'primary' : 'utility'}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat === 'all' ? 'Todos' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {filteredProducts.map((product) => {
              const outOfStock = product.track_stock && product.stock_quantity <= 0;
              return (
                <Card key={product.id} variant="flat" className="flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="typo-body-md font-semibold text-ink">{product.name}</h3>
                      <Badge sticker="sky">{product.category}</Badge>
                    </div>
                    <p className="typo-title mt-1 text-primary">{formatBRL(product.unit_price)}</p>
                    {product.track_stock && (
                      <div className="mt-1">
                        <Badge sticker={outOfStock ? 'orange' : 'green'}>
                          {outOfStock
                            ? `Estoque zerado (${product.stock_quantity})`
                            : `Estoque: ${product.stock_quantity}`}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="utility"
                    fullWidth
                    onClick={() => addToCart(product)}
                  >
                    <Plus className="h-4 w-4 text-primary" />
                    Adicionar
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Desktop Checkout Drawer */}
        <div className="hidden lg:col-span-5 lg:block">
          <Card variant="elevated" title="Resumo do Pedido" className="sticky top-6">
            {cartSummaryContent}
          </Card>
        </div>
      </div>

      {/* Recent Sales & Cancellation */}
      <section className="space-y-3">
        <h2 className="typo-title text-ink">Vendas Recentes do Turno</h2>
        <ResponsiveDataTable
          keyExtractor={(r) => r.id}
          emptyMessage="Nenhuma venda registrada ainda."
          data={recentSales}
          columns={[
            {
              key: 'id',
              header: 'Pedido',
              render: (r) => r.customer_name || `#${r.id.slice(0, 6)}`,
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => (
                <Badge sticker={r.status === 'completed' ? 'green' : 'orange'}>
                  {r.status === 'completed' ? 'Concluída' : 'Estornada'}
                </Badge>
              ),
            },
            {
              key: 'valor',
              header: 'Total',
              align: 'right',
              render: (r) => formatBRL(r.gross_amount),
            },
            {
              key: 'estorno',
              header: 'Ação',
              align: 'right',
              render: (r) =>
                canCancelSales && r.status === 'completed' ? (
                  <Button
                    size="sm"
                    variant="danger-utility"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        const res = await cancelPdvSaleAction(r.id);
                        if (res.error) setFeedback({ tone: 'warning', text: res.error });
                        else setFeedback({ tone: 'success', text: 'Venda estornada com sucesso.' });
                      });
                    }}
                  >
                    Estornar
                  </Button>
                ) : null,
            },
          ]}
        />
      </section>

      {/* Mobile Sticky Bottom Bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface p-3 shadow-elevated lg:hidden">
        <Button
          variant="primary"
          fullWidth
          onClick={() => setMobileCartOpen(true)}
        >
          <ShoppingBag className="h-4 w-4" />
          Ver Pedido ({cart.reduce((a, b) => a + b.quantity, 0)} itens) • {formatBRL(totalGross)}
        </Button>
      </div>

      <Modal
        open={mobileCartOpen}
        onClose={() => setMobileCartOpen(false)}
        title="Fechar Pedido no PDV"
      >
        {cartSummaryContent}
      </Modal>
    </div>
  );
}
