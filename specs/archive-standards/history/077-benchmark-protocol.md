# Benchmark Protocol - Anchor Engine

**Standard:** 077  
**Date:** February 27, 2026  
**Version:** 1.0.0  
**Status:** Active

---

## Purpose

This document defines the standardized benchmark methodology for Anchor Engine performance measurement. All benchmarks follow these protocols to ensure reproducibility, comparability, and scientific rigor.

---

## Principles

### 1. Determinism
All benchmarks must be **fully deterministic** when run with the same seed value. This enables:
- Reproducible results across machines
- Valid before/after comparisons
- CI/CD regression detection

### 2. Isolation
Benchmarks run in **isolated environments** to prevent interference:
- Dedicated test database (not production data)
- Clean filesystem state
- Controlled memory conditions

### 3. Transparency
All benchmark results include **full metadata**:
- Seed value used
- Hardware profile
- Software versions
- Environmental factors

### 4. Relevance
Benchmarks measure **real-world workloads**:
- Production-like data distributions
- Representative query patterns
- Typical usage scenarios

---

## Benchmark Suite Structure

```
benchmarks/
├── README.md                      # User documentation
├── run_benchmark.js               # Main runner script
├── sample-corpus-generator.js     # Deterministic data generator
├── expected_results.json          # CI validation thresholds
├── last_run_results.json          # Most recent run output
└── sample_corpus.jsonl            # Generated test dataset
```

---

## Sample Corpus Specification

### Document Schema
```json
{
  "id": "doc-0001",
  "title": "Meeting: project alpha",
  "text": "Discussion content...",
  "tags": ["#meeting", "#project-alpha"],
  "timestamp": 1700000000000,
  "type": "meeting-notes",
  "people": ["Alice", "Bob"]
}
```

### Corpus Characteristics
- **Size:** 200 documents (default)
- **Date range:** 6 months
- **Tags per doc:** 2-5 (random)
- **Topics:** 21 distinct topics
- **Document types:** 9 types

### Generation Algorithm
```javascript
// Seeded PRNG for reproducibility
class SeededRandom {
  constructor(seed) { this.seed = seed; }
  next() {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
}
```

---

## Performance Metrics

### Ingestion Metrics

| Metric | Formula | Unit | Typical Value |
|--------|---------|------|---------------|
| **Molecules/sec** | `molecules / time` | mol/s | 800 ±20% |
| **Atoms/sec** | `atoms / time` | atoms/s | 50 ±20% |
| **Throughput** | `bytes / time` | MB/s | 0.5 ±20% |
| **Total Time** | `end - start` | seconds | ~300s |

### Search Metrics

| Metric | Formula | Unit | Typical Value |
|--------|---------|------|---------------|
| **Avg Latency** | `Σlatency / queries` | ms | 150 ±30% |
| **Min Latency** | `min(latencies)` | ms | 50 ±30% |
| **Max Latency** | `max(latencies)` | ms | 300 ±30% |
| **Results/Query** | `results / queries` | count | 5-20 |

---

## Execution Protocol

### Step 1: Environment Setup
```bash
# Clean test database
rm -rf benchmarks/test_db
mkdir -p benchmarks/test_db

# Set environment
export CONTEXT_DB_PATH=./benchmarks/test_db
```

### Step 2: Generate Corpus
```bash
node benchmarks/sample-corpus-generator.js --seed 42
```

### Step 3: Run Benchmark
```bash
node benchmarks/run_benchmark.js --seed 42 --db benchmarks/test_db
```

### Step 4: Validate Results
```bash
node benchmarks/run_benchmark.js --seed 42 --compare
```

---

## Result Validation

### Pass Criteria
- Ingestion throughput within **±20%** of expected
- Search latency within **±30%** of expected
- Zero errors during execution
- All documents ingested successfully

### Comparison Algorithm
```javascript
function validate(actual, expected, tolerance) {
  const diff = Math.abs(actual - expected) / expected;
  return diff <= tolerance;
}

// Example
validate(850, 800, 0.2)  // true (6.25% diff)
validate(200, 150, 0.3)  // true (33.3% diff - FAIL)
```

---

## Hardware Profiles

### Reference Profiles

| Profile | CPU | RAM | Storage | Expected Molecules/s |
|---------|-----|-----|---------|---------------------|
| **Low-end** | i3/Ryzen 3 | 8GB | HDD | 400-600 |
| **Mid-range** | i5/Ryzen 5 | 16GB | SSD | 700-1000 |
| **High-end** | i7/Ryzen 7 | 32GB | NVMe | 1000-1500 |

### Reporting Hardware
```json
{
  "hardwareProfile": "mid-range-laptop",
  "cpu": "Intel i5-1135G7",
  "ram": "16GB DDR4",
  "storage": "512GB NVMe SSD",
  "nodeVersion": "v18.17.0"
}
```

---

## Troubleshooting

### High Variance Between Runs
**Cause:** Background processes, thermal throttling  
**Solution:** 
- Close other applications
- Run 3+ times and average
- Monitor CPU temperature

### Results Outside Tolerance
**Cause:** Hardware differences, outdated expected values  
**Solution:**
- Check hardware profile match
- Update expected_results.json if hardware changed
- Verify Node.js version compatibility

### Database Initialization Failures
**Cause:** Permission issues, locked files  
**Solution:**
```bash
# Clean database directory
rm -rf benchmarks/test_db
mkdir benchmarks/test_db

# Check permissions (Unix)
ls -la benchmarks/test_db
```

---

## CI/CD Integration

### GitHub Actions Workflow
```yaml
name: Benchmark
on: [push, pull_request]
jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '18' }
      - run: npm ci
      - run: node benchmarks/run_benchmark.js --seed 42 --compare
```

### Regression Detection
- **Warning:** 10-20% degradation
- **Fail:** >20% degradation
- **Block merge** on failure until investigated

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-27 | Initial protocol defined |

---

## Related Documents

- [Benchmark README](../benchmarks/README.md) - User guide
- [Expected Results](../benchmarks/expected_results.json) - Validation thresholds
- [Performance Optimization](../benchmarks/metrics-documentation.md) - Tuning guide
- [STAR Parameter Tuning](./standards/078-parameter-tuning.md) - Parameter sweep methodology

---

**Approved by:** Anchor Engine Core Team  
**Next Review:** Q3 2026
