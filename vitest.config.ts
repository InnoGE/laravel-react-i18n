import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    globalSetup: ['__tests__/global-setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      // InnoGE baseline: never lower these; delete dead code instead.
      thresholds: { 100: true }
    }
  }
});
