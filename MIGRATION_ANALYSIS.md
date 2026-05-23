# Compounds Table Removal - Technical Analysis

**Date:** 2026-05-21  
**Author:** Automated Analysis  
**Status:** Ready for Review

---

## Executive Summary

The compounds table serves as an **index/aggregation layer** in the three-tier hierarchy (compounds → molecules → atoms). While it provides convenience for file-level queries, its core functionality can be replicated by atoms and molecules tables. Removing it would simplify the schema but requires migration of unique metadata and rewriting of dependent queries.

---

## 1. Schema Analysis: What Lives ONLY in Compounds?

### Compounds Table Fields

| Field | Type | Unique? | Notes |
|-------|------|---------|-------|
| `id` | TEXT (UUID) | ✅ **YES** | Primary key referenced by atoms/molecules via `compound_id` |
| `path` | TEXT | ⚠️ Partially | File path pointer; atoms have their own `source_path` |
| `timestamp` | REAL | ❌ No | Redundant - atoms/molecules also track timestamps |
| `provenance` | TEXT | ⚠️ Partially | Source origin ('internal'/'external'); atoms also have provenance |
| `molecular_signature` | TEXT | ⚠️ Partially | 64-bit Hamming SimHash; molecules also have this field |
| `atoms` | TEXT (JSON array) | ✅ **YES** | Aggregate list of atom IDs - unique to compounds |
| `molecules` | TEXT (JSON array) | ✅ **YES** | Aggregate list of molecule IDs - unique to compounds |
| `embedding` | TEXT | ⚠️ Partially | Compound-level embedding; atoms also have embeddings |

### Key Finding: The "Unique" Metadata

After thorough analysis, the compounds table has **two truly unique fields**:

1. **`atoms` array** - A set of all atom IDs belonging to this compound
2. **`molecules` array** - A set of all molecule IDs belonging to this compound

All other fields (`path`, `provenance`, `molecular_signature`) are either:
- Duplicated in atoms/molecules tables, OR
- Redundant given the pointer-only architecture

### The Critical Insight

The compounds table is essentially a **denormalized index** that stores:
- Which atoms belong to which file (via `atoms` array)
- Which molecules belong to which file (via `molecules` array)

This allows efficient queries like "give me all atoms from this file" without joining through the full molecule hierarchy. However, this information could be reconstructed by querying atoms directly on `source_path`.

---

## 2. Query Dependencies: What Joins Through Compounds?

### A. Radial Distiller (Primary Consumer)

**Current Usage:**
```sql
SELECT id, path, provenance FROM compounds WHERE id = ANY($1)
```

The radial distiller uses compounds to:
- Get the list of files for processing
- Extract file paths and provenance metadata
- Track ingestion progress per compound

**Impact of Removal:** The distiller would need to query molecules/atoms directly, grouping by `source_path` instead of using compounds as an intermediate layer.

### B. Context Inflator (Search Results)

**Current Usage:**
```sql
SELECT path, provenance FROM compounds WHERE id = $1
```

The context inflator joins compounds with atom_positions to retrieve:
- File paths for context inflation
- Provenance metadata
- Byte offsets for content extraction

**Impact of Removal:** Queries would need to join atoms directly, using `source_path` instead of compound lookups.

### C. Search Service (Tag-Based Retrieval)

**Current Usage:**
```sql
SELECT id, path, provenance FROM compounds WHERE id = ANY($1)
```

The search service uses compounds for:
- Batch fetching molecule tags by compound
- Merging atom and molecule tags
- Efficient retrieval of file-level metadata

**Impact of Removal:** All batch queries using `compound_id` arrays would need rewriting to use direct source_path lookups.

### D. Database Batch Utilities

**Current Usage (db-batch.ts):**
```sql
SELECT id, path, provenance FROM compounds WHERE id = ANY($1)
```

These utilities provide optimized batch operations for compound queries. They would need replacement with equivalent atom/molecule queries.

---

## 3. Breaking Changes: What Would Fail?

### A. Ingestion Pipeline

**Current Flow:**
1. Atomize content → produces `compound` object with id, path, provenance, atoms[], molecules[]
2. Call `atomicIngest.ingestResult(compound, molecules, atoms)` 
3. Compound is persisted via `batchWriteCompounds()`
4. Molecules and atoms are written separately

**What Breaks:** The ingestion pipeline expects to create a compound record first. Without this step:
- The `compound.id` UUID generation would need moving to atom/molecule level
- Provenance extraction logic needs restructuring
- Molecular signature computation needs reassignment

### B. Radial Distiller Service

**Current Flow:**
1. Query compounds for file list: `SELECT id, path, provenance FROM compounds`
2. For each compound, read file from filesystem via `compound.path`
3. Process content and create atoms/molecules

**What Breaks:** The distiller would need to:
- Query molecules/atoms directly by source_path
- Handle the case where multiple files might have similar paths (deduplication)
- Reconstruct provenance from atom-level metadata

### C. Search & Context Retrieval

**Current Flow:**
1. User query → search returns results with `compound_id`
2. Context inflator uses `compound_id` to fetch path/provenance
3. Results are inflated with surrounding context

**What Breaks:** All queries using `compound_id` would need rewriting:
- Foreign key lookups from atoms to compounds
- Join operations between compounds and molecules/atoms
- Batch queries using compound arrays

### D. Database Schema Constraints

**Foreign Key Dependencies:**
- Atoms table has `compound_id` foreign key reference
- Molecules table has `compound_id` foreign key reference

**Impact:** These constraints would need to be dropped or replaced with direct source_path references.

---

## 4. Migration Strategy

### Phase 1: Schema Preparation

```sql
-- No schema changes needed for atoms/molecules (they already have required fields)
-- Optionally drop compound_id foreign keys if removing compounds entirely
ALTER TABLE atoms DROP CONSTRAINT IF EXISTS fk_compound_id;
ALTER TABLE molecules DROP CONSTRAINT IF EXISTS fk_compound_id;
```

### Phase 2: Data Migration

```sql
-- Migrate molecular_signature from compounds to molecules (if not already present)
UPDATE molecules m
SET molecular_signature = c.molecular_signature
FROM compounds c
WHERE m.compound_id = c.id AND m.molecular_signature IS NULL;

-- Migrate provenance from compounds to atoms (if needed)
UPDATE atoms a
SET provenance = c.provenance,
    source_path = c.path
FROM compounds c
WHERE a.compound_id = c.id 
  AND (a.provenance IS NULL OR a.source_path IS NULL);

-- Drop compounds table
DROP TABLE compounds;
```

### Phase 3: Query Rewrites

**Replace compound queries with direct atom/molecule lookups:**

| Old Query Pattern | New Query Pattern |
|-------------------|-------------------|
| `SELECT path, provenance FROM compounds WHERE id = $1` | `SELECT source_path as path, provenance FROM atoms WHERE compound_id = $1 GROUP BY source_path, provenance` |
| `JOIN compounds c ON a.compound_id = c.id` | Remove join; use atom's source_path directly |
| `WHERE compound_id = ANY($1)` | `WHERE source_path = ANY($1)` (if storing paths instead of IDs) |

### Phase 4: Ingestion Pipeline Update

**New flow without compounds:**
1. Atomize content → produce atoms with `source_path`, `provenance`, `molecular_signature`
2. Create molecules from text chunks with their own `source_path`, `byte_offset_start/end`
3. Skip compound creation step entirely
4. Store provenance at atom/molecule level

---

## 5. Risk Assessment

### High Risk (P0)
- **Ingestion pipeline breaks** - Must update before any migration
- **Radial distiller fails** - Primary consumer of compounds table
- **Search results may change** - Queries need rewriting to maintain consistency

### Medium Risk (P1)
- **Context inflation accuracy** - Need to verify byte offsets are preserved
- **Tag merging logic** - Molecule tag aggregation needs verification
- **Batch query performance** - May degrade without compound-level batching

### Low Risk (P2)
- **Data integrity** - Atoms/molecules already store all required metadata
- **Pointer-only architecture** - Actually improves alignment with design principles
- **Schema simplification** - Fewer tables, fewer joins

---

## 6. Recommendation

**Proceed with removal, but in phases:**

1. **First**, update ingestion pipeline to skip compound creation (lowest risk)
2. **Second**, add a migration script that runs after ingestion updates
3. **Third**, run integration tests with both old and new code paths
4. **Finally**, drop compounds table once verified working

**Do NOT remove compounds until:**
- Ingestion pipeline is updated and tested
- All compound-dependent queries are rewritten
- Integration tests pass without compounds
- Rollback plan is in place (database backup)

---

## 7. The "Glaring Error" You Found

Your instinct was correct. The compounds table was scaffolding that:
1. Added write overhead during ingestion (extra INSERT per file)
2. Created a dependency layer that could fail (as seen with P6 test)
3. Duplicated metadata that atoms/molecules already carry

The "glaring error" is that the architecture had an unnecessary middleman layer. Removing it brings Anchor Engine closer to its pure, pointer-only form where:
- Atoms store individual concepts with their own provenance
- Molecules store semantic chunks with byte offsets
- No compound table needed as an intermediate index

This aligns perfectly with your original design vision of a deterministic, explainable, CPU-only memory system.

---

**Next Steps:** See `MIGRATION_PLAN.md` for detailed implementation steps and `engine/migrations/INGESTION_UPDATE_GUIDE.md` for code update instructions.