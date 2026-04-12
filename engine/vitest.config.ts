import { defineConfig } from 'vitest/config';

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
    ],
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
    setupFiles: ['./tests/setup.ts'],
    define: {
      __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
      __TEST__: JSON.stringify(true),
    },
  },
});
