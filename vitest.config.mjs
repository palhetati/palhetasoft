import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

try {
  const defaultVitestDir = path.join(
    process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'),
    'vitest'
  );
  fs.mkdirSync(defaultVitestDir, { recursive: true });
} catch {
  process.env.LOCALAPPDATA = os.tmpdir();
}

export default defineConfig({
  cacheDir: path.join(os.tmpdir(), 'palhetasoft-vitest-cache'),
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    fsModuleCache: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
