import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { validateUserFacingCopy } from '@/lib/copy-guard';
import { formatBRL, roundCents } from '@/lib/formatters';

describe('DESIGN.md token fidelity & copy guard', () => {
  it('defines exact brand, surface, ink, hairline and sticker variables from DESIGN.md', () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');
    expect(css).toContain('--color-primary: #0075de;');
    expect(css).toContain('--color-primary-active: #005bab;');
    expect(css).toContain('--color-secondary: #213183;');
    expect(css).toContain('--color-canvas-soft: #f6f5f4;');
    expect(css).toContain('--color-surface: #ffffff;');
    expect(css).toContain('--color-hairline: #e6e6e6;');
    expect(css).toContain('--radius-xs: 4px;');
    expect(css).toContain('--radius-md: 8px;');
    expect(css).toContain('--radius-lg: 12px;');
    expect(css).toContain('--radius-xl: 16px;');
  });

  it('rejects em-dashes and en-dashes in user-facing copy', () => {
    expect(validateUserFacingCopy('Gerencie suas vendas e acompanhe o caixa do dia.').valid).toBe(true);
    expect(validateUserFacingCopy('Caixa — abertura e fechamento').valid).toBe(false);
    expect(validateUserFacingCopy('Período 01–30').valid).toBe(false);
  });

  it('formats BRL currency and rounds cents deterministically', () => {
    expect(roundCents(10.555)).toBe(10.56);
    expect(formatBRL(1234.5)).toMatch(/1\.234,50/);
  });
});
