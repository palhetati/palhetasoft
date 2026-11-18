export const TAX_REGIME_LABELS: Record<string, string> = {
  simples_nacional: 'Simples Nacional',
  lucro_presumido: 'Lucro Presumido',
  lucro_real: 'Lucro Real',
  mei: 'Microempreendedor Individual (MEI)',
};

export const BUSINESS_VERTICAL_LABELS: Record<string, string> = {
  balneario: 'Balneário e lazer',
  general: 'Comércio e alimentação',
};

export const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  bar: 'Bar e bebidas',
  restaurante: 'Restaurante e cozinha',
  portaria: 'Portaria e acesso',
  loja: 'Loja e conveniência',
  geral: 'Itens gerais',
};

export const MODULE_SCOPE_LABELS: Record<string, string> = {
  core_erp: 'Padrão do sistema',
  balneario: 'Módulo balneário',
  super_admin: 'Administração central',
};

export const PARAMETER_KEY_LABELS: Record<string, string> = {
  clt_tributos_vigentes: 'Regras e encargos trabalhistas (CLT)',
  paginacao_padrao_grid: 'Quantidade de itens por página',
};

export const SALE_STATUS_LABELS: Record<string, string> = {
  completed: 'Concluída',
  cancelled: 'Estornada',
};

export const EXPENSE_STATUS_LABELS: Record<string, string> = {
  paid: 'Paga',
  pending: 'Pendente',
  cancelled: 'Cancelada',
};

export const EXPENSE_TYPE_LABELS: Record<string, string> = {
  fixed: 'Fixa',
  variable: 'Variável',
};

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  clt: 'Carteira assinada (CLT)',
  non_clt: 'Diarista / prestador',
};

export const CASH_MOVEMENT_LABELS: Record<string, string> = {
  supply_inflow: 'Suprimento de troco',
  bleed_outflow: 'Sangria',
};

export function humanizeTaxRegime(code?: string | null): string {
  if (!code) return 'Simples Nacional';
  return TAX_REGIME_LABELS[code] ?? code;
}

export function humanizeVertical(code?: string | null): string {
  if (!code) return 'Comércio e alimentação';
  return BUSINESS_VERTICAL_LABELS[code] ?? code;
}

export function humanizeCategory(code?: string | null): string {
  if (!code) return 'Itens gerais';
  return PRODUCT_CATEGORY_LABELS[code] ?? code;
}

export function humanizeModuleScope(code?: string | null): string {
  if (!code) return 'Padrão do sistema';
  return MODULE_SCOPE_LABELS[code] ?? code;
}

export function humanizeParameterKey(key: string): string {
  return PARAMETER_KEY_LABELS[key] ?? 'Configuração geral do sistema';
}

export function humanizeSaleStatus(status?: string | null): string {
  if (!status) return 'Concluída';
  return SALE_STATUS_LABELS[status] ?? 'Concluída';
}

export function humanizeExpenseStatus(status?: string | null): string {
  if (!status) return 'Pendente';
  return EXPENSE_STATUS_LABELS[status] ?? 'Pendente';
}

export function humanizeExpenseClassification(
  expenseType?: string | null,
  isProvision?: boolean
): string {
  if (isProvision) return 'Reserva CLT';
  if (!expenseType) return 'Variável';
  return EXPENSE_TYPE_LABELS[expenseType] ?? 'Variável';
}

export function humanizeContractType(contractType?: string | null): string {
  if (!contractType) return 'Carteira assinada (CLT)';
  return CONTRACT_TYPE_LABELS[contractType] ?? 'Carteira assinada (CLT)';
}
