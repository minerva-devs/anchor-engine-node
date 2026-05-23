# Live-Fire Test Suite

Comprehensive testing guide for agents running live-fire test suites against Anchor Engine.

## Overview

The Live-Fire Test Suite validates search algorithms, distillation pipelines, and operational logging under real-world conditions. Tests progress from **P1 (hardest)** to **P6 (easiest)**, following Standard 014's hardest→easiest methodology.

**Key References:**
- [Standard 014: Search Algorithm Testing](../../specs/current-standards/search-retrieval/014-search-algorithm-testing.md)
- [Standard 027: Pain Point Logging](../../specs/current-standards/operations-logging/027-pain-point-logging.md)

---

## Quick Start

```bash
# Run all phases (P1-P6)
node tests/live-fire-suite.mjs --full

# Run specific phase
node tests/live-fire-suite.mjs --phase P1   # Hardest: semantic search
node tests/live-fire-suite.mjs --phase P2   # Tag-based advanced
node tests/live-fire-suite.mjs --phase P3   # Byte offset
node tests/live-fire-suite.mjs --phase P4   # FTS basic
node tests/live-fire-suite.mjs --phase P5   # Empty/edge cases
node tests/live-fire-suite.mjs --phase P6   # Performance benchmarks

# Watch mode (reruns on changes)
node tests/live-fire-suite.mjs --watch

# Filter by test name pattern
node tests/live-fire-suite.mjs --grep="semantic"
```

---

## Test Phases (P1-P6)

| Phase | Priority | Description | Expected Duration |
|-------|----------|-------------|-------------------|
| **P1** | Hardest | Semantic search with complex multi-concept queries | ~3s |
| **P2** | Hard | Tag-based search with multiple filters | ~1s |
| **P3** | Medium-Hard | Byte offset search with content boundaries | ~500ms |
| **P4** | Medium | Standard FTS (full-text search) queries | ~200ms |
| **P5** | Easy | Empty query, edge cases, boundary conditions | ~100ms |
| **P6** | Baseline | Performance benchmarks, latency targets | Variable |

---

## Running Tests

### Full Suite

```bash
# Default: runs P1-P6 sequentially
node tests/live-fire-suite.mjs --full

# With verbose output
node tests/live-fire-suite.mjs --full --verbose

# Skip engine startup (engine must be running)
node tests/live-fire-suite.mjs --full --skip-start
```

### Single Phase

```bash
# Test only P1 (semantic search - hardest)
node tests/live-fire-suite.mjs --phase P1

# Test specific test within phase
node tests/live-fire-suite.mjs --grep="P0 semantic-search-complex"
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Live-Fire Tests
on: [push, pull_request]
jobs:
  live-fire:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Start engine
      - name: Start Engine
        run: pnpm start & sleep 5
      
      # Run critical phases only (P1-P3)
      - name: Live-Fire Tests
        run: node tests/live-fire-suite.mjs --phase P1,P2,P3
      
      # Upload logs as artifact
      - uses: actions/upload-artifact@v4
        with:
          name: test-logs
          path: .anchor/logs/search-tests/
```

---

## Log Locations (Per doc_policy.md Section 5.3)

All runtime objects are stored in `$home/.anchor`. Test logs follow this structure:

### Orchestration Logs (Main Execution)

Orchestration and execution metadata for the test runner itself:

```
.anchor/logs/live-fire-tests/
├── run-live-fire-tests.log              # Main orchestration log
├── errors.log                           # Error stack traces
└── run-2026-05-19T14-30-00.log          # Per-run execution summaries
```

### Search Test Logs (Per Standard 014)

Search result files for each test phase:

```
.anchor/logs/search-tests/
├── P0-semantic-search-complex-2026-05-19T14-30-00.json
├── P1-tag-search-multi-filter-2026-05-19T14-30-30.json
├── P2-byte-offset-content-boundary-2026-05-19T14-31-00.json
├── P3-fts-standard-search-2026-05-19T14-31-30.json
└── P4-empty-query-all-results-2026-05-19T14-32-00.json
```

### Distillation Test Logs (Per Standard 014)

Distillation result files for context extraction tests:

```
.anchor/logs/distillation-tests/
├── distillation-unseeded-2026-05-19T14-33-00.json
└── distillation-seeded-context-2026-05-19T14-33-30.json
```

### Pain Point Logs (Per Standard 027)

When tests trigger pain points (>3 commits or >2 hours to resolve), logs are saved:

```
.anchor/logs/pain-points/
├── path-management-issue-2026-05-19.json
└── config-drift-detection-2026-05-19.json
```

### Summary Reports

```
docs/testing/live-fire-results/
├── 2026-05-19-summary.md
└── phase-reports/
    ├── P1-report.md
    ├── P2-report.md
    └── ...
```

---

## Test Examples

### Phase P1: Semantic Search (Hardest)

Tests complex multi-concept queries requiring deep semantic understanding.

```javascript
// tests/live-fire/P1-semantic.test.mjs
import { describe, it } from '../minimal-framework.mjs';
import { AnchorClient } from '../../packages/api-client/src/index.js';

describe('P1: Semantic Search (Hardest)', () => {
  const client = new AnchorClient({ baseUrl: 'http://localhost:3160' });

  it('P0 semantic-search-complex', async () => {
    const results = await client.search(
      'authentication and authorization in Node.js best practices',
      { strategy: 'semantic', maxResults: 10 }
    );
    
    expect(results.totalResults).toBeGreaterThan(0);
    validateSearchResults(results);
    
    // Log per Standard 027 (pain point logging)
    logTestResult('P0 semantic-search-complex', results);
  });

  it('P1 tag-search-multi-filter', async () => {
    const results = await client.search('#test #api #node', {
      mode: 'tags',
      maxResults: 10
    });
    
    expect(results.totalResults).toBeGreaterThan(0);
    validateSearchResults(results);
    logTestResult('P1 tag-search-multi-filter', results);
  });

  it('P2 byte-offset-content-boundary', async () => {
    const results = await client.search('function findAnchors', {
      includeByteOffsets: true,
      maxResults: 5
    });
    
    expect(results.results[0]?.content).toBeDefined();
    validateSearchResults(results);
    logTestResult('P2 byte-offset-content-boundary', results);
  });

  it('P3 fts-standard-search', async () => {
    const results = await client.search('workspace', {
      limit: 10,
      mode: 'combined'
    });
    
    expect(results.totalResults).toBeGreaterThan(0);
    validateSearchResults(results);
    logTestResult('P3 fts-standard-search', results);
  });

  it('P4 empty-query-all-results', async () => {
    const results = await client.search('', {
      limit: 100,
      mode: 'combined'
    });
    
    expect(results.results.length).toBeLessThanOrEqual(100);
    validateSearchResults(results);
    logTestResult('P4 empty-query-all-results', results);
  });

  function validateSearchResults(results) {
    expect(results).toHaveProperty('results');
    expect(results).toHaveProperty('totalResults');
    expect(Array.isArray(results.results)).toBe(true);
    if (Array.isArray(results.results)) {
      results.results.forEach((r) => {
        expect(r).toHaveProperty('id');
        expect(r).toHaveProperty('source');
        expect(r).toHaveProperty('content');
      });
    }
  }

  function logTestResult(testName, results) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      testName,
      totalResults: results.totalResults,
      resultsCount: results.results?.length || 0,
      query: results.query || '',
      strategy: results.strategy || 'unknown',
      latencyMs: Date.now() - startTime
    };

    const fs = await import('fs');
    const path = await import('path');
    const logDir = path.join(process.env.PROJECT_ROOT || '.', '.anchor', 'logs', 'search-tests');
    const logFile = path.join(logDir, `${testName}-${timestamp.replace(/[:.]/g, '-')}.json`);

    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.writeFileSync(logFile, JSON.stringify(logEntry, null, 2));
  }
});
```

### Phase P6: Performance Benchmarks

```javascript
// tests/live-fire/P6-performance.test.mjs
import { describe, it } from '../minimal-framework.mjs';

describe('P6: Performance Benchmarks', () => {
  let startTime;

  beforeAll(() => {
    startTime = Date.now();
  });

  it('P6 latency-targets', async () => {
    const queries = [
      ['authentication and authorization in Node.js best practices', 'semantic'], // P0 target: <3s
      ['#test #api #node', 'tags'], // P1 target: <1s
      ['function findAnchors', 'byte-offset'], // P2 target: <500ms
      ['workspace', 'fts'], // P3 target: <200ms
      ['', 'combined'] // P4 target: <100ms
    ];

    const results = [];
    
    for (const [query, strategy] of queries) {
      const start = Date.now();
      
      if (strategy === 'semantic') {
        await client.search(query, { strategy });
      } else if (strategy === 'tags') {
        await client.search(query, { mode: 'tags' });
      } else if (strategy === 'byte-offset') {
        await client.search(query, { includeByteOffsets: true });
      } else if (strategy === 'fts') {
        await client.search(query, { limit: 10 });
      } else {
        await client.search(query);
      }
      
      const latency = Date.now() - start;
      results.push({ query, strategy, latency });
    }

    // Validate against targets from Standard 014 Section 6
    validatePerformance(results);
    
    logTestResult('P6 latency-targets', { results, startTime: Date.now() - startTime });
  });

  function validatePerformance(results) {
    const targets = {
      'semantic': 3000,   // <3s
      'tags': 1000,       // <1s
      'byte-offset': 500, // <500ms
      'fts': 200,         // <200ms
      'combined': 100     // <100ms
    };

    for (const r of results) {
      const target = targets[r.strategy];
      if (r.latency > target * 1.5) { // Allow 50% margin
        throw new Error(`Performance violation: ${r.strategy} took ${r.latency}ms, expected <${target}ms`);
      }
    }
  }

  function logTestResult(testName, data) {
    const timestamp = new Date().toISOString();
    const fs = await import('fs');
    const path = await import('path');
    
    const logDir = path.join(process.env.PROJECT_ROOT || '.', '.anchor', 'logs', 'performance-tests');
    const logFile = path.join(logDir, `${testName}-${timestamp.replace(/[:.]/g, '-')}.json`);

    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.writeFileSync(logFile, JSON.stringify(data, null, 2));
  }
});
```

---

## Distillation Testing

### Unseeded vs Seeded Tests

```javascript
// tests/live-fire/distillation.test.mjs
import { describe, it } from '../minimal-framework.mjs';

describe('Distillation Tests', () => {
  const API_BASE = 'http://localhost:3160/v1/memory';

  it('distillation-unseeded', async () => {
    // First get compounds via search
    const results = await client.search('authentication', {
      strategy: 'semantic',
      maxResults: 5
    });

    // Run distillation with NO prior context
    const response = await fetch(`${API_BASE}/distill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        compounds: results.results.map(r => r.id),
        seed: null // No seed - unseeded mode
      })
    });

    const data = await response.json();
    
    expect(data.stats.compounds_processed).toBe(5);
    expect(data.output.path).toBeDefined();
    
    logDistillationResult('distillation-unseeded', data);
  });

  it('distillation-seeded-context', async () => {
    // Get context molecules first
    const contextQuery = 'Node.js authentication';
    const results = await client.search(contextQuery, {
      strategy: 'semantic',
      maxResults: 3
    });

    // Run distillation WITH seed context
    const response = await fetch(`${API_BASE}/distill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        compounds: results.results.map(r => r.id),
        seed: results.results[0].content, // Use first result as seed
        contextWindow: 512
      })
    });

    const data = await response.json();
    
    expect(data.stats.compounds_processed).toBe(3);
    expect(data.output.path).toBeDefined();
    expect(data.output.context).toContain(contextQuery);
    
    logDistillationResult('distillation-seeded-context', data);
  });

  function logDistillationResult(testName, data) {
    const timestamp = new Date().toISOString();
    const fs = await import('fs');
    const path = await import('path');
    
    const logDir = path.join(process.env.PROJECT_ROOT || '.', '.anchor', 'logs', 'distillation-tests');
    const logFile = path.join(logDir, `${testName}-${timestamp.replace(/[:.]/g, '-')}.json`);

    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.writeFileSync(logFile, JSON.stringify({
      timestamp,
      testName,
      stats: data.stats,
      outputPath: data.output.path,
      compressionRatio: data.stats.compression_ratio
    }, null, 2));
  }
});
```

---

## Troubleshooting

### Tests Fail Immediately

**Symptom:** All tests fail on first run with connection errors.

**Cause:** Engine not running or wrong port.

**Fix:**
```bash
# Check if engine is running
curl http://localhost:3160/v1/stats -H "Authorization: Bearer YOUR_API_KEY"

# Start engine manually
pnpm start

# Verify API key in test config
grep "API_KEY" tests/live-fire-suite.mjs
```

### Logs Not Being Created

**Symptom:** `.anchor/logs/` directory doesn't exist or is empty.

**Cause:** Permission issues or wrong PROJECT_ROOT environment variable.

**Fix:**
```bash
# Ensure .anchor directory exists with correct permissions
mkdir -p .anchor/logs/search-tests
chmod 755 .anchor/logs

# Verify PROJECT_ROOT is set correctly
echo $PROJECT_ROOT  # Should be project root path

# Run test again
node tests/live-fire-suite.mjs --full
```

### Performance Tests Exceed Targets

**Symptom:** P0 semantic search takes >3s, P1 tag search >1s.

**Cause:** Insufficient indexed content or memory pressure.

**Fix:**
```bash
# Check database size
curl http://localhost:3160/v1/stats -H "Authorization: Bearer YOUR_API_KEY" | jq '.databaseSize'

# Re-index corpus if needed
node scripts/reindex-corpus.mjs

# Clear cache and retry
rm -rf .anchor/cache/*
node tests/live-fire-suite.mjs --phase P1
```

### Pain Point Detection Not Working

**Symptom:** Tests pass but no pain point logs created.

**Cause:** Standard 027 threshold not met (<3 commits or <2 hours).

**Fix:**
```bash
# Manually trigger pain point log for debugging
node scripts/log-pain-point.mjs --test-name "P1-tag-search-multi-filter" \
  --category "Search Performance" \
  --duration "45 minutes" \
  --commits "2"

# Verify log was created
ls -la .anchor/logs/pain-points/
```

### Module Not Found Errors

**Symptom:** `Error: Cannot find module '../minimal-framework.mjs'`

**Cause:** Running from wrong directory.

**Fix:**
```bash
# Ensure you're in project root
cd /path/to/anchor-engine-node

# Verify file exists
ls tests/minimal-framework.mjs

# Run with absolute path
node ./tests/live-fire-suite.mjs --full
```

---

## Performance Targets (Standard 014 Section 6)

| Test Type | Max Latency | Budget Usage | Results Count |
|-----------|-------------|--------------|---------------|
| P0 Semantic (complex) | <3s | ~524k chars | ≤10 |
| P1 Tag multi-filter | <1s | ~64k chars | ≤10 |
| P2 Byte offset | <500ms | ~8k chars/atom | ≤5 |
| P3 FTS standard | <200ms | ~16-32k chars | ≤10 |
| P4 Empty query | <100ms | ~16-32k chars | unlimited |

---

## Best Practices

1. **Run P1-P3 in CI** - These catch the most critical issues with reasonable time (<30s total)
2. **Use `--skip-start` flag** when engine is already running (faster feedback)
3. **Check logs after failures** - `.anchor/logs/` contains detailed diagnostics
4. **Monitor pain point thresholds** - If a fix takes >2 hours, log it per Standard 027
5. **Keep tests focused** - Each test should validate one specific behavior

---

## Related Documentation

- [Standard 014: Search Algorithm Testing](../../specs/current-standards/search-retrieval/014-search-algorithm-testing.md)
- [Standard 027: Pain Point Logging](../../specs/current-standards/operations-logging/027-pain-point-logging.md)
- [doc_policy.md Section 5.3](../../specs/doc_policy.md#5-runtime-object-storage)
- [Streamlined Testing Guide](../streamlined-testing.md)

---

**Last Updated:** 2026-05-19  
**Version:** 1.0.0  
**Maintainer:** Anchor Engine QA Team
