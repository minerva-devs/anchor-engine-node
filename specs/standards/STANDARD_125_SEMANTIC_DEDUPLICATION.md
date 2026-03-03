# Standard 125: Semantic Deduplication of Search Results

**Version:** 1.0  
**Status:** Active  
**Introduced:** v4.4.2  
**File:** `engine/src/services/search/search-utils.ts`

---

## Problem

Search results frequently contained multiple semantically overlapping snippets from the same source file. For example, a query for "Who is Rob?" would return 3–4 snippets from `Sybil-History.md` all expressing the same facts (neurodivergence, relationship with Dory) at slightly different byte offsets — each beyond the proximity coalescing threshold but covering the same semantic ground.

This caused two observed failure modes:
1. **Token waste**: A 4K context window could be majority-occupied by one file's repeated facts
2. **LLM evaluation feedback**: "C+ for efficiency" — overlapping 100-character snippets from the same file crowding out other valuable nodes

---

## Solution

Two-layer deduplication applied in `coalesceByProximity` and `formatResults`:

### Layer 1: Per-Source Cap (coalesceByProximity)

After merging atoms by byte-proximity within each source file, cap the number of snippets contributed per source:

```typescript
const maxPerSource = Math.max(3, Math.min(8, Math.ceil(maxSnippets / 15)));
const perSourceCapped = merged
  .sort((a, b) => b.relevanceScore - a.relevanceScore)
  .slice(0, maxPerSource);
```

| Budget | maxSnippets | maxPerSource |
|--------|-------------|--------------|
| 4KB (standard) | 50 | 3 |
| 16KB | 107 | 7 |
| 96KB+ (max-recall) | 1311 | 8 |

### Layer 2: Word-Overlap Deduplication (formatResults)

After temporal enrichment and tag-stripping, apply Jaccard word-overlap deduplication:

1. Sort `enrichedSnippets` by `weighted_score` DESC (best content wins)
2. For each snippet, compute its "significant words" (length ≥ 5, not in stopword set)
3. Compute Jaccard overlap with all already-accepted snippets' word sets
4. If overlap ≥ `OVERLAP_THRESHOLD` (0.60), discard the snippet
5. Re-sort `deduplicatedSnippets` chronologically for causal narrative

**Overlap formula:** `intersection / min(|A|, |B|)` — asymmetric, tolerant of one-way coverage

**Significant word criteria:**
- Length ≥ 5 characters
- Not in stopword set (~30 common English function words)
- Lowercased before comparison

---

## Invariants

1. Per-source cap applies BEFORE the global `maxSnippets` cap
2. Word-overlap dedup applies AFTER inflation and tag-stripping (operates on final displayed content)
3. Score-ordering during dedup ensures lower-scored duplicates are dropped, not higher-scored originals
4. Chronological order is restored after dedup for LLM causal reasoning
5. Dedup stats are reported in response metadata: `metadata.deduplication.{ removed, remaining }`
6. The 60% overlap threshold is tolerant of paraphrase; catches near-verbatim repetition

---

## Distinction from Other Standards

- **Standard 120** (Proximity Coalescing): merges atoms within N bytes of each other in the same file (spatial dedup)
- **Standard 123** (Tag Sanitization): removes `#Tag` tokens from content strings
- **Standard 124** (Virtual Anchor Resolution): maps `virtual_*` IDs to real DB IDs
- **Standard 125** (this): removes semantically redundant snippets across all sources (semantic dedup)
