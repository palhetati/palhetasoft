export interface ParametroWebRow {
  id: string;
  establishment_id: string | null;
  chave_parametro: string;
  valor_parametro: string;
  descricao: string | null;
  updated_at?: string;
}
