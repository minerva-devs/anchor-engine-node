# Anchor Engine - Testing Guide

**Version:** 4.8.0 | **Last Updated:** March 18, 2026

---

## Quick Start

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

---

## Test Structure

```
tests/
├── unit/                       # Unit tests
│   ├── test_atomizer_logic.ts
│   ├── test_context_quality_improvements.ts
│   ├── test_vector_service.ts
│   └── ...
│
├── integration/                # Integration tests
│   ├── test_pglite.ts
│   ├── minimal-pglite-test.ts
│   └── ...
│
├── benchmarks/                 # Performance tests
│   ├── benchmark.ts
│   └── ...
│
└── whitepaper-verification.js  # Whitepaper compliance tests
```

---

## Running Tests

### Unit Tests

```bash
# All unit tests
npm test

# Specific test file
npx vitest run tests/unit/test_atomizer_logic.ts

# Watch mode
npm run test:watch
```

### Integration Tests

```bash
# PGlite integration tests
npx ts-node tests/test-pglite.ts

# Minimal test
npx ts-node tests/minimal-pglite-test.ts
```

### Benchmark Tests

```bash
# Run benchmarks
cd engine
npm run benchmark

# Search benchmarks
node tests/benchmarks/search-benchmark.ts

# Ingestion benchmarks
node tests/benchmarks/ingestion-benchmark.ts
```

### Whitepaper Verification

```bash
# Verify against whitepaper specs
node tests/whitepaper-verification.js
```

---

## Test Categories

### Unit Tests

**Purpose:** Test individual functions in isolation

**Example:**
```typescript
import { describe, it, expect } from 'vitest';
import { atomize } from '../services/ingest/atomizer-service';

describe('Atomizer', () => {
  it('splits text into atoms', () => {
    const atoms = atomize('Hello world');
    expect(atoms.length).toBeGreaterThan(0);
  });
});
```

**Files:**
- `test_atomizer_logic.ts` - Atomization logic
- `test_context_quality_improvements.ts` - Context quality
- `test_vector_service.ts` - Vector operations

---

### Integration Tests

**Purpose:** Test component interactions

**Example:**
```typescript
import { db } from '../core/db';

describe('Database Integration', () => {
  beforeAll(async () => {
    await db.init();
  });

  it('stores and retrieves atoms', async () => {
    await db.run('INSERT INTO atoms ...');
    const result = await db.run('SELECT * FROM atoms');
    expect(result.results.length).toBe(1);
  });
});
```

**Files:**
- `test-pglite.ts` - PGlite integration
- `minimal-pglite-test.ts` - Minimal DB test

---

### Benchmark Tests

**Purpose:** Measure performance metrics

**Example:**
```typescript
import { benchmark } from './benchmark';

const results = await benchmark({
  name: 'Search Latency',
  fn: async () => await search({ query: 'test' }),
  iterations: 100
});

console.log(`p95: ${results.p95}ms`);
```

**Metrics Tracked:**
- Search latency (p50, p95, p99)
- Ingestion throughput (atoms/sec)
- Memory usage (MB)
- Compression ratio

---

## Writing Tests

### Test File Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { myFunction } from '../my-module';

describe('MyModule', () => {
  beforeEach(() => {
    // Setup before each test
  });

  describe('myFunction', () => {
    it('should do something', async () => {
      const result = await myFunction();
      expect(result).toBeDefined();
    });

    it('should handle edge cases', () => {
      expect(() => myFunction(null)).toThrow();
    });
  });
});
```

### Best Practices

1. **Descriptive Names:**
   ```typescript
   it('returns empty array when query is empty', () => {
     // ...
   });
   ```

2. **Arrange-Act-Assert:**
   ```typescript
   // Arrange
   const input = 'test';
   
   // Act
   const result = await myFunction(input);
   
   // Assert
   expect(result).toBe('expected');
   ```

3. **Test Edge Cases:**
   - Empty inputs
   - Null/undefined
   - Large inputs
   - Invalid formats

---

## Test Coverage

### Running Coverage

```bash
npm run test:coverage
```

### Coverage Goals

| Component | Target | Current |
|-----------|--------|---------|
| Services | 80% | 75% |
| Routes | 90% | 85% |
| Utils | 70% | 65% |
| **Overall** | **80%** | **75%** |

### Coverage Reports

**Location:** `coverage/`

**Formats:**
- HTML: `coverage/index.html`
- JSON: `coverage/coverage-final.json`
- Text: Console output

---

## Continuous Integration

### GitHub Actions

Tests run automatically on:
- Pull requests
- Push to main
- Scheduled (daily)

**Workflow:** `.github/workflows/test.yml`

### Pre-commit Hooks

```bash
# Install hooks
npm install

# Run tests before commit
npm run precommit
```

---

## Debugging Tests

### Verbose Output

```bash
npm test -- --reporter=verbose
```

### Debug Specific Test

```bash
npx vitest run -t "should handle edge cases"
```

### Debug Mode

```bash
node --inspect-brk node_modules/.bin/vitest run
```

Then open `chrome://inspect` in Chrome.

---

## Performance Testing

### Search Benchmarks

```bash
cd engine
node tests/benchmarks/search-benchmark.ts
```

**Metrics:**
- Query latency (p50, p95, p99)
- Results per second
- Memory per query

### Ingestion Benchmarks

```bash
node tests/benchmarks/ingestion-benchmark.ts
```

**Metrics:**
- Atoms per second
- Bytes per second
- Memory peak

---

## Known Issues

### Flaky Tests

**Issue:** PGlite timing issues

**Workaround:**
```typescript
// Add delay before assertions
await new Promise(r => setTimeout(r, 100));
```

### Memory Leaks in Tests

**Issue:** Tests don't clean up

**Fix:**
```typescript
afterEach(async () => {
  await db.reset();
  await cleanup();
});
```

---

## Contributing Tests

### Adding New Tests

1. Create file in `tests/unit/` or `tests/integration/`
2. Follow naming: `test_<feature>.ts`
3. Add to test suite
4. Run: `npm test`

### Test Review Checklist

- [ ] Descriptive test names
- [ ] Edge cases covered
- [ ] No flaky assertions
- [ ] Cleanup in afterEach
- [ ] Coverage improved

---

## Support

- **Testing Standards:** [`specs/current-standards/130-test-coverage-requirements.md`](../../specs/current-standards/130-test-coverage-requirements.md)
- **Issues:** https://github.com/RSBalchII/anchor-engine-node/issues
- **Discussions:** https://github.com/RSBalchII/anchor-engine-node/discussions
