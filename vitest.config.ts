import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    globalSetup: ['__tests__/global-setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}']
  }
});
