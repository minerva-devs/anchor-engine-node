/**
 * Jest Configuration for Anchor Engine
 *
 * Runs Jest-style tests only.
 * Standalone test scripts (tests/unit/*.ts) are run via ts-node/tsm separately.
 */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',

  // Test file patterns - ONLY Jest-style tests
  testMatch: [
    '**/engine/tests/**/*.test.ts',
    '**/engine/src/**/*.test.ts'
    // Note: cpp/tests/*.test.js excluded - requires native modules
  ],

  // Files to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/context_data/',
    '\\.d\\.ts$', // Ignore declaration files
    'pglite-database.test.ts', // Requires Vitest: PGlite WASM/ESM module-linking conflict with Jest
    'physics_walker.test.ts'   // Requires Vitest: PGlite WASM/ESM module-linking conflict with Jest
  ],

  // Module path ignore patterns (resolve Haste collisions)
  modulePathIgnorePatterns: [
    '<rootDir>/engine/native/',
    '<rootDir>/engine/src/native/',
    '<rootDir>/cpp/'
  ],

  // Module resolution for ESM
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@anchor/(.*)$': '<rootDir>/packages/$1/src',
    '^@anchor-engine/native$': '<rootDir>/engine/tests/mocks/native-mock.js'
  },

  // Extensions to resolve
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Transform settings
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          moduleResolution: 'node',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          target: 'ES2022',
          skipLibCheck: true,
          isolatedModules: true
        }
      }
    ]
  },

  // Don't transform node_modules
  transformIgnorePatterns: [
    'node_modules/'
  ],

  // Coverage settings
  collectCoverageFrom: [
    'engine/src/**/*.ts',
    '!engine/src/**/*.d.ts',
    '!engine/src/types/**'
  ],

  coverageDirectory: 'coverage',

  // Reporter settings
  reporters: ['default'],

  // Test timeout (30 seconds)
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Don't collect coverage by default
  collectCoverage: false,

  // Stop tests on first error
  bail: false
};
