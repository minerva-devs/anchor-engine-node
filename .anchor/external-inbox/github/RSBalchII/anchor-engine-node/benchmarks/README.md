# Anchor Engine - Performance Benchmarking Framework

## Overview
This framework provides standardized benchmarks for measuring Anchor Engine performance with reproducible, deterministic results.

## Quick Start

### Run Full Benchmark Suite
```bash
# Generate sample corpus and run all benchmarks
node benchmarks/run_benchmark.js --seed 42

# Compare results with expected values (for CI)
node benchmarks/run_benchmark.js --seed 42 --compare

# Generate corpus only (no benchmark run)
node benchmarks/run_benchmark.js --generate-only --seed 42
```

### Requirements
- Node.js 18+
- PNPM package manager
- 2GB+ free disk space for test database
- SSD recommended for consistent results

## Benchmark Categories

### 1. Reproducible Ingestion Benchmark
**Purpose:** Measure ingestion throughput with deterministic dataset

**What it measures:**
- Molecules processed per second
- Atoms processed per second
- Data throughput (MB/s)
- Total ingestion time

**Run:**
```bash
node benchmarks/run_benchmark.js --seed 42
```

**Expected Results:**
- ~800 molecules/second (±20%)
- ~50 atoms/second (±20%)
- 200 documents processed in ~5 minutes

### 2. Search Latency Benchmark
**Purpose:** Measure query response time across different search patterns

**What it measures:**
- Average latency (ms)
- Min/max latency
- Results per query

**Queries tested:**
- "artificial intelligence"
- "machine learning"
- "context retrieval"
- "software architecture"
- "database systems"

**Expected Results:**
- Average latency: ~150ms (±30%)
- 5-20 results per query

### 3. Sample Corpus Generator
**Purpose:** Generate deterministic test dataset

**Features:**
- 200 documents with varied content
- Timestamps spread over 6 months
- 2-5 tags per document
- Seeded random generation for reproducibility

**Run:**
```bash
node benchmarks/sample-corpus-generator.js --seed 42 --output benchmarks/sample_corpus.jsonl
```

**Output:**
- `sample_corpus.jsonl` - Test documents
- `sample_corpus_stats.json` - Corpus statistics

## Test Data Sets

### Sample Corpus (Default)
- **Documents:** 200
- **Total size:** ~100KB
- **Unique tags:** ~15
- **Date range:** 6 months
- **Seed:** 42 (default)

### Custom Corpus
Generate custom datasets with different sizes:
```bash
# Small dataset
node benchmarks/sample-corpus-generator.js --count 50 --seed 42

# Large dataset
node benchmarks/sample-corpus-generator.js --count 1000 --seed 42
```

## Results Interpretation

### Ingestion Performance
| Metric | Excellent | Good | Needs Attention |
|--------|-----------|------|-----------------|
| Molecules/sec | >1000 | 500-1000 | <500 |
| Atoms/sec | >100 | 50-100 | <50 |

### Search Performance
| Metric | Excellent | Good | Needs Attention |
|--------|-----------|------|-----------------|
| Avg latency | <100ms | 100-200ms | >200ms |
| Max latency | <250ms | 250-400ms | >400ms |

## CI/CD Integration

### GitHub Actions
The benchmark suite runs automatically on PRs to catch performance regressions.

**Pass criteria:**
- Ingestion throughput within 20% of expected
- Search latency within 30% of expected

### Compare with Expected Results
```bash
# Run and compare
node benchmarks/run_benchmark.js --seed 42 --compare

# Exit code 0 = PASSED, 1 = FAILED
```

## Troubleshooting

### "Database not initialized" error
Ensure the test database directory is created:
```bash
mkdir -p benchmarks/test_db
node benchmarks/run_benchmark.js --db benchmarks/test_db
```

### Performance varies significantly between runs
- Close other applications
- Ensure SSD has free space
- Run multiple times and average results
- Check for thermal throttling on laptops

### Results don't match expected values
Expected results have tolerances built in:
- Ingestion: ±20%
- Search: ±30%

If outside tolerance, check:
1. Hardware differences (SSD vs HDD)
2. Background processes
3. Node.js version
4. Available RAM

## Advanced Usage

### Custom Database Path
```bash
node benchmarks/run_benchmark.js --db /path/to/test_db
```

### Different Seed
```bash
node benchmarks/run_benchmark.js --seed 12345
```

### Export Results
Results are automatically saved to:
- `benchmarks/last_run_results.json` - Latest run
- `benchmarks/sample_corpus_stats.json` - Corpus stats

## Contributing

When adding new benchmarks:
1. Document expected results in `expected_results.json`
2. Add test to CI workflow
3. Update this README with usage instructions
4. Ensure deterministic execution with `--seed` flag

## Related Documentation
- [Benchmark Verification Report](../docs/BENCHMARK_VERIFICATION.md)
- [Performance Optimization Guide](./metrics-documentation.md)
- [STAR Parameter Tuning](../specs/standards/078-parameter-tuning.md)

---

**Last Updated:** February 27, 2026
**Version:** 4.2.0
