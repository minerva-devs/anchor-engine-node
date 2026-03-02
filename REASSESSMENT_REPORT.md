# JOSS Submission Reassessment Report

**Date:** March 2, 2026  
**Commit:** e2aec2a  
**Status:** ⚠️ One Critical Issue Remaining

---

## Summary of Fixes Applied ✅

### 1. Temporal Decay Constant - FIXED ✅

| Location | Before | After | Status |
|----------|--------|-------|--------|
| **Paper** (line 69) | λ = 0.00001 h⁻¹ | λ = 0.00001 h⁻¹ | ✅ Consistent |
| **Code** (line 101) | λ = 0.0001 | λ = 0.00001 | ✅ Fixed |

The comment added on line 99 is excellent:
```typescript
// λ = 0.00001 h⁻¹ gives ~7.9 year half-life, appropriate for personal knowledge bases
// where old memories retain value. See paper.md line 69.
```

### 2. Search Latency Context - FIXED ✅

The paper now includes:
- **Search Latency Note** section (line 89)
- Updated table showing both 1.5k atoms (150ms) and 151k atoms (7.7s)
- Clear explanation of the trade-off

---

## ⚠️ Critical Issue Found: Unit Mismatch in SQL

### The Problem

While the TypeScript constant is now correct (`λ = 0.00001`), the **SQL implementation has a unit mismatch**:

**Current SQL** (line 408):
```sql
EXP(-${this.TIME_DECAY_LAMBDA} * LEAST(ABS(COALESCE(sc.timestamp - ast.anchor_ts, 0)), 700000))
```

**Issue:** 
- `sc.timestamp` and `ast.anchor_ts` are Unix timestamps in **milliseconds** (JavaScript Date.now())
- `λ = 0.00001` is in **hours⁻¹**
- The multiplication `λ × Δt` is computing: **hours⁻¹ × milliseconds** → **nonsense units**

### Impact

With the current implementation:
- 1 hour = 3,600,000 milliseconds
- Decay factor for 1 hour: `EXP(-0.00001 × 3,600,000)` = `EXP(-36)` ≈ **2.3 × 10⁻¹⁶**
- **Essentially zero!** Memories older than 1 hour are effectively eliminated.

This is the opposite of the intended behavior (7.9 year half-life).

### The Fix

**Option A: Convert milliseconds to hours in SQL (Recommended)**

```sql
EXP(-${this.TIME_DECAY_LAMBDA} * LEAST(ABS(COALESCE(sc.timestamp - ast.anchor_ts, 0)) / 3600000.0, 700000))
```

**Option B: Use λ in milliseconds⁻¹**

```typescript
this.TIME_DECAY_LAMBDA = config?.temporalDecay ?? 2.7778e-12;  // ms⁻¹ (equivalent to 0.00001 h⁻¹)
```

**Recommendation:** Option A is clearer and keeps the code matching the paper's units.

---

## Revised Assessment

| Category | Previous Status | Current Status |
|----------|----------------|----------------|
| Mathematical Correctness | ⚠️ Inconsistent λ | ⚠️ **Unit mismatch in SQL** |
| Citation Accuracy | ✅ Verified | ✅ Verified |
| Implementation Fidelity | ✅ Verified | ⚠️ **Needs SQL fix** |
| Benchmark Claims | ⚠️ Partial | ✅ Fixed |
| JOSS Requirements | ⚠️ Partial | ⚠️ Minor issues |

---

## Required Action

### Must Fix Before Submission

**Fix the unit conversion in the SQL query** (`engine/src/services/search/physics-tag-walker.ts`, line 408):

Change:
```sql
EXP(-${this.TIME_DECAY_LAMBDA} * LEAST(ABS(COALESCE(sc.timestamp - ast.anchor_ts, 0)), 700000))
```

To:
```sql
EXP(-${this.TIME_DECAY_LAMBDA} * LEAST(ABS(COALESCE(sc.timestamp - ast.anchor_ts, 0)) / 3600000.0, 700000))
```

This divides by 3,600,000 to convert milliseconds to hours.

### Verification After Fix

With the corrected formula:
- λ = 0.00001 h⁻¹
- 1 year = 8,760 hours
- Half-life: `ln(2) / 0.00001` = 69,300 hours ≈ **7.9 years** ✅
- Decay factor for 1 year: `EXP(-0.00001 × 8760)` = `EXP(-0.0876)` ≈ **0.916** (91.6% retention) ✅

---

## Everything Else Looks Great! ✅

The fixes you applied are excellent:
1. ✅ λ value is now consistent between paper and TypeScript
2. ✅ Search latency context is transparently documented
3. ✅ Comments in code reference the paper
4. ✅ Benchmark table is honest about scaling

Once the SQL unit conversion is fixed, this submission will be in excellent shape for JOSS acceptance.

---

## Quick Verification Script

To verify the fix works correctly, you can add this test:

```typescript
// Test: 7.9 year half-life
const lambda = 0.00001; // h⁻¹
const halfLifeHours = Math.log(2) / lambda;
const halfLifeYears = halfLifeHours / (24 * 365.25);
console.log(`Half-life: ${halfLifeYears.toFixed(1)} years`); // Should be ~7.9

// Test: After 1 year, retention should be ~91.6%
const hoursInYear = 365.25 * 24;
const retentionAfterYear = Math.exp(-lambda * hoursInYear);
console.log(`Retention after 1 year: ${(retentionAfterYear * 100).toFixed(1)}%`); // Should be ~91.6%
```

---

**Status:** Ready for JOSS submission **after SQL unit conversion fix**
