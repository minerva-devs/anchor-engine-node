# Test Suite Documentation

**Last Updated:** March 1, 2026  
**Status:** ✅ Operational

---

## Overview

The Anchor Engine test suite has been restructured to use **Jest** for unit tests with proper ESM (ECMAScript Modules) support. This document describes the test structure, how to run tests, and what's tested.

---

## Test Structure

```
anchor-engine-node/
├── jest.config.cjs              # Jest configuration
├── package.json                 # Test scripts
├── engine/
│   ├── src/
│   │   └── services/search/
│   │       └── llm-context-formatter.test.ts  ✅ Jest test
│   └── tests/
│       └── unit/
│           └── pglite-database.test.ts        ⚠️ Requires --experimental-vm-modules
├── tests/
│   └── unit/
│       └── test_atomizer_logic.ts             📝 Standalone script
└── cpp/
    └── tests/
        └── simhash.test.js                    ⚠️ Requires native modules
```

---

## Running Tests

### Jest Tests (Recommended)

```bash
# Run all Jest tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Standalone Test Scripts

Some tests are standalone TypeScript scripts that run via `ts-node`:

```bash
# Run standalone atomizer test
pnpm test:standalone
```

### All Tests

```bash
# Run Jest + standalone tests
pnpm test:all
```

---

## Test Coverage

### ✅ Passing Tests (7 tests)

**LLMContextFormatter** (`engine/src/services/search/llm-context-formatter.test.ts`)

| Test | Description |
|------|-------------|
| `format` - basic | Formats context with entities, themes, and atoms |
| `format` - entities | Extracts entities from atoms |
| `format` - themes | Clusters themes from atoms |
| `format` - relevance | Ranks atoms by relevance score |
| `format` - gaps | Performs gap analysis |
| JSON output | Produces valid JSON |
| Token estimation | Estimates token count reasonably |

---

### ⚠️ Skipped Tests

**PGlite Database** (`engine/tests/unit/pglite-database.test.ts`)

- **Status:** Skipped (requires `--experimental-vm-modules` flag)
- **Reason:** PGlite uses WASM and requires special Jest configuration
- **To run:** `node --experimental-vm-modules node_modules/.bin/jest --config jest.config.cjs`

**Native Module Tests** (`cpp/tests/*.test.js`)

- **Status:** Skipped
- **Reason:** Requires native C++ modules to be built
- **To run:** Build native modules first, then run with `--experimental-vm-modules`

---

## Test Architecture

### Jest Configuration

- **Preset:** `ts-jest/presets/default-esm`
- **Environment:** Node.js
- **Module System:** ESM (ECMAScript Modules)
- **Transform:** TypeScript via `ts-jest`

### Key Settings

```javascript
{
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  testMatch: [
    '**/engine/tests/**/*.test.ts',
    '**/engine/src/**/*.test.ts'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }]
  }
}
```

---

## Writing New Tests

### Jest Test Template

```typescript
import { describe, test, expect, beforeEach } from '@jest/globals';
import { YourService } from './your-service.js';

describe('YourService', () => {
  let service: YourService;

  beforeEach(() => {
    service = new YourService();
  });

  test('should do something', () => {
    const result = service.doSomething();
    expect(result).toBeDefined();
  });
});
```

### File Naming

- **Jest tests:** `*.test.ts`
- **Location:** `engine/src/**` or `engine/tests/**`
- **Standalone scripts:** `tests/unit/test_*.ts`

---

## Troubleshooting

### "Cannot use 'import.meta' outside a module"

**Cause:** Test file uses ESM syntax but Jest isn't configured for ESM.

**Solution:** Ensure test file matches `*.test.ts` pattern and uses `@jest/globals` imports.

### "A dynamic import callback was invoked without --experimental-vm-modules"

**Cause:** Testing WASM-based modules (like PGlite).

**Solution:** Run with flag:
```bash
node --experimental-vm-modules node_modules/.bin/jest --config jest.config.cjs
```

### "Jest encountered an unexpected token"

**Cause:** Importing a module that Jest can't transform.

**Solution:** Add module to `transformIgnorePatterns` or mock it.

---

## Future Improvements

1. **Enable PGlite tests** - Add `--experimental-vm-modules` to test script
2. **Integration tests** - End-to-end tests with running server
3. **Performance tests** - Benchmark ingestion and search latency
4. **Coverage thresholds** - Enforce minimum coverage (e.g., 80%)

---

## Migration Notes

### Removed Tests

- `sqlite-database.test.ts` - Legacy SQLite adapter (replaced by PGlite)
- `cpp/tests/*.test.js` - Native module tests (require build)

### Converted Tests

- `llm-context-formatter.test.ts` - Converted from standalone script to Jest
- `pglite-database.test.ts` - Created for PGlite (requires special flags)

---

## See Also

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ts-jest Documentation](https://kulshekhar.github.io/ts-jest/)
- [PGlite Documentation](https://github.com/electric-sql/pglite)
