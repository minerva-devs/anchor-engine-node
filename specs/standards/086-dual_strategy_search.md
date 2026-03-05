# Standard 086: Dual-Strategy Search

**Status:** ✅ Production Ready | **Version:** 2.0.0 | **Date:** February 22, 2026

**Supersedes:** Standard 086 v1.0 (Tag Walker only)

---

## Overview

Standard 086 defines the **Dual-Strategy Search** protocol for the Anchor Engine. It supports two distinct search modes:

1. **Standard Search** - Balanced 70/30 budget with temporal decay (default)
2. **Max-Recall Search** - Zero temporal decay, 3-hop traversal, maximum context retrieval

---

## Strategy Selection

### Automatic Trigger

Max-recall mode **automatically activates** when:
- `estimated_tokens > 16000` (i.e., `max_chars > 65,536`)

### Manual Trigger

Explicitly request max-recall via API:
```json
{
  "query": "...",
  "max_chars": 524288,
  "strategy": "max-recall"
}
```

---

## Configuration Parameters

### Standard Search (Default)

```typescript
{
  temporal_decay: 0.00001,  // Slight recency bias
  damping: 0.85,            // 15% loss per hop
  max_hops: 1,              // Single-hop traversal
  min_relevance: 0.3,       // Filter low-relevance results
  temperature: 0.2,         // Low serendipity
  max_per_hop: 50,          // Conservative expansion
  walk_radius: 1            // Narrow search
}
```

### Max-Recall Search

```typescript
{
  temporal_decay: 0.0,      // Zero age bias - all memories equal
  damping: 1.0,             // Zero signal loss on multi-hop
  max_hops: 3,              // Deep 3-hop traversal
  min_relevance: 0.0,       // No filtering - budget truncates
  temperature: 0.8,         // High serendipity
  max_per_hop: 200,         // Aggressive expansion
  walk_radius: 3            // Full radial inflation
}
```

---

## Search Flow

### Standard Search Flow

```
1. User Request → POST /v1/memory/search
2. Detect budget < 65k chars → Standard mode
3. Execute single search with 70/30 budget
4. Physics Walker: 1-hop, damping=0.85
5. Return 16k-32k chars context
```

### Max-Recall Search Flow

```
1. User Request → POST /v1/memory/search
2. Detect budget > 65k chars → Max-recall mode
3. Split query into 4-word chunks (5 max)
4. Execute 5 parallel searches (full budget each)
5. Merge & deduplicate results
6. Context Inflation: n-1, n+1 expansion from disk
7. Return 512k-618k chars context
```

---

## Context Inflation

### Specification

For max-recall searches, **post-merge context inflation** expands each atom with surrounding context:

```typescript
// Calculate per-atom budget
const budgetPerAtom = Math.floor(maxChars * 0.9 / mergedResults.length);

// Inflate from disk (n-1, n+1 expansion)
const inflatedResults = await ContextInflator.inflate(
  mergedResults,
  maxChars,
  budgetPerAtom  // Dynamic radius
);
```

### Performance

| Metric | Value |
|--------|-------|
| **Avg Chars/Atom** | 8,550 chars |
| **Budget Utilization** | 98% |
| **Disk Reads** | 100% (0 DB fallback) |
| **Atoms Inflated** | 60 typical |

---

## Query Splitting

### Algorithm

For max-recall mode, split long queries into 4-word chunks:

```typescript
const words = query.split(/\s+/).filter(w => w.length > 2);
for (let i = 0; i < words.length; i += 4) {
  splitQueries.push(words.slice(i, i + 4).join(' '));
}
splitQueries = splitQueries.slice(0, 5);  // Limit to 5 chunks
```

### Example

**Input:**
```
"Coda C-001 Rob Dory Jade STAR algorithm Rust rewrite white paper arXiv Android app NextTier job Prec"
```

**Split:**
```json
[
  "Coda C-001 Rob Dory",
  "Jade STAR algorithm Rust",
  "rewrite white paper arXiv",
  "Android app NextTier job",
  "Precious Nwaoha Jac Cox"
]
```

---

## Budget Allocation

### Standard Mode
```typescript
const budgetPerQuery = Math.floor(maxChars / splitQueries.length);
```
**Rationale:** Conservative, prevents overflow

### Max-Recall Mode
```typescript
const budgetPerQuery = maxChars;  // Full budget per sub-query
```
**Rationale:** Maximize retrieval for each chunk

---

## API Specification

### Request

```json
POST /v1/memory/search
{
  "query": "string (required)",
  "max_chars": "number (optional, default: 100000)",
  "strategy": "string (optional: 'standard' | 'max-recall')",
  "buckets": "array (optional)",
  "tags": "array (optional)",
  "provenance": "string (optional: 'internal' | 'external' | 'quarantine' | 'all')"
}
```

### Response

```json
{
  "context": "string (full serialized context)",
  "results": "array (individual search results)",
  "results_count": "number",
  "strategy": "string ('standard' | 'max-recall')",
  "metadata": {
    "graphStats": "object",
    "budget_used": "number",
    "atoms_inflated": "boolean"
  }
}
```

---

## Performance Benchmarks

### Standard Search

| Metric | Value |
|--------|-------|
| **Latency** | 150-300ms |
| **Context** | 16k-32k chars |
| **Atoms** | 20-40 |
| **Use Case** | Daily queries |

### Max-Recall Search

| Metric | Value |
|--------|-------|
| **Latency** | 25-50s |
| **Context** | 512k-618k chars |
| **Atoms** | 60-100 |
| **Use Case** | Research, audits |

---

## Trade-off Analysis

| Aspect | Standard | Max-Recall |
|--------|----------|------------|
| **Speed** | 150-300ms | 25-50s |
| **Completeness** | 16k-32k chars | 512k-618k chars |
| **Temporal Bias** | Slight recency | None (ageless) |
| **Graph Depth** | 1 hop | 3 hops |
| **Serendipity** | Low (0.2) | High (0.8) |
| **Use Case** | Quick lookup | Deep research |

**Verdict:** Max-recall trades 30x latency for 30x more context. Acceptable for research/analysis.

---

## Implementation Files

- `engine/src/config/max-recall-config.ts` - Max-recall configuration
- `engine/src/services/search/search.ts` - Core search logic
- `engine/src/services/search/context-inflator.ts` - Context expansion
- `engine/src/routes/api.ts` - API endpoint (lines 250-260)

---

## Logging

### Auto-Trigger Event

```json
{
  "event": "SEARCH_AUTO_MAX_RECALL",
  "reason": "token_budget > 16k",
  "estimated_tokens": 131072,
  "max_chars": 524288
}
```

### Context Inflation Log

```
[SmartSearch] Inflating 60 atoms with 7864 chars each (total budget: 524288)...
[ContextInflator] inflate(): 60 from disk, 0 from DB fallback, 0 already inflated
[SmartSearch] Inflation complete: 60 atoms with avg 8550 chars each
```

---

## Related Standards

- **Standard 110** - Ephemeral Index Architecture
- **Standard 113** - Automatic Max-Recall Trigger
- **Standard 116** - Phoenix Protocol Backup/Restore

---

## Future Enhancements

- [x] SimHash distance for cross-file deduplication ✅ **Implemented v4.1.2**
- [ ] Query result caching layer
- [ ] Pagination for large result sets
- [ ] Warm-up routine for cold start mitigation

---

## Deduplication Strategy

### Complete Dedup Pipeline (v4.1.2)

1. **Geometric Dedup** - Same-file overlapping windows (50% threshold)
2. **Content Fingerprint** - Cross-file exact duplicates (MD5 hash of first 500 chars)
3. **Containment Check** - Subset detection (one result contains another)
4. **Fuzzy Prefix Match** - Near-exact duplicates (50-100 char fingerprint comparison)
5. **SimHash Distance** - Cross-file near-duplicates (Hamming distance < 5) ✅ **NEW**

### Expected Performance

| Dedup Type | Before v4.1.2 | After v4.1.2 |
|------------|---------------|--------------|
| Same-file duplicates | ✅ Caught | ✅ Caught |
| Cross-file exact | ✅ Caught | ✅ Caught |
| Cross-file near | ❌ Missed | ✅ Caught |
| **Total Dedup Rate** | 25-35% | **40-50%** |

### Implementation

```typescript
// 3. SimHash Distance Check - Cross-file near-duplicates (NEW)
// Hamming distance < 5 out of 64 bits = near-duplicate content
if (candidate.molecular_signature && kept.molecular_signature) {
  const simhashDistance = getHammingDistance(candidate.molecular_signature, kept.molecular_signature);
  if (simhashDistance < 5) {
    isContentDuplicate = true;
    break;
  }
}
```

---

**Repository:** https://github.com/RSBalchII/anchor-engine-node
**Status:** ✅ Production Ready (February 22, 2026)
