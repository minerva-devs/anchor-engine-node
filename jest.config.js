/**
 * Jest Configuration for Anchor Engine
 * 
 * Supports both JavaScript and TypeScript tests
 */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.test.js',
    '**/tests/unit/*.ts',
    '**/engine/tests/**/*.ts'
  ],
  
  // Files to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/context_data/',
    'test_context_quality_improvements.ts'  // Uses custom runner
  ],
  
  // Module resolution
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@anchor/(.*)$': '<rootDir>/packages/$1/src'
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
          skipLibCheck: true
        }
      }
    ]
  },
  
  // Coverage settings
  collectCoverageFrom: [
    'engine/src/**/*.ts',
    '!engine/src/**/*.d.ts',
    '!engine/src/types/**'
  ],
  
  coverageDirectory: 'coverage',
  
  // Reporter settings
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'reports',
      outputName: 'jest-results.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: 'true'
    }]
  ],
  
  // Test timeout (30 seconds)
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Collect coverage
  collectCoverage: false,
  
  // Coverage thresholds (adjust as needed)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/framework/config.ts'],
  
  // Global test utilities
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
};
