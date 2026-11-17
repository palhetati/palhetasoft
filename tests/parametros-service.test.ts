import { describe, expect, it } from 'vitest';
import {
  resolveParametroValue,
  validateModuleHelpPayload,
} from '@/modules/parametros/service';
import type { ParametroWebRow } from '@/modules/parametros/types';

describe('parametros_web resolution & Admin governance validation', () => {
  it('prefers establishment-specific parameter override over global NULL row', () => {
    const rows: ParametroWebRow[] = [
      {
        id: 'p-global',
        establishment_id: null,
        chave_parametro: 'clt_tributos_vigentes',
        valor_parametro: JSON.stringify({ fgtsRate: 8, vtEmployeeCapPercent: 6 }),
        descricao: 'Global',
      },
      {
        id: 'p-tenant',
        establishment_id: 'est-special',
        chave_parametro: 'clt_tributos_vigentes',
        valor_parametro: JSON.stringify({ fgtsRate: 2, vtEmployeeCapPercent: 6 }),
        descricao: 'Regime aprendiz ou especial',
      },
    ];

    const forOther = resolveParametroValue<{ fgtsRate: number }>(
      rows,
      'clt_tributos_vigentes',
      'est-normal'
    );
    expect(forOther?.fgtsRate).toBe(8);

    const forSpecial = resolveParametroValue<{ fgtsRate: number }>(
      rows,
      'clt_tributos_vigentes',
      'est-special'
    );
    expect(forSpecial?.fgtsRate).toBe(2);
  });

  it('rejects module help_title or help_text containing em-dashes or en-dashes', () => {
    const clean = validateModuleHelpPayload({
      helpTitle: 'Como usar o Caixa',
      helpText: 'Abra seu turno com o saldo inicial de troco e feche ao final do expediente.',
    });
    expect(clean.valid).toBe(true);

    const withDash = validateModuleHelpPayload({
      helpTitle: 'Caixa — Ajuda',
      helpText: 'Texto normal.',
    });
    expect(withDash.valid).toBe(false);
  });
});
