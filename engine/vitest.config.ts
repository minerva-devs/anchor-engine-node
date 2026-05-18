import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // Ensure tree-sitter-wasms resolves correctly in vitest
      'tree-sitter-wasms': path.resolve(__dirname, 'node_modules/tree-sitter-wasms/out'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/benchmarks/**/*.test.ts',
      '../tests/e2e/**/*.test.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      '**/coverage/**',
      '.anchor/local-data/inbox/**',
    ],
    unstubAllExports: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'tests/**/*.test.ts'],
      exclude: [
        'src/types/**/*.ts',
        'src/index.ts',
        '**/*.d.ts',
      ],
    },
    testTimeout: 30000,
    hookTimeout: 10000,
    reporters: ['verbose'],
    define: {
      __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
      __TEST__: JSON.stringify(true),
    },
  },
});

// Engine setup file (separate)