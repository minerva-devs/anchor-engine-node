# Compounds Table Removal - Implementation Plan

## Executive Summary

The `compounds` table is a redundant middleman layer. The mature architecture uses:
- **Molecules**: Store file provenance via `source_path` and byte offsets
- **Atoms**: Store tags/concepts with direct references to molecules/atoms

This plan removes the compounds table entirely, simplifying the schema and reducing write overhead during ingestion.

---

## Phase 1: Schema Analysis & Data Mapping

### Current Schema State

**Compounds Table (to be removed):**
| Column | Type | Purpose |
|--------|------|--------|
| `id` | TEXT PRIMARY KEY | UUID, referenced by molecules/atoms |
| `path` | TEXT | File path pointer |
| `timestamp` | REAL | Ingestion timestamp |
| `provenance` | TEXT | Source/provenance metadata ⚠️ UNIQUE |
| `molecular_signature` | TEXT | Compound-level signature |
| `atoms` | TEXT[] | Array of atom IDs (FK) |
| `molecules` | TEXT[] | Array of molecule IDs (FK) |
| `embedding` | TEXT | Vector embedding |

**Molecules Table:**
| Column | Type | Purpose |
|--------|------|--------|
| `id` | TEXT PRIMARY KEY | UUID |
| `content` | TEXT | Semantic chunk content |
| `compound_id` | TEXT FK | Reference to compounds.id |
| `sequence` | INTEGER | Sequence number within compound |
| `start_byte`, `end_byte` | INTEGER | Byte offsets in source file |
| `type`, `numeric_value`, `numeric_unit` | ... | Numeric literal parsing |
| `molecular_signature` | TEXT | Chunk signature |
| `embedding` | TEXT | Vector embedding |
| `timestamp` | REAL | Ingestion timestamp |
| `tags` | JSONB | Tags |
| `entities` | JSONB | Named entities |

**Atoms Table:**
| Column | Type | Purpose |
|--------|------|--------|
| `id` | TEXT PRIMARY KEY | UUID |
| `source_path` | TEXT | File path pointer ⚠️ CONTENT STORED |
| `timestamp` | REAL | Ingestion timestamp |
| `simhash` | TEXT | Simhash for dedup |
| `embedding` | TEXT | Vector embedding |
| `vector_id` | BIGINT | Vector DB ID |
| `provenance` | TEXT | Provenance metadata ⚠️ UNIQUE |
| ... | ... | Optional columns (compound_id, start_byte, etc.) |

### Data Mapping Decisions

1. **`path` field**: Already stored in molecules via compound relationship → No action needed
2. **`provenance` field**: NOT replicated in molecules/atoms → **ADD to both tables**
3. **`molecular_signature`**: Compound-level aggregation → Keep at molecule level
4. **`embedding`**: Compound-level vector → Keep at molecule level (or compute on-demand)

---

## Phase 2: Schema Migration Steps

### Step 1: Add Missing Columns to Molecules Table

```sql
-- Add provenance column to molecules table
ALTER TABLE molecules 
ADD COLUMN IF NOT EXISTS provenance TEXT;

-- Optionally add molecular_signature if not present
ALTER TABLE molecules 
ADD COLUMN IF NOT EXISTS molecular_signature TEXT;
```

### Step 2: Create Migration Script

**Migration SQL (migrate_compounds_to_molecules.sql):**

```sql
BEGIN TRANSACTION;

-- Step 1: Copy compound-level provenance to all related molecules
UPDATE molecules m
SET provenance = c.provenance,
    molecular_signature = c.molecular_signature
FROM compounds c
WHERE m.compound_id = c.id;

-- Step 2: Verify data integrity
DO $$
DECLARE
    missing_provenance INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_provenance
    FROM molecules WHERE provenance IS NULL;
    
    IF missing_provenance > 0 THEN
        RAISE EXCEPTION 'Migration failed: % molecules have no provenance', 
            missing_provenance;
    END IF;
END $$;

-- Step 3: Drop compounds table (if empty or after verification)
DROP TABLE IF EXISTS compounds;

COMMIT;
```

### Step 3: Update Ingestion Pipeline

**Changes needed in ingestion service:**

1. **Remove compound creation step** from ingestion pipeline
2. **Write directly to molecules table** with provenance field
3. **Update atom records** to use molecule-level provenance

**Pseudocode for new ingestion flow:**

```typescript
async function ingestFile(filePath: string, content: string) {
  const provenance = extractProvenance(filePath); // NEW
  
  // OLD: compound = await createCompound(filePath, provenance);
  
  // NEW: Parse content into molecules/atoms directly
  const molecules = parseMolecules(content, filePath, provenance);
  const atoms = parseAtoms(content, filePath, provenance);
  
  for (const mol of molecules) {
    mol.provenance = provenance; // SET PROVENANCE
    await db.insert('molecules', mol);
  }
  
  for (const atom of atoms) {
    atom.provenance = provenance; // SET PROVENANCE
    await db.insert('atoms', atom);
  }
}
```

---

## Phase 3: Implementation Checklist

### Pre-Migration Checks
- [ ] Verify current data in compounds table
- [ ] Check for any external queries using compounds table
- [ ] Backup compounds table data (if needed)

### Schema Changes
- [ ] Add `provenance` column to molecules table
- [ ] Add `molecular_signature` column to molecules table (if not present)
- [ ] Create migration script and test with empty compounds table
- [ ] Run migration on staging database

### Code Changes
- [ ] Update ingestion service to skip compound creation
- [ ] Remove compound ID generation from ingestion pipeline
- [ ] Update atom/molecule creation to include provenance field
- [ ] Update any queries that join through compounds table

### Post-Migration Validation
- [ ] Verify all molecules have provenance populated
- [ ] Run test queries previously using compounds table
- [ ] Confirm no foreign key violations
- [ ] Drop compounds table from schema

---

## Phase 4: Testing & Rollback Plan

### Test Cases
1. **Ingestion test**: Ingest a file and verify molecules/atoms have provenance
2. **Query compatibility**: Run existing queries that used compounds table
3. **Data integrity**: Verify no data loss during migration
4. **Edge cases**: Handle empty compounds table, partial migrations

### Rollback Procedure
If issues arise:
1. Restore from backup of compounds table
2. Re-run original ingestion pipeline
3. Fix any bugs in new code
4. Re-attempt migration after fixes

---

## Phase 5: Deployment Strategy

### Staged Rollout
1. **Phase 1**: Deploy schema changes (add columns) to all environments
2. **Phase 2**: Run data migration on staging only
3. **Phase 3**: Update ingestion code, deploy to staging
4. **Phase 4**: Validate staging with full ingestion test
5. **Phase 5**: Deploy to production with monitoring

### Monitoring Metrics
- Ingestion latency (should decrease)
- Database write volume
- Query performance for compound-related queries
- Error rates in ingestion pipeline

---

## Critical Notes

### ⚠️ Glaring Issue: Atoms Table Content Storage

The atoms table currently stores `content` column, violating the pointer-only architecture. This should be addressed separately:

1. Remove `content` from atoms table schema
2. Ensure atoms only store metadata (source_path, tags, etc.)
3. Store actual content in molecules or external storage

### ⚠️ Provenance Field Verification

Before migration, verify that:
- All compounds have non-null `provenance` values
- No compound has multiple distinct provenance values (one-to-many relationship)

---

## Success Criteria

After completion:
1. Compounds table removed from schema
2. All molecules have `provenance` and `molecular_signature` fields populated
3. Ingestion pipeline works without creating compounds
4. Existing queries function with updated schema
5. No data loss during migration

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Schema analysis | 1-2 hours | Complete |
| Schema changes | 2-4 hours | Step 1 complete |
| Code changes | 4-8 hours | Schema changes done |
| Testing | 2-4 hours | Code changes done |
| Deployment | 1-2 hours | Testing passed |

**Total**: 10-26 hours (depending on team size and parallelization)

---

## Appendix: SQL Scripts

### Migration Script (complete)

```sql
-- Phase 1: Add missing columns to molecules table
ALTER TABLE molecules 
ADD COLUMN IF NOT EXISTS provenance TEXT;

ALTER TABLE molecules 
ADD COLUMN IF NOT EXISTS molecular_signature TEXT;

-- Phase 2: Migrate compound-level data to molecules
UPDATE molecules m
SET provenance = c.provenance,
    molecular_signature = c.molecular_signature
FROM compounds c
WHERE m.compound_id = c.id;

-- Phase 3: Verify migration success
DO $$
DECLARE
    empty_provenance_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO empty_provenance_count
    FROM molecules WHERE provenance IS NULL;
    
    IF empty_provenance_count > 0 THEN
        RAISE EXCEPTION 'Migration incomplete: % molecules missing provenance', 
            empty_provenance_count;
    END IF;
END $$;

-- Phase 4: Drop compounds table
DROP TABLE IF EXISTS compounds;

-- Phase 5: Log completion
DO $ $
BEGIN
    RAISE NOTICE 'Compounds table migration completed successfully';
END;
$$;
```

### Verification Queries

```sql
-- Check for orphaned atoms (referencing dropped compounds)
SELECT a.id, a.source_path 
FROM atoms a 
LEFT JOIN molecules m ON a.compound_id = m.id
WHERE m.id IS NULL;

-- Verify provenance distribution in molecules
SELECT COUNT(*) FROM molecules WHERE provenance IS NOT NULL;

-- Check for duplicate provenance values per file
SELECT source_path, COUNT(DISTINCT provenance) as prov_count
FROM atoms
GROUP BY source_path
HAVING COUNT(DISTINCT provenance) > 1;
```