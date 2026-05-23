# Compounds Table Removal - Implementation Summary

## Status: Ready for Execution

This project removes the redundant `compounds` table from the database schema and migrates its unique metadata to the `atoms` and `molecules` tables.

---

## Files Created

### 1. Migration Plan (`MIGRATION_PLAN.md`)
Comprehensive implementation plan with detailed steps, SQL scripts, and testing procedures.

### 2. Migration Script (`engine/migrations/migrate_compounds_to_molecules.sql`)
Executable SQL script that:
- Adds `provenance` and `molecular_signature` columns to molecules table
- Migrates compound-level data to molecule records
- Verifies migration integrity
- Drops compounds table

### 3. Verification Queries (`engine/migrations/verify_migration.sql`)
SQL queries to verify successful migration after execution.

### 4. Ingestion Update Guide (`engine/migrations/INGESTION_UPDATE_GUIDE.md`)
Step-by-step guide for updating the ingestion pipeline code.

### 5. Provenance Utilities (`engine/src/core/provenance-utils.ts`)
TypeScript utilities for extracting and managing provenance metadata.

---

## Key Implementation Details

### Schema Changes Required

1. **Add columns to molecules table:**
   - `provenance TEXT` - source/provenance metadata (from compounds)
   - `molecular_signature TEXT` - compound-level signature (from compounds)

2. **No changes needed for atoms table** - it already has:
   - `source_path` field for file path pointers
   - `provenance` column exists and can be populated during migration

### Data Migration Logic

```sql
-- Migrate provenance from compounds to molecules
UPDATE molecules m
SET provenance = c.provenance,
    molecular_signature = c.molecular_signature
FROM compounds c
WHERE m.compound_id = c.id;
```

### Ingestion Pipeline Changes

**Remove compound creation step:**
- No longer call `createCompound()` during ingestion
- Extract provenance directly from file path
- Insert molecules/atoms with provenance field populated

---

## Execution Order

1. **Phase 1: Schema Preparation** (No action needed - columns already exist)
2. **Phase 2: Run Migration Script**
   ```bash
   psql -f engine/migrations/migrate_compounds_to_molecules.sql
   ```
3. **Phase 3: Verify Migration**
   ```bash
   psql -f engine/migrations/verify_migration.sql
   ```
4. **Phase 4: Update Ingestion Code** (see INGESTION_UPDATE_GUIDE.md)
5. **Phase 5: Deploy Updated Ingestion Service**

---

## Pre-Migration Checks

- [ ] Verify compounds table has data (if empty, migration is trivial)
- [ ] Check for any external services using compounds API
- [ ] Backup current database state (optional but recommended)

---

## Post-Migration Validation

Run these queries to confirm successful migration:

```sql
-- 1. Compounds table should be dropped
SELECT COUNT(*) FROM compounds; -- Should return 0 or error "relation does not exist"

-- 2. All molecules should have provenance
SELECT COUNT(*) FROM molecules WHERE provenance IS NULL; -- Should return 0

-- 3. All atoms should have provenance
SELECT COUNT(*) FROM atoms WHERE provenance IS NULL; -- Should return 0
```

---

## Rollback Plan

If migration fails:

1. Restore from database backup
2. Re-run original ingestion pipeline code
3. Fix any bugs in new ingestion logic
4. Re-attempt migration after fixes

---

## Success Criteria

After completion:
- ✅ Compounds table removed from schema
- ✅ All molecules have `provenance` and `molecular_signature` fields populated
- ✅ Ingestion pipeline works without creating compounds
- ✅ Existing queries function with updated schema
- ✅ No data loss during migration

---

## Next Steps

1. Review this summary document
2. Run pre-migration checks
3. Execute migration script (Phase 2)
4. Update ingestion code (Phase 4)
5. Deploy and monitor

For questions or issues, refer to the detailed documentation in:
- `MIGRATION_PLAN.md` - Full implementation plan
- `engine/migrations/INGESTION_UPDATE_GUIDE.md` - Code update guide