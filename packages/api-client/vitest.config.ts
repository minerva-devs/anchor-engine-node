import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@rbalchii/anchor-client',
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', 'test']
    },
    testTimeout: 30000,
    hookTimeout: 10000
  }
});
