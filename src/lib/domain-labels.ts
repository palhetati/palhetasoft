export const TAX_REGIME_LABELS: Record<string, string> = {
  simples_nacional: 'Simples Nacional',
  lucro_presumido: 'Lucro Presumido',
  lucro_real: 'Lucro Real',
  mei: 'Microempreendedor Individual (MEI)',
};

export const BUSINESS_VERTICAL_LABELS: Record<string, string> = {
  balneario: 'Balneário e Lazer',
  general: 'Comércio e Alimentação',
};

export const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  bar: 'Bar e Bebidas',
  restaurante: 'Restaurante e Cozinha',
  portaria: 'Portaria e Acesso',
  loja: 'Loja e Conveniência',
  geral: 'Itens Gerais',
};

export const MODULE_SCOPE_LABELS: Record<string, string> = {
  core_erp: 'Padrão do Sistema',
  balneario: 'Módulo Balneário',
  super_admin: 'Administração Central',
};

export const PARAMETER_KEY_LABELS: Record<string, string> = {
  clt_tributos_vigentes: 'Regras e Encargos Trabalhistas (CLT)',
  paginacao_padrao_grid: 'Quantidade de Itens por Página',
};

export function humanizeTaxRegime(code?: string | null): string {
  if (!code) return 'Simples Nacional';
  return TAX_REGIME_LABELS[code] ?? code;
}

export function humanizeVertical(code?: string | null): string {
  if (!code) return 'Comércio Geral';
  return BUSINESS_VERTICAL_LABELS[code] ?? code;
}

export function humanizeCategory(code?: string | null): string {
  if (!code) return 'Itens Gerais';
  return PRODUCT_CATEGORY_LABELS[code] ?? code;
}

export function humanizeParameterKey(key: string): string {
  return PARAMETER_KEY_LABELS[key] ?? 'Configuração Geral do Sistema';
}
