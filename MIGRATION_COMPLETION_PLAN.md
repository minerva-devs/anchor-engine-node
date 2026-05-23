# Database Migration Completion Plan
## Compounds Table Removal - Final Phase

**Date:** 2026-05-21  
**Status:** Schema changes complete, data migration pending  
**Priority:** P0 (Critical for v5.1.0)

---

## Executive Summary

The Anchor Engine is currently in **Phase 2 of 5** for the compounds table removal. The schema has been updated with `provenance` and `molecular_signature` columns added to `atoms` and `molecules` tables. This plan completes the migration by:

1. Executing data migration from compounds → molecules/atoms
2. Updating ingestion pipeline code
3. Running comprehensive tests
4. Dropping the deprecated compounds table

---

## Current State Assessment

### ✅ Completed (Schema Changes)
- [x] `provenance` column added to `molecules` table
- [x] `molecular_signature` column added to `molecules` table  
- [x] `source_path` and `provenance` columns added to `atoms` table
- [x] Schema migration SQL file created (`engine/src/core/schema-migration.sql`)

### ⏳ Pending (Data Migration)
- [ ] Execute migration script to copy compound data
- [ ] Verify data integrity after migration
- [ ] Drop compounds table

### ⏸️ Blocked (Code Updates)
- [ ] Ingestion pipeline needs update to skip compound creation
- [ ] Radial distiller needs to query molecules/atoms directly
- [ ] Search service queries need rewriting

---

## Phase 1: Data Migration Execution

### Step 1.1: Pre-Migration Verification

**Goal:** Verify current state before data migration.

```bash
# Check compounds table contents
psql -d anchor -c "SELECT COUNT(*) as compound_count FROM compounds;"

# Check molecules table current state
psql -d anchor -c "SELECT COUNT(*) as molecule_count, COALESCE(COUNT(provenance),0) as with_provenance FROM molecules;"

# Check atoms table current state  
psql -d anchor -c "SELECT COUNT(*) as atom_count, COALESCE(COUNT(provenance),0) as with_provenance FROM atoms;"
```

**Expected Results:**
- `compound_count`: Number of compounds to migrate (likely 0 if fresh install, or N if existing data)
- Molecules/atoms provenance counts: Current state before migration

### Step 1.2: Execute Migration Script

**Migration SQL File:** `engine/migrations/migrate_compounds_to_molecules.sql`

```sql
-- ============================================================================
-- Compounds Table Data Migration
-- ============================================================================
-- This script migrates data from the deprecated compounds table to 
-- molecules and atoms tables, then drops the compounds table.
-- ============================================================================

BEGIN TRANSACTION;

-- Step 1: Copy compound-level provenance to all related molecules
UPDATE molecules m
SET provenance = c.provenance,
    molecular_signature = c.molecular_signature
FROM compounds c
WHERE m.compound_id = c.id AND c.provenance IS NOT NULL;

-- Step 2: Update atoms with provenance from their parent compounds
UPDATE atoms a
SET provenance = c.provenance
FROM compounds c
WHERE a.compound_id = c.id AND c.provenance IS NOT NULL;

-- Step 3: Verify migration completeness
DO $$
DECLARE
    molecules_missing_provenance INTEGER;
    atoms_missing_provenance INTEGER;
BEGIN
    SELECT COUNT(*) INTO molecules_missing_provenance
    FROM molecules WHERE provenance IS NULL;
    
    SELECT COUNT(*) INTO atoms_missing_provenance
    FROM atoms WHERE provenance IS NULL;
    
    RAISE NOTICE 'Molecules without provenance: %', molecules_missing_provenance;
    RAISE NOTICE 'Atoms without provenance: %', atoms_missing_provenance;
END $$;

-- Step 4: Drop compounds table (only if empty or after data extraction)
DROP TABLE IF EXISTS compounds;

COMMIT;
```

**Execution Command:**
```bash
psql -d anchor -f engine/migrations/migrate_compounds_to_molecules.sql
```

### Step 1.3: Post-Migration Verification

**Verification Queries:**

```sql
-- Verify compounds table is dropped
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'compounds'
) as compounds_exists;
-- Expected: false

-- Verify molecules have provenance
SELECT COUNT(*) as total_molecules, 
       COUNT(provenance) as with_provenance
FROM molecules;
-- Expected: total_molecules >= with_provenance

-- Verify atoms have provenance
SELECT COUNT(*) as total_atoms,
       COUNT(provenance) as with_provenance  
FROM atoms;
-- Expected: total_atoms >= with_provenance

-- Check for orphaned atom references (should be none)
SELECT a.id, a.source_path
FROM atoms a
LEFT JOIN molecules m ON a.compound_id = m.id
WHERE m.id IS NULL AND a.compound_id IS NOT NULL;
-- Expected: empty result set

-- Verify data integrity - sample check
SELECT source_path, COUNT(*) as atom_count
FROM atoms
GROUP BY source_path
ORDER BY atom_count DESC
LIMIT 10;
```

---

## Phase 2: Code Updates

### Step 2.1: Update Ingestion Pipeline

**Files to Modify:**
- `engine/src/services/ingest/ingest-atomic.ts`
- `engine/src/routes/v1/ingest-updated.ts`

**Changes Required:**

1. **Remove compound creation step** from ingestion flow:
   ```typescript
   // OLD CODE (remove):
   const compound = await db.create('compounds', {
     path: filePath,
     provenance,
     timestamp: Date.now()
   });
   
   // NEW CODE: Skip compound creation entirely
   // Molecules and atoms are created directly with provenance
   ```

2. **Update molecule/atom creation** to include provenance:
   ```typescript
   const molecules = content.split(sentences).map((sentence, idx) => ({
     content: sentence.trim(),
     source_path: filePath,
     start_byte: bytePositions[idx],
     end_byte: bytePositions[idx + 1],
     provenance, // NEW: Include provenance
     molecular_signature: generateSimHash(sentence),
     timestamp: Date.now()
   }));
   
   const atoms = extractAtoms(sentence, ...).map(atom => ({
     ...atom,
     source_path: filePath,
     provenance, // NEW: Include provenance
     timestamp: Date.now()
   }));
   ```

3. **Remove compound ID generation** from ingestion logic.

### Step 2.2: Update Radial Distiller Service

**Files to Modify:**
- `engine/src/services/distillation/radial-distiller.ts`
- `engine/src/services/distillation/radial-distiller-v2.ts`

**Changes Required:**

1. **Update query patterns** to use molecules/atoms directly instead of compounds:
   ```typescript
   // OLD (compound-based):
   const compounds = await db.query(
     'SELECT * FROM compounds WHERE path = $1',
     [filePath]
   );
   
   // NEW (molecule-based):
   const molecules = await db.query(
     'SELECT * FROM molecules WHERE source_path = $1',
     [filePath]
   );
   ```

2. **Update radial expansion queries** to use molecule IDs instead of compound IDs.

### Step 2.3: Update Search Service Queries

**Files to Modify:**
- `engine/src/services/search/search.ts`
- `engine/src/services/search/context-inflator.ts`

**Changes Required:**

1. **Remove compound joins** from search queries:
   ```sql
   -- OLD (joins compounds):
   SELECT a.* 
   FROM atoms a
   JOIN compounds c ON a.compound_id = c.id
   WHERE c.path LIKE '%';
   
   -- NEW (direct source_path filter):
   SELECT a.* 
   FROM atoms a
   WHERE a.source_path LIKE '%';
   ```

2. **Update context inflation** to use molecule byte offsets directly.

---

## Phase 3: Testing Strategy

### Test Environment Setup

```bash
# Create test database with fresh schema
psql -c "CREATE DATABASE anchor_test;"

# Copy migration scripts to test environment
cp engine/migrations/*.sql engine/src/core/*.sql ../anchor_test/
```

### Test Cases

#### P0 Critical Tests (Must Pass Before Deployment)

| # | Test Name | Description | Status |
|---|-----------|-------------|--------|
| 1 | **Ingestion Basic** | Ingest a small file and verify provenance is set | ⏳ Pending |
| 2 | **Search After Migration** | Run search query against migrated data | ⏳ Pending |
| 3 | **Radial Distiller Query** | Test radial distillation with new schema | ⏳ Pending |
| 4 | **Data Integrity Check** | Verify no orphaned references after migration | ⏳ Pending |

#### P1 Integration Tests

| # | Test Name | Description | Status |
|---|-----------|-------------|--------|
| 5 | **Full Ingestion Pipeline** | End-to-end ingestion with provenance tracking | ⏳ Pending |
| 6 | **Search with Tag Filtering** | Search using tags after migration | ⏳ Pending |
| 7 | **Context Inflation** | Test radial context expansion | ⏳ Pending |

#### P2 Edge Case Tests

| # | Test Name | Description | Status |
|---|-----------|-------------|--------|
| 8 | **Empty Compounds Table** | Migration with no compounds data | ✅ N/A (fresh install) |
| 9 | **Partial Migration** | Verify partial data migration works | ⏳ Pending |
| 10 | **Provenance Null Handling** | Handle records without provenance | ⏳ Pending |

### Test Execution Commands

```bash
# Run ingestion test
pnpm test -- engine/tests/integration/ingestion-migration.test.ts

# Run search test  
pnpm test -- engine/tests/integration/search-migration.test.ts

# Run radial distiller test
pnpm test -- engine/tests/integration/radial-distiller.test.ts

# Run full integration suite
pnpm test:integration
```

### Test Data Setup

Create a test file for ingestion testing:

```typescript
// engine/tests/integration/ingestion-migration.test.ts
import { describe, it, expect } from 'vitest';
import { createServer } from '../../../src/server';

describe('Ingestion Migration Tests', () => {
  let server: any;
  
  beforeAll(async () => {
    server = await createServer({ database: 'anchor_test' });
  });
  
  afterAll(() => {
    server.close();
  });
  
  it('should ingest file with provenance', async () => {
    const response = await server.post('/v1/ingest/streaming', new FormData([
      ['file', 'test.txt'],
      ['provenance', 'internal']
    ]));
    
    expect(response.status).toBe(200);
    // Verify molecules were created with provenance
  });
  
  it('should skip compound creation during ingestion', async () => {
    const response = await server.post('/v1/ingest/streaming', ...);
    // Verify compounds table is not used
  });
});
```

---

## Phase 4: Deployment Strategy

### Staged Rollout Plan

| Phase | Action | Environment | Duration |
|-------|--------|-------------|----------|
| 1 | Deploy schema changes (columns added) | Production | 5 min |
| 2 | Run data migration script | Staging → Production | 10 min |
| 3 | Update ingestion code | Staging first | 15 min |
| 4 | Validate staging with full ingestion test | Staging | 30 min |
| 5 | Deploy updated code to production | Production | 5 min |
| 6 | Monitor for errors and data integrity | Both environments | Ongoing |

### Monitoring Metrics

**Database:**
- Ingestion latency (should decrease after compound removal)
- Database write volume per ingestion
- Query performance for search operations
- Error rates in ingestion pipeline

**Application:**
- Number of molecules/atoms created per ingestion
- Provenance field population rate (target: 100%)
- Search result accuracy

### Rollback Procedure

If issues arise during or after migration:

```bash
# 1. Restore compounds table from backup
psql -d anchor -f scripts/rollback_compounds_drop.sql

# 2. Re-run original ingestion pipeline if needed
node scripts/reingest.js <backup-path>

# 3. Fix bugs in new code
# 4. Re-attempt migration after fixes
```

---

## Phase 5: Post-Migration Validation

### Checklist

- [ ] Compounds table removed from database
- [ ] All molecules have `provenance` populated (100%)
- [ ] All atoms have `provenance` populated (100%)
- [ ] Ingestion pipeline works without compound creation
- [ ] Search queries return correct results
- [ ] Radial distiller functions with new schema
- [ ] No orphaned references in database
- [ ] Performance metrics within acceptable range

### Validation Queries

```sql
-- Final validation: compounds table should not exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'compounds';
-- Expected: empty result

-- Verify provenance distribution
SELECT 
  provenance, 
  COUNT(*) as count
FROM molecules
GROUP BY provenance
ORDER BY count DESC;

-- Check for any remaining compound_id references
SELECT 
  'atoms' as table_name, 
  COUNT(*) as orphan_count
FROM atoms a
LEFT JOIN molecules m ON a.compound_id = m.id
WHERE m.id IS NULL AND a.compound_id IS NOT NULL
UNION ALL
SELECT 
  'molecules' as table_name, 
  COUNT(*)
FROM molecules m
LEFT JOIN compounds c ON m.compound_id = c.id
WHERE c.id IS NULL AND m.compound_id IS NOT NULL;
-- Expected: both should show 0 or near-zero (allowing for edge cases)
```

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| **Phase 1:** Data Migration | 15-30 min | Schema changes complete ✅ |
| **Phase 2:** Code Updates | 4-8 hours | Ingestion, distiller, search services |
| **Phase 3:** Testing | 2-4 hours | Code updates complete |
| **Phase 4:** Deployment | 15-30 min | Tests pass |
| **Phase 5:** Validation | Ongoing | Post-deployment monitoring |

**Total Estimated Time:** 6-12 hours (excluding review/approval time)

---

## Success Criteria

After completion, the following must be true:

1. ✅ Compounds table removed from schema
2. ✅ All molecules have `provenance` and `molecular_signature` fields populated
3. ✅ All atoms have `source_path` and `provenance` fields populated  
4. ✅ Ingestion pipeline works without creating compounds
5. ✅ Existing search queries function with updated schema
6. ✅ No data loss during migration
7. ✅ Performance metrics meet or exceed baseline

---

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data loss during migration | Low | High | Backup compounds table before migration |
| Ingestion pipeline breaks | Medium | Medium | Test with staging database first |
| Search queries fail | Low | High | Update all compound references before deployment |
| Performance degradation | Low | Medium | Monitor latency metrics post-deployment |

---

## Appendix: Useful Commands

### Database Operations

```bash
# Check current schema state
psql -d anchor -c "\d compounds"
psql -d anchor -c "SELECT * FROM compounds LIMIT 5;"

# Run migration script
psql -d anchor -f engine/migrations/migrate_compounds_to_molecules.sql

# Verify migration
psql -d anchor -c "SELECT COUNT(*) FROM molecules WHERE provenance IS NOT NULL;"
```

### Code Operations

```bash
# Find all compound references in codebase
grep -r "compounds" engine/src/ --include="*.ts" | grep -v ".test.ts"

# Find SQL queries using compounds table
grep -r "FROM compounds\|JOIN compounds" engine/src/ --include="*.ts"
```

---

*Document created: 2026-05-21*  
*Next review: After Phase 1 completion*