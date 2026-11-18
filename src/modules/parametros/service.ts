import { validateUserFacingCopy } from '@/lib/copy-guard';
import type { ParametroWebRow } from './types';

export function resolveParametroValue<T>(
  rows: ParametroWebRow[],
  chave: string,
  establishmentId?: string | null,
  expectJson: boolean = true
): T | null {
  const matching = rows.filter((r) => r.chave_parametro === chave);
  if (matching.length === 0) return null;

  const tenantMatch = establishmentId
    ? matching.find((r) => r.establishment_id === establishmentId)
    : undefined;
  const globalMatch = matching.find((r) => r.establishment_id === null);
  const chosen = tenantMatch ?? globalMatch;

  if (!chosen) return null;

  if (!expectJson) {
    return chosen.valor_parametro as unknown as T;
  }

  try {
    return JSON.parse(chosen.valor_parametro) as T;
  } catch {
    return null;
  }
}

export function validateCltParametroJson(raw: string): { valid: boolean; reason?: string } {
  try {
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.fgtsRate !== 'number' ||
      !Array.isArray(parsed.inssBrackets) ||
      parsed.inssBrackets.length === 0 ||
      !Array.isArray(parsed.irrfBrackets) ||
      typeof parsed.vtEmployeeCapPercent !== 'number' ||
      typeof parsed.thirteenthFraction !== 'number' ||
      typeof parsed.vacationMonthlyFraction !== 'number' ||
      typeof parsed.vacationBonusFraction !== 'number' ||
      !parsed.dueDays ||
      typeof parsed.dueDays.salaryDay !== 'number'
    ) {
      return {
        valid: false,
        reason:
          'O JSON de clt_tributos_vigentes precisa conter fgtsRate, inssBrackets, irrfBrackets, frações de 13º e férias, vtEmployeeCapPercent e dueDays.',
      };
    }
    return { valid: true };
  } catch {
    return {
      valid: false,
      reason: 'O valor informado para clt_tributos_vigentes não é um JSON válido.',
    };
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
