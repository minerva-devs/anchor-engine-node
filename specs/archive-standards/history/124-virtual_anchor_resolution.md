# Standard 124: Virtual Anchor Resolution for Physics Walker

**Version:** 1.0.0
**Date:** March 3, 2026
**Status:** Active
**Supersedes:** None

---

## Summary

Standard 124 defines the **Virtual Anchor Resolution** protocol for ensuring the Physics Walker receives real database molecule IDs instead of in-memory `virtual_*` IDs created by the ContextInflator. Without this resolution, the Physics Walker resolves 0 anchors and returns no associative results.

---

## Problem Statement

### The Virtual Molecule Design

`ContextInflator.inflateFromAtomPositions()` creates result objects with synthetic IDs:

```typescript
// context-inflator.ts — line 576
id: `virtual_${compoundId}_${window.start}_${window.end}`,
```

These virtual molecules represent byte-window reads from disk files. They are **never stored** in the `atoms` or `molecules` tables — they exist only in memory for the duration of a search request.

### How Virtual IDs Break the Physics Walker

The Physics Walker's first CTE, `resolved_atoms`, looks up anchor molecules by ID:

```sql
resolved_atoms AS (
  SELECT m.id, m.compound_id, m.start_byte, m.end_byte, m.tags
  FROM (
    SELECT id, compound_id, start_byte, end_byte, tags
    FROM molecules WHERE id = ANY($1)   -- ← $1 contains the anchor IDs
    LIMIT 50
  ) anc_mol
  JOIN atoms a ON a.compound_id = anc_mol.compound_id
  ...
)
```

When `$1` contains `virtual_15110b970f77de9e765953493682e37d_1075692_1075992`:
- `WHERE id = ANY($1)` returns 0 rows (no such ID in `molecules`)
- `resolved_atoms` is empty
- `anchor_tag_set` is empty (no anchor tags)
- `candidates_physical` finds 0 candidates
- Walker returns 0 associations

### Observed Symptom

```
[PhysicsWalker] SQL params: anchorIds=30, threshold=0.005, limit=200
[PhysicsWalker] SQL Weighting: 0 results in 10 ms
[PhysicsWalker] Zero results - checking potential causes:
[PhysicsWalker]  - Anchor count: 40
[PhysicsWalker]  - Threshold: 0.005
```

Anchor count shows 40 but 0 results — all 40 IDs were virtual, none had real DB rows.

---

## Solution

Before calling the Physics Walker, resolve virtual anchor IDs to real `mol_*` IDs by:

1. **Filtering** out all `virtual_*` IDs from `uniqueAnchors`
2. **Extracting** the `compound_id` from each virtual anchor (stored on the `SearchResult` object)
3. **Batch-querying** the `molecules` table for real IDs matching those compound IDs
4. **Merging** real IDs + resolved IDs into the final `anchorIds` set

### Implementation

**File:** `engine/src/services/search/search.ts`

**Location:** Physics Walker call site, lines 715–742

```typescript
// 1. Separate real DB IDs from virtual in-memory molecules.
const realIds = uniqueAnchors
  .map(a => a.id)
  .filter(id => id && id !== '' && !id.startsWith('virtual'));

// 2. Collect unique compound_ids from virtual anchors.
const virtualCompoundIds = [...new Set(
  uniqueAnchors
    .filter(a => a.id && a.id.startsWith('virtual') && a.compound_id)
    .map(a => a.compound_id as string)
)];

// 3. Resolve compound_ids to real mol_* IDs.
let resolvedMolIds: string[] = [];
if (virtualCompoundIds.length > 0) {
  try {
    const res = await db.run(
      `SELECT id FROM molecules WHERE compound_id = ANY($1) ORDER BY timestamp DESC LIMIT 100`,
      [virtualCompoundIds]
    );
    if (res.rows) resolvedMolIds = res.rows.map((r: any) => String(r.id));
  } catch (e: any) {
    console.warn('[Search] Failed to resolve virtual compound IDs:', e.message);
  }
}

// 4. Merge, deduplicate.
const anchorIds = [...new Set([...realIds, ...resolvedMolIds])];
```

---

## Why `compound_id` Works as the Lookup Key

Virtual molecules are created from `atom_positions` rows grouped by `compound_id`. Each virtual molecule represents a byte window within a compound. The `molecules` table stores all molecules for that compound (one per sentence/paragraph). By looking up all molecules sharing the same `compound_id`, the walker receives real neighboring molecules as anchors — which is exactly the intent of the ContextInflator's radial window.

### Data Flow

```
ContextInflator.inflateFromAtomPositions("rob")
         ↓
  atom_positions WHERE atom_label = "#rob"
  → compound_id: "15110b970f77de9e765953493682e37d"
  → byte_offset: 1075692
         ↓
  SearchResult {
    id: "virtual_15110b970f77de9e765953493682e37d_1075692_1075992",
    compound_id: "15110b970f77de9e765953493682e37d",   ← preserved
    ...
  }
         ↓
[Virtual Anchor Resolution]
  SELECT id FROM molecules WHERE compound_id = "15110b970f77de9e765953493682e37d"
  → ["mol_29cc4b6649b4", "mol_c5e8385a1923", ...]    ← real IDs
         ↓
PhysicsTagWalker receives real mol_* IDs → finds associations
```

---

## Performance Characteristics

| Metric | Before | After |
|--------|--------|-------|
| Anchor IDs passed to walker | 0–3 (only mol_* from molecule FTS) | 100+ real IDs |
| Physics associations found | 0 | Proportional to anchor quality |
| Extra DB query | None | 1 batch query per search |
| Query cost | — | O(1) with compound_id index |

The batch query uses `compound_id = ANY($1)` which hits the `idx_molecules_compound` index, completing in <5ms.

---

## Invariants

1. **Walker always receives real IDs.** No ID starting with `virtual` must be passed to `PhysicsTagWalker.performRadialInflation()`.
2. **Virtual anchors preserve `compound_id`.** `ContextInflator` must continue setting `compound_id` on virtual results (line 586 of `context-inflator.ts`).
3. **Graceful fallback.** If the resolution query fails, `resolvedMolIds = []` and the walker runs with only real FTS molecule IDs.

---

## Relationship to Other Standards

| Standard | Relationship |
|----------|--------------|
| **Standard 065** | Graph Associative Retrieval — describes Physics Walker algorithm |
| **Standard 094** | Smart Search Protocol — full search pipeline overview |
| **Standard 122** | Physics Walker Temporal Decay Safety — other walker safety fix |

---

## Testing

```typescript
test('virtual anchor IDs are resolved to real mol_* IDs before walker', async () => {
  // Setup: insert a molecule for a known compound
  await db.run(`INSERT INTO molecules (id, compound_id, ...) VALUES ('mol_test_01', 'compound_abc', ...)`);

  // Build a virtual anchor with that compound_id
  const virtualAnchors = [{
    id: 'virtual_compound_abc_0_500',
    compound_id: 'compound_abc',
    // ...
  }];

  // Resolution should return the real mol_* ID
  const resolved = await resolveVirtualAnchors(virtualAnchors);
  expect(resolved).toContain('mol_test_01');
  expect(resolved).not.toContain('virtual_compound_abc_0_500');
});

test('real mol_* IDs pass through unmodified', async () => {
  const anchors = [
    { id: 'mol_abc123', compound_id: 'compound_x' },
    { id: 'mol_def456', compound_id: 'compound_y' },
  ];
  const resolved = await resolveVirtualAnchors(anchors);
  expect(resolved).toContain('mol_abc123');
  expect(resolved).toContain('mol_def456');
});
```

---

## Implementation Files

- `engine/src/services/search/search.ts` — Virtual anchor resolution block (lines 715–742)
- `engine/src/services/search/context-inflator.ts` — Source of virtual IDs; `compound_id` must remain on SearchResult

---

**Author:** R.S. Balch II
**Implemented:** March 3, 2026
**Status:** Active
