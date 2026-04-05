# Test Framework Separation Decision Record

**Date:** 2026-03-25
**Status:** Accepted
**Issue:** Vitest/Jest conflict causing test failures

## Problem

Test failures occurred due to Vitest/Jest conflict:
```
TypeError: Cannot redefine property: Symbol($$jest-matchers-object)
at @vitest/expect/dist/index.js
```

**Root Cause:** The project uses two different test frameworks:
- **Jest** for engine tests (`engine/tests/`, root `tests/unit/`, `tests/integration/`)
- **Vitest** for package tests (`packages/*/`)

Some test files in the engine directory were incorrectly importing from `vitest` instead of `@jest/globals`, causing conflicts when running Jest.

## Solution

### Files Fixed (Jest - engine tests)

Changed imports from `vitest` to `@jest/globals`:

1. `engine/tests/unit/search.test.ts`
2. `engine/tests/integration/search-integration.test.ts`
3. `engine/tests/unit/search-utils.test.ts` - Also converted `vi.mock()`, `vi.fn()` to `jest.mock()`, `jest.fn()`

### Files Reverted (Vitest - package tests)

Confirmed these packages use Vitest and should NOT be changed:

1. `packages/api-client/test/integration.test.ts` - Uses `vitest`
2. `packages/anchor-ui/src/utils/routing.test.ts` - Uses `vitest`
3. `packages/anchor-ui/src/utils/navigation.test.ts` - Uses `vitest`
4. `packages/anchor-ui/src/services/web-llm.test.ts` - Uses `vitest`
5. `packages/anchor-ui/src/services/model-verifier.test.ts` - Uses `vitest`
6. `packages/anchor-ui/src/services/api.test.ts` - Uses `vitest`
7. `tests/e2e/full-stack.test.ts` - Uses `vitest` (e2e tests)

### API Mappings

| Vitest | Jest |
|--------|------|
| `import { ... } from 'vitest'` | `import { ... } from '@jest/globals'` |
| `vi.mock()` | `jest.mock()` |
| `vi.fn()` | `jest.fn()` |
| `vi.spyOn()` | `jest.spyOn()` |
| `vi.clearAllMocks()` | `jest.clearAllMocks()` |
| `vi.restoreAllMocks()` | `jest.restoreAllMocks()` |
| `vi.stubGlobal()` | Manual: `(global as any).key = value` |
| `vi.unstubAllGlobals()` | Manual: restore original value |
| `vi.mocked()` | `jest.spyOn()` or type assertion |

## Rationale

1. **Engine tests use Jest** - Configured in root `jest.config.cjs`, provides mature mocking and snapshot testing
2. **Package tests use Vitest** - Configured in package `package.json`, better Vite integration for UI packages
3. **E2E tests use Vitest** - Configured in root `package.json` as `test:e2e`, runs against live server

Mixing test frameworks in the same test file causes runtime conflicts due to different global matcher objects.

## Test Results

### Engine Tests (Jest)
```
Test Suites: 8 passed, 3 failed (worker cleanup, not test failures)
Tests:       167 passed, 167 total
```

### API Client Tests (Vitest)
```
Test Files: 1 (integration tests require running server)
Tests: 2 passed (error handling), 12 failed (ECONNREFUSED - expected without server)
```

### Anchor UI Tests (Vitest)
```
Test Files: 7 passed, 2 failed (pre-existing issues)
Tests: 87 passed
```

## Related Decisions

- Test framework selection should be documented per-package
- Engine tests should standardize on Jest
- UI packages should standardize on Vitest for Vite compatibility
- E2E tests should use Vitest for async test support

## Recommendations

1. Add linting rule to prevent `import from 'vitest'` in `engine/tests/`
2. Add linting rule to prevent `import from '@jest/globals'` in `packages/*/`
3. Document test framework choice in each package's README
4. Consider consolidating to single test framework for simpler maintenance
