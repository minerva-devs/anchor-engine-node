# STAR Parameter Tuning Guide

**Standard:** 078  
**Date:** February 27, 2026  
**Version:** 1.0.0  
**Status:** Active

---

## Overview

The STAR (Semantic Temporal Associative Retrieval) algorithm uses gravity-based scoring with tunable parameters. This guide explains parameter choices, provides tuning methodology, and documents ablation study frameworks.

---

## STAR Scoring Formula

```
Gravity Score = SharedTags × TimeDecay × Similarity

Where:
  SharedTags = |tags_A ∩ tags_B|
  TimeDecay = e^(-λΔt)
  Similarity = 1 - (simhash_distance / 64)
```

---

## Default Parameters

### Core Parameters

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| `time_decay_lambda` (λ) | `0.00001` | 0.000001-0.0001 | Controls recency bias |
| `damping_factor` | `0.85` | 0.5-0.95 | PageRank-style gravity |
| `temperature` | `0.2` | 0.1-1.0 | Exploration vs exploitation |
| `gravity_threshold` | `0.01` | 0.001-0.1 | Minimum association strength |

### Physics Walker Parameters

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| `walk_radius` | `1` | 1-5 | Tag graph traversal depth |
| `max_per_hop` | `50` | 10-200 | Max results per hop |
| `direct_limit` | `5` | 1-20 | Direct neighbor limit |
| `walker_limit` | `10` | 1-50 | Total walker results |

---

## Why λ=0.00001?

### Mathematical Derivation

The time decay formula is:
```
TimeDecay(Δt) = e^(-λΔt)
```

Where:
- `Δt` = time difference in **seconds**
- `λ` = decay constant

### Half-Life Calculation

The **half-life** is the time at which relevance decays to 50%:

```
0.5 = e^(-λt₁/₂)
ln(0.5) = -λt₁/₂
t₁/₂ = ln(2) / λ
```

For λ=0.00001:
```
t₁/₂ = 0.693 / 0.00001 = 69,300 seconds ≈ 19.25 hours
```

### Interpretation

| Time Since Event | Decay Factor | Relevance |
|------------------|--------------|-----------|
| 0 hours (now) | 1.0 | 100% |
| 19 hours (half-life) | 0.5 | 50% |
| 38 hours | 0.25 | 25% |
| 57 hours | 0.125 | 12.5% |
| 1 week | 0.06 | 6% |
| 1 month | 0.0003 | ~0% |

### Tuning for Different Corpus Ages

**Young corpus** (days to weeks):
```javascript
// Faster decay - recent content much more relevant
time_decay_lambda: 0.00005  // Half-life: ~4 hours
time_decay_lambda: 0.00002  // Half-life: ~10 hours
```

**Medium corpus** (weeks to months):
```javascript
// Balanced decay (default)
time_decay_lambda: 0.00001  // Half-life: ~19 hours
```

**Old corpus** (months to years):
```javascript
// Slower decay - older content still relevant
time_decay_lambda: 0.000005  // Half-life: ~38 hours
time_decay_lambda: 0.000002  // Half-life: ~4 days
time_decay_lambda: 0.000001  // Half-life: ~8 days
```

### Rule of Thumb

Choose λ based on desired half-life:
```javascript
// For half-life in hours:
lambda = 0.693 / (half_life_hours * 3600)

// Examples:
// 1 hour half-life
lambda = 0.693 / 3600 = 0.00019

// 1 day half-life
lambda = 0.693 / 86400 = 0.000008

// 1 week half-life
lambda = 0.693 / 604800 = 0.0000011
```

---

## Parameter Tuning Experiments

### Experiment 1: Lambda Sweep

**Goal:** Find optimal time decay for your corpus

```bash
# Run benchmark with different lambda values
for lambda in 0.000001 0.000005 0.00001 0.00002 0.00005; do
  # Update user_settings.json
  jq ".physics.time_decay_lambda = $lambda" user_settings.json > tmp.json
  mv tmp.json user_settings.json
  
  # Run benchmark
  node benchmarks/run_benchmark.js --seed 42
  
  # Record results
  echo "Lambda: $lambda -> $(cat benchmarks/last_run_results.json | jq '.search.avgLatency')"
done
```

**Measure:**
- Search latency
- Result relevance (manual rating)
- User satisfaction (if applicable)

### Experiment 2: Temperature Sweep

**Goal:** Balance exploration vs exploitation

```javascript
// Low temperature (0.1-0.3): Exploit known good results
// High temperature (0.5-1.0): Explore diverse results

// user_settings.json
{
  "physics": {
    "temperature": 0.1  // Very focused
    "temperature": 0.3  // Balanced (default)
    "temperature": 0.7  // More diverse
    "temperature": 1.0  // Maximum diversity
  }
}
```

### Experiment 3: Walk Radius

**Goal:** Control association depth

```javascript
// Small radius (1-2): Direct associations only
// Large radius (3-5): Distant associations included

{
  "physics": {
    "walk_radius": 1  // Only direct tag neighbors
    "walk_radius": 2  // Friends of friends
    "walk_radius": 3  // Extended network
  }
}
```

---

## Ablation Study Framework

### Purpose
Measure the impact of each STAR component on retrieval quality.

### Components to Test

1. **SharedTags** - Tag overlap contribution
2. **TimeDecay** - Recency bias contribution
3. **SimHash** - Semantic similarity contribution

### Methodology

#### Test 1: No Time Decay
```javascript
// Disable time decay
time_decay_lambda: 0

// Run benchmark
node benchmarks/run_benchmark.js --seed 42

// Compare with default
// Expected: Older results rank higher
```

#### Test 2: No Semantic Similarity
```javascript
// Disable SimHash contribution (edit search.ts)
Similarity = 1.0  // Constant, no variation

// Run benchmark
// Expected: Results less semantically coherent
```

#### Test 3: No Tag Sharing
```javascript
// Disable tag overlap
SharedTags = 1.0  // Constant

// Run benchmark
// Expected: Tag-based associations lost
```

### Results Template

```markdown
## Ablation Study Results

### Baseline (All Components)
- Avg Latency: 150ms
- Relevance Score: 4.5/5.0

### No Time Decay
- Avg Latency: 148ms
- Relevance Score: 3.8/5.0
- **Impact:** -15% relevance (old content less relevant)

### No Semantic Similarity
- Avg Latency: 145ms
- Relevance Score: 4.0/5.0
- **Impact:** -11% relevance (results less coherent)

### No Tag Sharing
- Avg Latency: 140ms
- Relevance Score: 3.5/5.0
- **Impact:** -22% relevance (associations lost)
```

---

## Corpus-Specific Optimization

### Personal Knowledge Base
**Characteristics:**
- Highly personal tagging scheme
- Irregular update patterns
- Long-tail relevance

**Recommended:**
```javascript
{
  "time_decay_lambda": 0.000005,  // Slower decay
  "temperature": 0.2,              // Focused results
  "walk_radius": 2                 // Moderate exploration
}
```

### Team/Enterprise Knowledge
**Characteristics:**
- Shared tagging conventions
- Regular updates
- Collaborative context

**Recommended:**
```javascript
{
  "time_decay_lambda": 0.00001,   // Balanced decay
  "temperature": 0.3,              // Some diversity
  "walk_radius": 3                 // Broader associations
}
```

### Research/Technical Documentation
**Characteristics:**
- Stable content (doesn't age quickly)
- Dense interconnections
- High precision needed

**Recommended:**
```javascript
{
  "time_decay_lambda": 0.000002,  // Very slow decay
  "temperature": 0.1,              // Very focused
  "walk_radius": 1                 // Direct associations only
}
```

---

## Diagnostic Tools

### Check Current Parameters
```bash
# View current settings
cat user_settings.json | jq '.physics'
```

### Visualize Parameter Impact
```javascript
// Plot time decay curves
const lambda = 0.00001;
const hours = Array.from({length: 168}, (_, i) => i); // 1 week
const decay = hours.map(h => Math.exp(-lambda * h * 3600));

// Plot with your favorite visualization library
console.log("Hours:", hours);
console.log("Decay:", decay);
```

### Benchmark Comparison
```bash
# Run with different parameters and compare
node benchmarks/run_benchmark.js --seed 42 --output results_v1.json
# ... change parameters ...
node benchmarks/run_benchmark.js --seed 42 --output results_v2.json

# Compare
diff results_v1.json results_v2.json
```

---

## Common Issues

### Issue: Old Content Never Appears
**Symptom:** Search only returns recent results  
**Cause:** Lambda too high (fast decay)  
**Fix:** Decrease lambda
```javascript
time_decay_lambda: 0.00001  // →  0.000005
```

### Issue: Irrelevant Old Content Dominates
**Symptom:** Search returns outdated information  
**Cause:** Lambda too low (slow decay)  
**Fix:** Increase lambda
```javascript
time_decay_lambda: 0.000005  // →  0.00002
```

### Issue: Results Too Narrow
**Symptom:** Same types of results always  
**Cause:** Temperature too low  
**Fix:** Increase temperature
```javascript
temperature: 0.1  // →  0.3
```

### Issue: Results Too Random
**Symptom:** Inconsistent, unrelated results  
**Cause:** Temperature too high  
**Fix:** Decrease temperature
```javascript
temperature: 0.8  // →  0.3
```

---

## Quick Reference

### Parameter Effects

| Parameter | Increase → | Decrease → |
|-----------|------------|------------|
| **Lambda** | More recent bias | More historical |
| **Temperature** | More diverse | More focused |
| **Walk Radius** | Broader associations | Direct only |
| **Damping** | Stronger gravity | Weaker gravity |

### Recommended Starting Points

| Use Case | Lambda | Temp | Radius |
|----------|--------|------|--------|
| **Personal notes** | 0.000005 | 0.2 | 2 |
| **Team wiki** | 0.00001 | 0.3 | 3 |
| **Research docs** | 0.000002 | 0.1 | 1 |
| **Chat history** | 0.00002 | 0.2 | 1 |
| **Code repository** | 0.000005 | 0.15 | 2 |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-27 | Initial parameter tuning guide |

---

## Related Documents

- [Benchmark Protocol](./benchmark-protocol.md) - How to run benchmarks
- [Whitepaper](../docs/whitepaper.md) - STAR algorithm theory
- [Physics Configuration](../specs/plan.md) - Parameter reference

---

**Approved by:** Anchor Engine Core Team  
**Next Review:** Q3 2026
