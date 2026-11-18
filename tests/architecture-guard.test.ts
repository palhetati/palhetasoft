import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { validateUserFacingCopy } from '@/lib/copy-guard';

function listFilesRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

describe('Global Architectural Guardrails (palhetasoft-design, UI Reuse, Contextual Help, No Dashes, Parameterized CLT)', () => {
  it('forbids raw <button>, <input>, <select>, or <textarea> tags outside src/components/ui', () => {
    const dirsToCheck = [
      path.resolve(process.cwd(), 'src/app'),
      path.resolve(process.cwd(), 'src/components/layout'),
      path.resolve(process.cwd(), 'src/modules'),
    ];

    const files = dirsToCheck.flatMap(listFilesRecursive);
    const forbiddenTagRegex = /<(button|input|select|textarea)[\s>]/;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      expect(
        forbiddenTagRegex.test(content),
        `Raw form/button HTML tag found in ${path.relative(process.cwd(), file)}; import from @/components/ui instead.`
      ).toBe(false);
    }
  });

  it('ensures every ERP module route lives inside a Card and renders PageHeader with contextual (?) help', () => {
    const erpRoutes = [
      'dashboard',
      'pdv',
      'caixa',
      'despesas',
      'funcionarios',
      'produtos',
      'admin',
    ];

    for (const route of erpRoutes) {
      const routeDir = path.resolve(process.cwd(), `src/app/(erp)/${route}`);
      const routeFiles = listFilesRecursive(routeDir);
      const combinedSource = routeFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

      expect(
        combinedSource.includes('<PageHeader'),
        `Missing PageHeader (?) on /${route}`
      ).toBe(true);
      expect(
        combinedSource.includes('<Card'),
        `Missing structural Card wrapper on /${route}`
      ).toBe(true);
      expect(
        combinedSource.includes('flex-col'),
        `Missing flex-col structural stacking on /${route}`
      ).toBe(true);
    }
  });

  it('forbids window.confirm, window.alert, and window.prompt across the entire codebase', () => {
    const srcFiles = listFilesRecursive(path.resolve(process.cwd(), 'src'));
    const nativeDialogRegex = /\bwindow\.(confirm|alert|prompt)\s*\(/;
    for (const file of srcFiles) {
      const content = fs.readFileSync(file, 'utf8');
      expect(
        nativeDialogRegex.test(content),
        `Native browser dialog found in ${path.relative(process.cwd(), file)}; use shared ConfirmModal instead.`
      ).toBe(false);
    }
  });

  it('enforces zero em-dashes, en-dashes, or double-hyphen dashes across all UI and page components', () => {
    const uiFiles = [
      ...listFilesRecursive(path.resolve(process.cwd(), 'src/app')),
      ...listFilesRecursive(path.resolve(process.cwd(), 'src/components')),
    ];

    for (const file of uiFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const res = validateUserFacingCopy(content);
      expect(res.valid, `Forbidden dash found in ${path.relative(process.cwd(), file)}`).toBe(
        true
      );
    }
  });

  it('keeps CLT calculator 100% free of hardcoded INSS bracket thresholds', () => {
    const calcSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/modules/employees/clt-calculator.ts'),
      'utf8'
    );
    expect(calcSource).not.toMatch(/1518|2793|4190|8157/);
  });
});
