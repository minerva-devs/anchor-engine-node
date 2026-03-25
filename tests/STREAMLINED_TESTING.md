# Streamlined Testing for Anchor Engine

## Quick Start

```bash
# Run critical tests only (~1 second)
node tests/streamlined-test.mjs

# Run with integration tests (~5 seconds, requires engine running)
node tests/streamlined-test.mjs --p1

# Run full test suite (~30 seconds)
node tests/streamlined-test.mjs --full

# Watch mode (reruns on changes)
node tests/streamlined-test.mjs --watch
```

## Test Framework Comparison

| Framework | Lines of Code | Dependencies | Startup Time | Best For |
|-----------|---------------|--------------|--------------|----------|
| **Native Assert** (recommended) | ~80 | 0 | <100ms | Unit tests, smoke tests |
| Jest + ts-jest | ~500 config | 50MB+ | 2-5s | Complex mocking, coverage |
| Vitest | ~200 config | 20MB+ | 1-2s | ESM projects, fast dev |
| Custom Framework | ~400 | 0 | <100ms | Complex test orchestration |

## New Minimal Test Framework

**Location:** `tests/minimal-framework.mjs` (~80 lines)

**Features:**
- Zero dependencies (uses Node.js built-in `assert`)
- Jest-like DSL (`describe`, `it`, `assert`)
- Filter with `--grep="pattern"`
- Bail on first failure with `--bail`
- Auto-discovers `*.test.mjs` files

### Writing Minimal Tests

```javascript
// tests/minimal/my-feature.test.mjs
import { describe, it, assert } from '../minimal-framework.mjs';

describe('My Feature', () => {
  it('should do something', () => {
    assert.strictEqual(1 + 1, 2);
  });
});
```

### Running Minimal Tests

```bash
# Run all minimal tests
node tests/minimal-framework.mjs

# Filter by name
node tests/minimal-framework.mjs --grep="paths"

# Stop on first failure
node tests/minimal-framework.mjs --bail
```

## Critical Tests (P0 - Always Run)

| Test | File | Lines | Why Critical |
|------|------|-------|--------------|
| Paths Config | `minimal/paths.test.mjs` | 35 | Breaks everything if wrong |
| Search Utils | `minimal/search.test.mjs` | 45 | Core to search quality |
| Smoke Test | `minimal/smoke.test.mjs` | 60 | Verifies engine is alive |

**Total P0 Lines:** ~140 lines of test code

## Activity Emulators

### Frontend Emulator

Simulates UI interactions:

```bash
# Full workflow (search, ingest, view, illuminate)
node tests/emulate-frontend.mjs

# Search only
node tests/emulate-frontend.mjs --search "my query"

# Ingest only
node tests/emulate-frontend.mjs --ingest

# Stress test (10 concurrent searches)
node tests/emulate-frontend.mjs --stress

# Custom concurrency
node tests/emulate-frontend.mjs --stress --concurrent=50
```

### MCP Emulator

Simulates MCP client/agent interactions:

```bash
# Full agent workflow
node tests/emulate-mcp.mjs

# List available tools
node tests/emulate-mcp.mjs --tools

# Test search tool
node tests/emulate-mcp.mjs --search "query"

# Test ingest tool
node tests/emulate-mcp.mjs --ingest

# Error handling tests
node tests/emulate-mcp.mjs --errors
```

## Streamlined Pipeline

The `streamlined-test.mjs` script runs tests in priority order:

```
P0 (Critical) ──► P1 (Integration) ──► P2 (E2E)
     │                  │                  │
     ▼                  ▼                  ▼
  ~1 second         ~5 seconds        ~30 seconds
  Always run      If --p1 flag       If --full flag
                  & engine running   & engine running
```

### Pipeline Stages

| Stage | Tests | Condition | Timeout |
|-------|-------|-----------|---------|
| P0 | Paths, Search, Smoke | Always | 10s |
| P1 | MCP Integration | `--p1` + engine running | 30s |
| P2 | Full E2E | `--full` + engine running | 120s |

## File Structure

```
tests/
├── minimal-framework.mjs      # Ultra-light test framework (~80 lines)
├── streamlined-test.mjs       # Pipeline orchestrator (~150 lines)
├── emulate-frontend.mjs       # Frontend activity emulator (~250 lines)
├── emulate-mcp.mjs            # MCP activity emulator (~300 lines)
├── minimal/                   # Critical tests
│   ├── paths.test.mjs         # Path configuration (35 lines)
│   ├── search.test.mjs        # Search utilities (45 lines)
│   └── smoke.test.mjs         # Engine smoke test (60 lines)
├── e2e/
│   └── full-stack.test.ts     # Existing Vitest E2E tests
├── unit/
│   └── paths-config.test.ts   # Existing Jest tests
└── STREAMLINED_TESTING.md     # This file
```

## Migration Path

### From Jest/Vitest to Minimal Framework

1. **Keep existing tests** - They still work
2. **Add new tests** to `tests/minimal/*.test.mjs`
3. **Migrate critical tests** first (paths, search, smoke)
4. **Gradually replace** as needed

### Running Mixed Test Suites

```bash
# Minimal tests only
node tests/minimal-framework.mjs

# Existing Jest tests
pnpm test

# Existing Vitest E2E
pnpm test:e2e

# Streamlined (includes minimal + optional integration)
node tests/streamlined-test.mjs --p1
```

## Performance Comparison

| Suite | Framework | Tests | Time | Memory |
|-------|-----------|-------|------|--------|
| Minimal P0 | Native | 3 | ~100ms | ~20MB |
| Unit Tests | Jest | 3 | ~3s | ~150MB |
| E2E Tests | Vitest | 6 | ~15s | ~200MB |
| Full Suite | Mixed | 12 | ~20s | ~300MB |

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      # Critical tests only (fast feedback)
      - name: P0 Tests
        run: node tests/minimal-framework.mjs
      
      # Build and start engine
      - name: Build
        run: pnpm build
      - name: Start Engine
        run: pnpm start &
      - name: Wait for Engine
        run: sleep 5
      
      # Full integration tests
      - name: Integration Tests
        run: node tests/streamlined-test.mjs --p1
```

## Troubleshooting

### Tests Fail Immediately
```bash
# Check if user_settings.json exists
cat user_settings.json

# Verify engine is running (for P1/P2)
curl http://localhost:3160/v1/stats -H "Authorization: Bearer YOUR_API_KEY"
```

### Permission Denied
```bash
chmod +x tests/*.mjs
```

### Module Not Found
```bash
# Ensure you're in the project root
cd /data/data/com.termux/files/home/projects/AEN
node tests/minimal-framework.mjs
```

## Recommendations

1. **Use minimal framework** for new unit tests (zero overhead)
2. **Keep Jest/Vitest** for complex integration tests (coverage, mocking)
3. **Use emulators** for manual testing and debugging
4. **Run streamlined pipeline** in CI for balanced speed/coverage
5. **Add tests** to `minimal/` for anything that could break the build

## Summary

- **Lightest framework:** Native Node.js assert (~80 lines)
- **Most useful tests:** Paths, Search, Smoke (140 lines total)
- **Fastest feedback:** `node tests/minimal-framework.mjs` (~100ms)
- **Full coverage:** `node tests/streamlined-test.mjs --full` (~30s)
- **Activity emulation:** Frontend + MCP emulators for manual testing
