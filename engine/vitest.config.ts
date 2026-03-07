import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Only Vitest-specific tests (PGlite WASM/ESM requires Vitest, not Jest)
    include: [
      'tests/**/*.vitest.ts',
      'tests/**/*.vitest.js',
    ],
    testTimeout: 60000, // PGlite init can take time
    // No jsdom — pure Node environment for engine tests
    pool: 'forks',       // Each test file in a fresh fork (PGlite has global WASM state)
    forks: { singleFork: false },
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/types/**'],
    },
  },
  resolve: {
    // Rewrite .js imports → .ts (same as Jest moduleNameMapper)
    conditions: ['import', 'node'],
  },
});
