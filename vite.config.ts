/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'netlify/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/utils/**', 'src/prompts/**', 'netlify/functions/**'],
      exclude: ['**/__tests__/**'],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 70 },
    },
  },
});
