import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      '**/coverage/**',
      '.anchor/local-data/inbox/**',
    ],
    unstubExports: {
      'fs': {},
    },
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