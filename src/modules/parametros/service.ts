import { validateUserFacingCopy } from '@/lib/copy-guard';
import type { ParametroWebRow } from './types';

export function resolveParametroValue<T>(
  rows: ParametroWebRow[],
  chave: string,
  establishmentId?: string | null
): T | null {
  const matching = rows.filter((r) => r.chave_parametro === chave);
  if (matching.length === 0) return null;

  const tenantMatch = establishmentId
    ? matching.find((r) => r.establishment_id === establishmentId)
    : undefined;
  const globalMatch = matching.find((r) => r.establishment_id === null);
  const chosen = tenantMatch ?? globalMatch;

  if (!chosen) return null;

  try {
    return JSON.parse(chosen.valor_parametro) as T;
  } catch {
    return chosen.valor_parametro as unknown as T;
  }
}

export function validateModuleHelpPayload(payload: {
  helpTitle: string;
  helpText: string;
}): { valid: boolean; reason?: string } {
  if (!payload.helpTitle.trim() || !payload.helpText.trim()) {
    return { valid: false, reason: 'Preencha o título e a explicação de ajuda do módulo.' };
  }
  const titleCheck = validateUserFacingCopy(payload.helpTitle);
  if (!titleCheck.valid) return titleCheck;

  const textCheck = validateUserFacingCopy(payload.helpText);
  if (!textCheck.valid) return textCheck;

  return { valid: true };
}
