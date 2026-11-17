import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  HelpHint,
  Input,
  Modal,
  PageHeader,
  ResponsiveDataTable,
  Select,
} from '@/components/ui';

describe('Centralized DESIGN.md Reusable UI Kit', () => {
  it('applies pill radius on primary buttons and 8px radius on utility buttons with 44px touch targets', () => {
    render(
      <div>
        <Button variant="primary">Salvar Venda</Button>
        <Button variant="utility">Filtrar</Button>
      </div>
    );

    const primary = screen.getByRole('button', { name: 'Salvar Venda' });
    const utility = screen.getByRole('button', { name: 'Filtrar' });

    expect(primary.className).toContain('rounded-full');
    expect(primary.className).toContain('min-h-[44px]');
    expect(utility.className).toContain('rounded-md');
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

  it('renders HelpHint (?) in PageHeader and selective Cards, opening dash-free explanation on click', () => {
    render(
      <div>
        <PageHeader
          title="Despesas"
          helpTitle="Como gerenciar Despesas"
          helpText="Cadastre contas fixas — e variáveis."
        />
        <Card title="Líquido Realizado" helpTitle="Entenda o Líquido" helpText="Soma vendas pagas descontando despesas quitadas.">
          <span>R$ 1.500,00</span>
        </Card>
        <Card title="Card Simples Sem Ajuda">
          <span>R$ 200,00</span>
        </Card>
      </div>
    );

    // 2 HelpHint buttons total (1 in PageHeader + 1 in strategic Card, NOT on simple Card)
    const helpButtons = screen.getAllByRole('button', { name: /Ajuda:/i });
    expect(helpButtons).toHaveLength(2);

    fireEvent.click(helpButtons[0]);
    const dialogText = screen.getByText(/Cadastre contas fixas/i).textContent ?? '';
    expect(dialogText).not.toMatch(/[—–]/);
  });

  it('renders ResponsiveDataTable rows, Badges, Accordion, Alert, and Modal', () => {
    render(
      <div>
        <Badge sticker="green">Pago</Badge>
        <Alert tone="info" title="Caixa aberto">
          Turno em andamento.
        </Alert>
        <Accordion title="Ver detalhamento contábil CLT">
          <p>FGTS Mensal parametrizado</p>
        </Accordion>
        <ResponsiveDataTable
          keyExtractor={(item) => item.id}
          data={[{ id: '1', item: 'Cerveja', valor: 'R$ 7,50' }]}
          columns={[
            { key: 'item', header: 'Produto', render: (r) => r.item },
            { key: 'valor', header: 'Preço', render: (r) => r.valor },
          ]}
        />
        <Modal open={true} onClose={() => {}} title="Confirmar Abertura">
          <p>Informe o fundo de troco</p>
        </Modal>
        <HelpHint title="Ajuda avulsa" description="Texto explicativo limpo." />
      </div>
    );

    expect(screen.getByText('Pago')).toBeInTheDocument();
    expect(screen.getByText('Caixa aberto')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ver detalhamento contábil CLT/i }));
    expect(screen.getByText('FGTS Mensal parametrizado')).toBeInTheDocument();
    expect(screen.getAllByText('Cerveja').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Confirmar Abertura')).toBeInTheDocument();
  });
});
