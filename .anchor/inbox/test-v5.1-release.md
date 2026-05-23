# v5.1.0 Release Verification Pipeline - Test Document

## Overview

This document serves as a comprehensive test case for the v5.1.0 release verification pipeline, covering all major components of the Anchor Engine system including ingestion, search algorithms, and distillation workflows.

---

## Architecture Design Decisions

### Problem Statement

The Anchor Engine needed to support multiple search strategies while maintaining deterministic results and sub-second latency. Previous implementations suffered from:
- Inconsistent scoring across different query types
- Memory bloat from storing full content in database
- Slow multi-hop traversal due to inefficient graph algorithms

### Solution Architecture

We implemented a compound storage model with the following components:

1. **Pointer-Only Database Storage** (Standard 051)
   - Raw content written to `mirrored_brain/@inbox/{timestamp}_{hash}.md` filesystem
   - Database stores only metadata pointers and relationships
   - Reduces database size by ~90% while maintaining full fidelity

2. **Four Search Algorithms**
   - **STAR (Semantic)**: Default semantic search with physics walker expansion
   - **Exact**: FTS-only prefix matching without expansion
   - **Deep**: Max-recall multi-hop traversal for comprehensive results
   - **Illuminate**: BFS from top-degree hubs for connected subgraphs

3. **Distillation Pipeline**
   - Extracts problem/solution/rationale blocks from raw content
   - Outputs structured decision records in notebook format
   - Supports tag-based and seed-based modes

---

## Implementation Details

### Database Schema Changes

The compounds table now stores only pointer metadata:

```typescript
interface Compound {
  id: string;
  title: string;
  compound_path: string; // Points to mirrored_brain file
  status: 'ingested' | 'distilled' | 'archived';
  tags: string[];
  created_at: Date;
}
```

### Mirror File Format

Raw content files follow this structure:

```markdown
---
title: "Architecture Decision Record"
compound_id: "abc123-def456"
tags: [architecture, search, distillation]
created: 2026-05-20T07:38:00.000Z
---

# Problem Statement

The system needed to handle...

## Solution

We implemented...

## Rationale

This approach was chosen because...
```

### Search Algorithm Specifications

#### STAR Semantic Search (Default)

**Query Processing:**
1. Tokenize query into semantic concepts
2. Expand using synonym ring (102 terms loaded)
3. Execute physics walker expansion from top hubs
4. Score results using vector similarity + graph proximity

**Expected Output Format:**
```json
{
  "results": [
    {
      "content": "...",
      "score": 0.95,
      "source": "compound_id",
      "tags": ["architecture"],
      "provenance": "semantic_expansion"
    }
  ]
}
```

#### Exact Search (FTS-Only)

**Query Format:** `exact:query` or POST with `{mode: "exact"}`

**Behavior:**
- FTS-only prefix matching
- No physics walker expansion
- Returns exact matches only

**Expected Output Format:**
```json
{
  "results": [
    {
      "content": "...",
      "score": 1.0,
      "source": "compound_id"
    }
  ]
}
```

#### Deep Search (Max-Recall)

**Query Format:** `deep:query` or POST with `{mode: "deep"}`

**Behavior:**
- Multi-hop traversal through all connected nodes
- Returns comprehensive results regardless of distance
- Useful for exploring entire knowledge graph

**Expected Output Format:**
```json
{
  "results": [
    {
      "content": "...",
      "score": 0.87,
      "hops": 3,
      "source": "compound_id"
    }
  ]
}
```

#### Illuminate BFS Traversal

**Query Format:** `illuminate:query` or POST with `{mode: "global"}`

**Behavior:**
- Breadth-first search from top-degree hubs
- Returns connected subgraph
- Useful for discovering related concepts

**Expected Output Format:**
```json
{
  "results": [
    {
      "content": "...",
      "score": 0.92,
      "distance": 1,
      "source": "compound_id"
    }
  ]
}
```

---

## Distillation Pipeline

### Standard Mode (Decision Records)

**Input:** Seed compound(s) with buckets array
**Output:** Structured decision records in notebook format

**Process:**
1. Parse raw markdown content
2. Extract problem/solution/rationale blocks using regex patterns
3. Create DecisionRecord objects with metadata
4. Write to `notebook/distills/{timestamp}.ipynb`

**Expected Output Format:**
```json
{
  "stats": {
    "compounds_processed": 1,
    "blocks_total": 5,
    "decision_records": 3
  },
  "output.path": "/path/to/notebook/distills/...",
  "records": [
    {
      "type": "DecisionRecord",
      "problem": "...",
      "solution": "...",
      "rationale": "...",
      "timestamp": "..."
    }
  ]
}
```

### Tag-Based Mode (Cross-Tag Deduplication)

**Input:** Seed tags array
**Output:** Distilled content with cross-tag deduplication

**Process:**
1. Find all compounds matching any seed tag
2. Merge content from multiple sources
3. Remove duplicate blocks based on content hash
4. Return `inflated_content` showing merged result

**Expected Output Format:**
```json
{
  "stats": {
    "compounds_processed": 3,
    "unique_blocks": 15,
    "deduplicated_count": 2
  },
  "output.path": "/path/to/notebook/distills/...",
  "records": [...],
  "inflated_content": "Merged content from all tags"
}
```

---

## Test Cases for v5.1.0

### TC-001: Ingestion with Pointer Storage

**Steps:**
1. POST to `/v1/ingest` with test markdown
2. Verify response contains `compound_id`, `timestamp`, `status`
3. Check `.anchor/mirrored_brain/@inbox/` for raw file
4. Query database - verify only pointer stored, not full content

**Expected Result:** ✅ PASS

### TC-002: STAR Semantic Search

**Steps:**
1. POST to `/v1/memory/search` with query "architecture problem solution"
2. Verify response format matches specification
3. Check results include tags and provenance fields

**Expected Result:** ✅ PASS

### TC-003: Exact Search (FTS-Only)

**Steps:**
1. Query with prefix `exact:` or POST with exact mode
2. Verify no physics walker expansion occurs
3. Confirm FTS-only matching behavior

**Expected Result:** ✅ PASS

### TC-004: Deep Search (Max-Recall)

**Steps:**
1. Query with deep mode enabled
2. Verify multi-hop traversal results
3. Check comprehensive coverage of knowledge graph

**Expected Result:** ✅ PASS

### TC-005: Illuminate BFS Traversal

**Steps:**
1. Query with `illuminate:` prefix or global mode
2. Verify connected subgraph from top hubs
3. Confirm breadth-first search behavior

**Expected Result:** ✅ PASS

### TC-006: Standard Distillation

**Steps:**
1. POST to `/v1/memory/distill` with seed and decision-records format
2. Verify stats include compounds_processed, blocks_total, decision_records
3. Check output.path points to notebook/distills/
4. Confirm records array contains DecisionRecord objects

**Expected Result:** ✅ PASS

### TC-007: Tag-Based Distillation

**Steps:**
1. POST with mode "tag-based" and seed tags
2. Verify cross-tag deduplication works correctly
3. Check inflated_content returned properly

**Expected Result:** ✅ PASS

---

## Performance Benchmarks

| Operation | Expected Time | Actual Time | Status |
|-----------|---------------|-------------|--------|
| Ingest 1000 lines | < 2s | TBD | ⏳ |
| STAR Search | < 500ms | TBD | ⏳ |
| Exact Search | < 100ms | TBD | ⏳ |
| Deep Search | < 2s | TBD | ⏳ |
| Illuminate BFS | < 1.5s | TBD | ⏳ |
| Standard Distillation | < 3s | TBD | ⏳ |
| Tag-Based Distillation | < 4s | TBD | ⏳ |

---

## Known Issues and Limitations

### Issue #1: Simple Text Returns Zero Blocks

**Description:** When distilling simple text content (no structured markdown), the system returns 0 blocks.

**Impact:** Low - affects only unstructured content
**Workaround:** Use structured markdown with problem/solution/rationale sections

### Issue #2: Mirror Write Failures Don't Block Ingestion

**Description:** If mirror file write fails, ingestion still succeeds but filesystem is not updated.

**Impact:** Medium - potential data loss if server crashes before flush
**Status:** Known limitation, logged for future improvement

---

## Conclusion

This test document provides comprehensive coverage of all v5.1.0 features and should be used to verify:
- ✅ Pointer-only database storage (Standard 051)
- ✅ All four search algorithms return properly formatted output
- ✅ Distillation returns decision records with problem/solution/rationale
- ✅ Cross-tag deduplication works correctly

---

## Tags

#architecture #search #distillation #v5.1.0 #verification
