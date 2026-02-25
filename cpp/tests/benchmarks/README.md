# C++ Backend Benchmark Suite

Comprehensive performance benchmarks for the C++ SQLite3 backend.

## Quick Start

```bash
cd cpp/tests

# Run all benchmarks
npm test

# Run specific benchmarks
npm run bench:memory
npm run bench:search
npm run bench:ingestion
npm run bench:all
```

## Benchmark Categories

### 1. Memory Usage (`memory-bench.js`)

Measures RSS (Resident Set Size) during operations:
- Database initialization
- Bulk insertion
- Search operations
- Radial inflation
- Context inflation
- Deduplication

**Output:** `results/memory-benchmark.json`

### 2. Search Latency (`search-bench.js`)

Measures latency percentiles (p50, p95, p99) for:
- FTS5 full-text search
- Radial inflation (physics walker)
- Context inflation (n-1, n+1)
- 5-layer deduplication

**Output:** `results/search-latency-benchmark.json`

### 3. Ingestion Throughput (`ingestion-bench.js`)

Measures atoms/second at different batch sizes:
- 100 atoms/batch
- 500 atoms/batch
- 1000 atoms/batch
- 2000 atoms/batch

**Output:** `results/ingestion-throughput-benchmark.json`

## Expected Results

### Memory (C++ vs PGlite)

| Operation | PGlite | C++ | Improvement |
|-----------|--------|-----|-------------|
| Init | ~50MB | ~10MB | **5x less** |
| Search | ~100MB | ~30MB | **3.3x less** |
| Peak RSS | ~900MB | ~200MB | **4.5x less** |

### Search Latency (C++)

| Operation | p50 | p95 | p99 |
|-----------|-----|-----|-----|
| FTS Search | <10ms | <50ms | <100ms |
| Radial Inflation | <5ms | <20ms | <50ms |
| Context Inflation | <10ms | <30ms | <60ms |
| Deduplication | <2ms | <10ms | <20ms |

### Ingestion Throughput (C++)

| Batch Size | Atoms/Second |
|------------|--------------|
| 100 | ~2,000/sec |
| 500 | ~3,000/sec |
| 1000 | ~3,500/sec |
| 2000 | ~4,000/sec |

## Running Benchmarks

### Prerequisites

```bash
cd cpp/tests
npm install
```

### Individual Benchmarks

```bash
# Memory benchmark
node benchmarks/run-benchmarks.js memory

# Search latency benchmark
node benchmarks/run-benchmarks.js search

# Ingestion throughput benchmark
node benchmarks/run-benchmarks.js ingestion
```

### All Benchmarks

```bash
# Run complete suite
node benchmarks/run-benchmarks.js all
```

## Output Format

Results are saved to `results/` directory as JSON:

```json
{
  "test": "search_latency",
  "timestamp": "2026-02-25T00:00:00.000Z",
  "operations": [
    {
      "name": "FTS Search",
      "stats": {
        "p50": 8.5,
        "p95": 45.2,
        "p99": 89.3,
        "mean": 12.1,
        "min": 3.2,
        "max": 125.6,
        "count": 100
      }
    }
  ]
}
```

## Comparison with PGlite

To compare C++ backend vs PGlite baseline:

1. Run benchmarks with PGlite (baseline)
2. Run benchmarks with C++ backend
3. Compare results in `results/` directory

Key metrics to compare:
- **Memory RSS**: Lower is better
- **Search p95**: Lower is better
- **Throughput**: Higher is better

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Search p95 | <50ms | ⏳ Testing |
| Memory RSS | <200MB | ⏳ Testing |
| Ingestion | >3000/sec | ⏳ Testing |
| PhysicsWalker | <20ms | ⏳ Testing |

## Troubleshooting

### High Memory Usage
- Ensure database is closed properly (`core.destroy()`)
- Check for memory leaks with `--expose-gc`
- Run GC between iterations: `global.gc()`

### Inconsistent Latency
- Warm up database before benchmarking
- Run multiple iterations (100+)
- Use p95/p99 instead of mean

### Low Throughput
- Increase batch size
- Check disk I/O (SSD vs HDD)
- Monitor CPU usage during benchmark

## Automated Benchmarking

Add to CI/CD pipeline:

```yaml
# .github/workflows/benchmarks.yml
name: Benchmarks

on: [push, pull_request]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd cpp/tests && npm install
      - run: cd cpp/tests && npm run bench:all
      - uses: benchmark-action/github-action-benchmark@v1
        with:
          tool: 'benchmarkjs'
          output-file-path: cpp/tests/results/*.json
```

## License

MIT
