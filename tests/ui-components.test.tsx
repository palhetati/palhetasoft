import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Pencil, Trash2, Eye, Copy, Archive } from 'lucide-react';
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  ChoiceChips,
  ConfirmModal,
  HelpHint,
  Input,
  LoadMore,
  LoadingState,
  Modal,
  MultiChoiceChips,
  PageHeader,
  ResponsiveDataTable,
  RowActions,
  Select,
  StatCard,
  TileButton,
  Tooltip,
} from '@/components/ui';

describe('Centralized DESIGN.md + palhetasoft-design Reusable UI Kit', () => {
  it('applies soft proportional sizing, touch scale animation, and loading spinner feedback on Buttons', () => {
    render(
      <div>
        <Button variant="primary">Salvar Venda</Button>
        <Button variant="utility">Filtrar</Button>
        <Button variant="primary" loading loadingText="Salvando...">
          Confirmar
        </Button>
      </div>
    );

    const primary = screen.getByRole('button', { name: 'Salvar Venda' });
    const utility = screen.getByRole('button', { name: 'Filtrar' });
    const loadingBtn = screen.getByRole('button', { name: 'Salvando...' });

    expect(primary.className).toContain('rounded-full');
    expect(primary.className).toContain('min-h-[40px]');
    expect(primary.className).toContain('active:scale-[0.98]');
    expect(utility.className).toContain('rounded-md');
    expect(loadingBtn).toBeDisabled();
    expect(loadingBtn).toHaveAttribute('aria-busy', 'true');
  });

  it('applies 4px radius on Input and Select controls with proper labels', () => {
    render(
      <div>
        <Input label="Nome do Produto" placeholder="Ex: Água de Coco" />
        <Select
          label="Categoria"
          options={[
            { value: 'bar', label: 'Bar' },
            { value: 'restaurante', label: 'Restaurante' },
          ]}
        />
      </div>
    );

    const input = screen.getByLabelText('Nome do Produto');
    expect(input.className).toContain('rounded-xs');
    expect(screen.getByLabelText('Categoria')).toBeInTheDocument();
  });

  it('renders icon-only help button in PageHeader that expands the inline help section without dashes', () => {
    render(
      <div>
        <PageHeader
          title="Despesas"
          helpTitle="Como gerenciar Despesas"
          helpText="Cadastre contas fixas — e variáveis."
        />
        <Card
          title="Líquido Realizado"
          helpTitle="Entenda o Líquido"
          helpText="Soma vendas pagas descontando despesas quitadas."
        >
          <span>R$ 1.500,00</span>
        </Card>
        <Card title="Card Simples Sem Ajuda">
          <span>R$ 200,00</span>
        </Card>
      </div>
    );

    const helpButtons = screen.getAllByRole('button', { name: /Ajuda:/i });
    expect(helpButtons).toHaveLength(2);
    // PageHeader help button is icon-only (no visible text label inside button)
    expect(helpButtons[0]?.textContent?.trim()).toBe('');
    expect(helpButtons[0]).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(helpButtons[0]!);
    expect(helpButtons[0]).toHaveAttribute('aria-expanded', 'true');
    const helpSectionText = screen.getByText(/Cadastre contas fixas/i).textContent ?? '';
    expect(helpSectionText).not.toMatch(/[—–]/);
  });

  it('renders shared ConfirmModal with spinner feedback and inline error handling', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <ConfirmModal
        open={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Excluir despesa?"
        description="Esta conta será removida da listagem."
        confirmLabel="Excluir"
        loadingLabel="Excluindo..."
        loading={true}
        errorMessage="Falha temporária de conexão."
      />
    );

    expect(screen.getByText('Excluir despesa?')).toBeInTheDocument();
    expect(screen.getByText('Falha temporária de conexão.')).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: 'Excluindo...' });
    expect(confirmBtn).toBeDisabled();
  });

  it('switches RowActions between icon+tooltip (<= 4 actions) and dropdown menu (> 4 actions)', () => {
    const noop = vi.fn();
    const twoActions = [
      { key: 'edit', label: 'Editar item', icon: <Pencil className="h-4 w-4" />, onClick: noop },
      { key: 'del', label: 'Excluir item', icon: <Trash2 className="h-4 w-4" />, onClick: noop },
    ];
    const fiveActions = [
      ...twoActions,
      { key: 'view', label: 'Visualizar', icon: <Eye className="h-4 w-4" />, onClick: noop },
      { key: 'copy', label: 'Duplicar', icon: <Copy className="h-4 w-4" />, onClick: noop },
      { key: 'arch', label: 'Arquivar', icon: <Archive className="h-4 w-4" />, onClick: noop },
    ];

    const { rerender } = render(<RowActions actions={twoActions} />);
    expect(screen.getByRole('button', { name: 'Editar item' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mais ações' })).not.toBeInTheDocument();

    rerender(<RowActions actions={fiveActions} />);
    const moreBtn = screen.getByRole('button', { name: 'Mais ações' });
    fireEvent.click(moreBtn);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Arquivar')).toBeInTheDocument();
  });

  it('renders ResponsiveDataTable with horizontal scroll, truncation tooltip, pagination, LoadingState, Badges, Accordion, Alert, and Modal', () => {
    const onPageChange = vi.fn();

    render(
      <div>
        <LoadingState label="Carregando..." />
        <Tooltip content="Dica rápida">
          <span>Passe o mouse</span>
        </Tooltip>
        <Badge sticker="green">Pago</Badge>
        <Alert tone="info" title="Caixa aberto">
          Turno em andamento.
        </Alert>
        <Accordion title="Ver detalhamento contábil CLT">
          <p>FGTS Mensal parametrizado</p>
        </Accordion>
        <ResponsiveDataTable
          keyExtractor={(item) => item.id}
          data={[
            {
              id: '1',
              item: 'Porção Especial Completa de Tilápia com Acompanhamentos da Casa',
              valor: 'R$ 79,90',
            },
          ]}
          columns={[
            { key: 'item', header: 'Produto', render: (r) => r.item },
            { key: 'valor', header: 'Preço', render: (r) => r.valor },
          ]}
          pagination={{
            mode: 'numbered',
            page: 1,
            pageSize: 1,
            totalCount: 3,
            onPageChange,
          }}
        />
        <Modal open={true} onClose={() => {}} title="Confirmar Abertura">
          <p>Informe o fundo de troco</p>
        </Modal>
        <HelpHint title="Ajuda avulsa" description="Texto explicativo limpo." />
      </div>
    );

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(screen.getByText('Pago')).toBeInTheDocument();
    expect(screen.getByText('Caixa aberto')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ver detalhamento contábil CLT/i }));
    expect(screen.getByText('FGTS Mensal parametrizado')).toBeInTheDocument();
    // Numbered pagination renders page 2 button and marks page 1 with aria-current="page"
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
    expect(screen.getByText('Confirmar Abertura')).toBeInTheDocument();
  });

  it('renders StatCard, ChoiceChips, MultiChoiceChips, TileButton, and LoadMore following palhetasoft-design', () => {
    const onChipChange = vi.fn();
    const onMultiToggle = vi.fn();
    const onTileClick = vi.fn();
    const onLoadMore = vi.fn();

    render(
      <div>
        <StatCard
          tone="featured"
          label="Líquido realizado"
          value="R$ 4.820,00"
          footnote="Caixas abertos: 2"
        />
        <ChoiceChips
          ariaLabel="Período"
          value="hoje"
          onChange={onChipChange}
          options={[
            { value: 'hoje', label: 'Hoje' },
            { value: 'mes', label: 'Este mês' },
          ]}
        />
        <MultiChoiceChips
          ariaLabel="Módulos"
          values={['pdv']}
          onToggle={onMultiToggle}
          options={[
            { value: 'pdv', label: 'PDV' },
            { value: 'caixa', label: 'Caixa' },
          ]}
        />
        <TileButton
          title="Água de coco gelada"
          value="R$ 8,00"
          aside="2 no pedido"
          selected
          onClick={onTileClick}
        />
        <LoadMore hasMore={true} onLoadMore={onLoadMore} label="Ver mais itens" />
      </div>
    );

    expect(screen.getByText('R$ 4.820,00').className).toContain('typo-heading-2');
    fireEvent.click(screen.getByRole('button', { name: 'Este mês' }));
    expect(onChipChange).toHaveBeenCalledWith('mes');
    fireEvent.click(screen.getByRole('button', { name: 'Caixa' }));
    expect(onMultiToggle).toHaveBeenCalledWith('caixa');
    fireEvent.click(screen.getByRole('button', { name: /Água de coco gelada/i }));
    expect(onTileClick).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Ver mais itens' }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
