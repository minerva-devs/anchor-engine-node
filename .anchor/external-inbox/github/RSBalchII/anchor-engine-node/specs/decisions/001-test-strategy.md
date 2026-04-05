# Decision Record 001: Test Strategy

**Status:** Active  
**Date:** 2026-03-25  
**Author:** Anchor Engine Team  
**Related Standards:** Standard 002 (Reproducible Benchmarking), Standard 010 (Test Coverage Requirements)

---

## Problem

Anchor Engine requires a comprehensive testing strategy that balances:
- **Speed** - Fast feedback for developers
- **Coverage** - Comprehensive validation of all components
- **Reliability** - Deterministic, reproducible results
- **Resource Efficiency** - Minimal memory and CPU usage during tests

Previous testing approaches had issues with:
- Flaky E2E tests dependent on external services
- Slow test suites blocking CI/CD pipelines
- Inconsistent test environments across platforms (Linux, macOS, Windows, Termux)
- Missing coverage for critical paths (WASM modules, PGlite operations)

---

## Solution

Implement a **multi-tier testing strategy** with clear separation of concerns:

### Tier 1: Unit Tests (Fast, Isolated)

**Location:** `engine/src/**/*.test.ts`, `engine/tests/unit/`

**Purpose:** Test individual functions and classes in isolation

**Characteristics:**
- Execution time: <100ms per test
- No external dependencies
- Mock all I/O operations
- Run on every code change

**Example:**
```typescript
import { describe, it, expect } from '@jest/globals';
import { atomizeContent } from '../atomizer';

describe('atomizeContent', () => {
  it('should split content into molecules', () => {
    const content = 'Line 1\nLine 2\nLine 3';
    const result = atomizeContent(content);
    expect(result.molecules).toHaveLength(3);
  });
});
```

### Tier 2: Integration Tests (Moderate Speed)

**Location:** `tests/integration_db/`, `engine/tests/integration/`

**Purpose:** Test component interactions

**Characteristics:**
- Execution time: <5s per test
- Use in-memory PGlite instance
- Test database operations
- Test file system interactions

**Example:**
```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Database } from '../../src/core/db';

describe('Database Integration', () => {
  let db: Database;

  beforeAll(async () => {
    db = new Database({ inMemory: true });
    await db.initialize();
  });

  afterAll(async () => {
    await db.shutdown();
  });

  it('should ingest and retrieve atoms', async () => {
    await db.ingestAtom({ content: 'test', source: 'test.md' });
    const results = await db.search('test');
    expect(results.length).toBeGreaterThan(0);
  });
});
```

### Tier 3: End-to-End Tests (Slow, Comprehensive)

**Location:** `tests/e2e/`

**Purpose:** Test complete workflows with running engine

**Characteristics:**
- Execution time: <30s per test
- Require running engine instance
- Test full API workflows
- Validate real-world scenarios

**Example:**
```typescript
import { describe, it, expect } from 'vitest';
import { AnchorClient } from '@rbalchii/anchor-client';

describe('E2E: Ingest → Search → Distill', () => {
  const client = new AnchorClient({ baseUrl: 'http://localhost:3160' });

  it('should complete full workflow', async () => {
    // Ingest
    await client.ingest({
      content: 'Test content about OAuth',
      filename: 'test.md',
      bucket: 'inbox'
    });

    // Search
    const searchResults = await client.search('OAuth');
    expect(searchResults.results.length).toBeGreaterThan(0);

    // Distill
    const distillResult = await client.distill({
      seed: { query: 'OAuth' },
      radius: 2
    });
    expect(distillResult.status).toBe('success');
  });
});
```

### Tier 4: Performance Benchmarks

**Location:** `tests/benchmarks/`, `benchmarks/`

**Purpose:** Validate performance requirements

**Characteristics:**
- Measure latency, throughput, memory usage
- Run on standardized hardware profiles
- Track regressions over time

**Benchmarks:**
| Metric | Target | Measurement |
|--------|--------|-------------|
| Search latency (p95) | <200ms | `tests/benchmarks/search-latency.ts` |
| Ingestion throughput | >1MB/s | `tests/benchmarks/ingestion-throughput.ts` |
| Memory usage (idle) | <600MB | `tests/benchmarks/memory-idle.ts` |
| Memory usage (peak) | <1.6GB | `tests/benchmarks/memory-peak.ts` |

---

## Test Organization

### A/B Test Classification

**A Tests (Basic/Core):**
- Simple operations (search, ingest, read)
- Single-component tests
- Unit tests
- Core UI features

**B Tests (Advanced/Extended):**
- Complex workflows (ingest → search → distill)
- Multi-component integration
- E2E tests
- Advanced UI features (filters, pagination)

### File Naming Convention

```
<component>.<test-type>.test.ts

Examples:
- atomizer.unit.test.ts      # Unit tests for atomizer
- database.integration.test.ts # Integration tests for database
- search.e2e.test.ts         # E2E tests for search API
- latency.benchmark.test.ts  # Performance benchmarks
```

---

## Test Execution

### Local Development

```bash
# Run all tests
pnpm test

# Run specific test suite
pnpm test -- --testPathPattern=atomizer

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test:watch

# Run E2E tests (requires running engine)
pnpm test:e2e

# Run standalone tests (ts-node)
pnpm test:standalone
```

### CI/CD Pipeline

```yaml
# .github/workflows/tests.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      
      - run: pnpm install
      - run: pnpm build
      
      # Tier 1: Unit tests
      - run: pnpm test
        name: Unit Tests
      
      # Tier 2: Integration tests
      - run: pnpm test:integration
        name: Integration Tests
      
      # Tier 3: E2E tests
      - run: pnpm start &
      - run: sleep 10 && pnpm test:e2e
        name: E2E Tests
      
      # Coverage report
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v3
```

---

## Mocking Strategy

### Unit Tests

**Mock external dependencies:**
```typescript
import { jest } from '@jest/globals';

// Mock filesystem
jest.mock('fs', () => ({
  readFileSync: jest.fn(() => 'mock content'),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(() => true)
}));

// Mock PGlite
jest.mock('@electric-sql/pglite', () => ({
  PGlite: jest.fn().mockImplementation(() => ({
    query: jest.fn(() => ({ rows: [] })),
    close: jest.fn()
  }))
}));
```

### Integration Tests

**Use real in-memory database:**
```typescript
import { PGlite } from '@electric-sql/pglite';

// Create isolated in-memory instance per test
const db = new PGlite({
  dataDir: ':memory:',
  relaxedDurability: true
});
```

### E2E Tests

**Use test fixtures:**
```typescript
// tests/e2e/fixtures.ts
export async function setupTestEnvironment() {
  // Clear existing data
  await fetch('http://localhost:3160/v1/admin/reset', { method: 'POST' });
  
  // Ingest test data
  await ingestTestFixture('oauth-setup.md');
  await ingestTestFixture('career-planning.md');
  
  // Wait for indexing
  await waitForIndexing();
}
```

---

## Coverage Requirements

### Minimum Coverage Thresholds

| Component | Line Coverage | Branch Coverage |
|-----------|---------------|-----------------|
| Core Engine | ≥85% | ≥75% |
| API Layer | ≥90% | ≥80% |
| MCP Server | ≥85% | ≥75% |
| UI Components | ≥70% | ≥60% |
| WASM Modules | ≥95% | ≥90% |

### Critical Paths (Must Test)

1. **Ingestion Pipeline**
   - File reading and validation
   - Atomization logic
   - Database insertion
   - Error handling

2. **Search Pipeline**
   - Query parsing
   - STAR scoring
   - Result ranking
   - Provenance tracking

3. **Database Operations**
   - Initialization and wipe
   - Transaction management
   - Index creation
   - Cleanup on shutdown

4. **MCP Tools**
   - Tool registration
   - Parameter validation
   - Error responses
   - Rate limiting

---

## Test Data Management

### Test Fixtures

**Location:** `tests/fixtures/`

```
tests/fixtures/
├── molecules/
│   ├── simple-molecule.json
│   └── complex-molecule.json
├── atoms/
│   ├── text-atom.json
│   └── code-atom.json
├── compounds/
│   ├── chat-export.jsonl
│   └── markdown-file.md
└── expected/
    ├── search-results.json
    └── distill-output.yaml
```

### Factory Functions

```typescript
// tests/factories.ts
export function createTestAtom(overrides = {}) {
  return {
    id: `atom_${Date.now()}`,
    content: 'Test content',
    source: 'test.md',
    bucket: 'inbox',
    timestamp: new Date().toISOString(),
    tags: ['test'],
    ...overrides
  };
}

export function createTestMolecule(atoms = []) {
  return {
    id: `molecule_${Date.now()}`,
    atoms: atoms.length > 0 ? atoms : [createTestAtom()],
    source: 'test.md',
    timestamp: new Date().toISOString()
  };
}
```

---

## Known Limitations

### WASM Module Testing

**Challenge:** Native WASM modules require special handling in test environments.

**Workaround:** Use mock implementations for unit tests, real modules for integration tests.

```typescript
// Mock for unit tests
jest.mock('@rbalchii/anchor-atomizer-wasm', () => ({
  atomize: jest.fn(() => ({ molecules: [] }))
}));

// Real module for integration tests (no mocking)
```

### PGlite ESM/WASM Conflicts

**Challenge:** PGlite has module-linking conflicts with Jest's ESM handling.

**Workaround:** Use Vitest for PGlite-specific tests.

```typescript
// tests/unit/pglite-database.test.ts (Vitest)
import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';

// Vitest handles ESM/WASM better than Jest
```

### Platform-Specific Tests

**Challenge:** File paths and permissions differ across platforms.

**Workaround:** Use platform-agnostic path utilities and skip platform-specific tests.

```typescript
import path from 'path';
import { platform } from 'os';

const isWindows = platform() === 'win32';

describe.skipIf(isWindows)('Unix permissions', () => {
  // Only run on Unix-like systems
});
```

---

## Related Decisions

- **Standard 002:** Reproducible Benchmarking
- **Standard 010:** Test Coverage Requirements (archived)
- **Decision Record 002:** MCP Integration Testing (pending)

---

## Changelog

### 2026-03-25 (Initial)
- Defined multi-tier testing strategy
- Established coverage requirements
- Documented mocking approaches
- Created test organization guidelines

---

## Appendix: Test Commands Reference

```bash
# Quick test (unit only)
pnpm test

# Full test suite
pnpm test:all

# With coverage
pnpm test:coverage

# Watch mode
pnpm test:watch

# E2E tests
pnpm test:e2e

# Standalone tests
pnpm test:standalone

# Benchmark tests
pnpm test:benchmarks

# Specific test file
pnpm test -- atomizer.unit.test.ts

# Test with pattern
pnpm test -- --testNamePattern="should ingest"

# Debug test
node --inspect-brk node_modules/.bin/jest --runInBand
```
