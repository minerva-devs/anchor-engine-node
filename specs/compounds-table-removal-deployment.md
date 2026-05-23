# Compounds Table Removal - Phase 5 Deployment Plan

**Document Version:** 1.0  
**Date:** May 21, 2026  
**Status:** Ready for Review  

---

## Executive Summary

This document describes the deployment strategy for completing the **Compounds Table Removal Migration**. The migration simplifies the data model by eliminating the redundant `compounds` table and storing all provenance/metadata directly in the `molecules` and `atoms` tables.

### Current State

| Component | Status |
|-----------|--------|
| Schema Analysis (Phase 1) | ✅ Complete |
| Schema Migration (Phase 2) | ✅ Complete - columns added to molecules/atoms |
| Code Updates (Phase 3) | ✅ Complete - ingestion pipeline updated |
| Testing (Phase 4) | ⏳ Pending execution |
| Deployment (Phase 5) | 📝 Documenting now |

---

## Migration Overview

### What Changed

1. **`compounds` table removed** from database schema
2. **Provenance data migrated** from compounds → molecules & atoms tables
3. **Ingestion pipeline updated** to skip compound creation step
4. **Query patterns updated** to remove compound joins (where applicable)

### Data Flow Changes

#### Before Migration
```
File Ingested → Create Compound → Parse Content → Create Molecules/Atoms
                                                        ↓
                                              Store in molecules table
                                              Store in atoms table
```

#### After Migration
```
File Ingested → Extract Provenance → Parse Content → Create Molecules/Atoms with provenance
                                                            ↓
                                                      Store directly (no compound)
```

---

## Deployment Strategy

### Staged Rollout Plan

| Environment | Order | Prerequisites | Success Criteria |
|-------------|-------|---------------|------------------|
| **Dev** | 1st | Local development environment | Ingestion works, no errors |
| **Staging** | 2nd | Schema migration applied, updated ingestion code deployed | End-to-end ingestion test passes |
| **Production** | 3rd | Staging validated, rollback plan ready | Zero data loss, queries work |

### Phase 5 Steps

#### Step 1: Dev Environment Validation ✅ Local

1. Run existing integration tests locally
2. Verify ingestion works with new schema
3. Check that no compound-related errors occur

```bash
# Run migration verification tests
pnpm test engine/tests/integration/compounds-migration.test.ts

# Run all unit tests to ensure nothing broke
pnpm test:unit
```

#### Step 2: Staging Environment Deployment

**Timeline:** Weekend window (low traffic)

1. **Apply Schema Changes** (if not already done):
   - Add `provenance` and `molecular_signature` columns to molecules table
   - Run migration script to copy existing compound data (if any)

2. **Deploy Updated Ingestion Code**:
   - Deploy new version of `ingest-atomic.ts` and related services
   - Verify no compound creation attempts in logs

3. **Run Integration Tests**:
   - Execute full ingestion test suite
   - Validate search queries work with updated schema

4. **Monitor for 24 hours**:
   - Watch ingestion success rate
   - Check query error rates
   - Monitor database performance metrics

#### Step 3: Production Deployment

**Timeline:** Planned maintenance window (e.g., Sunday 2 AM UTC)

1. **Pre-deployment checks**:
   - Verify schema version matches deployment requirements
   - Prepare rollback scripts and backups
   - Notify stakeholders of planned downtime (if any)

2. **Execute deployment**:
   ```bash
   # Step 1: Apply database migrations
   psql -f engine/migrations/002_add_provenance_columns.sql
   
   # Step 2: Drop compounds table if it exists
   psql -f engine/migrations/drop_compounds_table.sql
   
   # Step 3: Deploy application code (via your CI/CD pipeline)
   docker-compose up -d anchor-engine
   ```

3. **Post-deployment validation**:
   - Run smoke tests (ingest a test file, query search)
   - Verify existing queries return results
   - Monitor error logs for compound-related errors

4. **Traffic routing** (if using blue/green deployment):
   - Switch traffic to new version after 5-minute observation period
   - If issues detected, roll back immediately

#### Step 4: Monitoring & Observability

**Metrics to Watch:**

| Metric | Threshold | Alert Action |
|--------|----------|--------------|
| Ingestion success rate | < 99% | Page oncall |
| Compound table query errors | Any occurrence | Log warning, investigate |
| Query latency (search) | > 2x baseline | Monitor for degradation |
| Database connection count | > 80% capacity | Consider scaling |

**Logging:**
- Enable verbose logging for ingestion service during rollout
- Tag logs with `migration:compounds_removal` for easy filtering
- Create dashboard view for migration metrics

---

## Rollback Procedure

If issues arise during or after deployment:

### Immediate Actions (if critical failure)

1. **Restore database from backup** (last known good state):
   ```bash
   pg_restore -d anchor_engine /path/to/backup.dump
   ```

2. **Revert application code**:
   - Rollback to previous commit in version control
   - Redeploy using CI/CD pipeline with `REVERT=1` flag

### Step-by-Step Rollback

**Scenario A: Schema migration fails mid-way**

1. Stop current deployment
2. Restore original schema (remove added columns if needed)
3. Re-run original ingestion code from backup branch

**Scenario B: Ingestion pipeline breaks after deploy**

1. Verify error logs for specific failure point
2. If simple bug: fix and redeploy within 1 hour
3. If fundamental issue: rollback to previous version

### Rollback Triggers

- Any data loss during migration
- Query failures affecting > 5% of requests
- Ingestion errors persisting after 1 retry
- Performance degradation (> 2x latency increase)

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during schema migration | Low | Critical | Backup before migration, verify counts match |
| Ingestion pipeline breaks | Medium | High | Keep old code in branch for quick rollback |
| Queries using compound table fail | Low (existing queries already updated) | Medium | Update query patterns proactively |
| Foreign key violations after dropping compounds | Very Low (compounds removed entirely) | Critical | Run FK check before drop, handle orphaned references |

---

## Verification Steps

### Post-Deployment Checks

1. **Verify schema changes**:
   ```sql
   -- Check molecules table has provenance column
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'molecules' AND column_name = 'provenance';
   
   -- Verify compounds table does not exist
   SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_name = 'compounds'; -- Should return 0
   ```

2. **Test ingestion**:
   - Upload a test file via API: `POST /v1/ingest`
   - Verify response includes molecule and atom counts
   - Query molecules table to confirm data persisted

3. **Test search queries**:
   - Run semantic search for known terms
   - Verify results include expected content
   - Check that no compound joins appear in query plans

4. **Validate existing functionality**:
   - Test `/v1/memory/search` endpoint
   - Test MCP tools (read, write, search)
   - Verify streaming search works

---

## Success Criteria

The migration is considered successful when:

- [ ] Compounds table no longer exists in database schema
- [ ] All molecules have `provenance` and `molecular_signature` fields populated
- [ ] All atoms have `provenance` field populated
- [ ] Ingestion pipeline successfully processes test files without compound creation
- [ ] Existing search queries return correct results
- [ ] No errors in logs related to compounds table
- [ ] Performance metrics within acceptable thresholds

---

## Documentation Links

| Document | Purpose |
|----------|---------|
| [MIGRATION_PLAN.md](../MIGRATION_PLAN.md) | Detailed implementation plan with SQL scripts |
| [MIGRATION_SUMMARY.md](../MIGRATION_SUMMARY.md) | Executive summary and quick reference |
| [INGESTION_UPDATE_GUIDE.md](engine/migrations/INGESTION_UPDATE_GUIDE.md) | Code update guide for ingestion pipeline |
| [verify_migration.sql](engine/migrations/verify_migration.sql) | SQL verification queries |

---

## Contact & Escalation

For questions or issues during deployment:

1. **First**: Check existing documentation and test suites
2. **Escalate to** (in order):
   - Project lead (via Slack/Email)
   - On-call engineer if after hours
3. **Emergency**: If data loss occurs, restore from backup immediately

---

## Appendix: Quick Reference Commands

### Schema Migration (if needed)
```bash
# Apply provenance columns to molecules table
psql -h localhost -U postgres -d anchor_engine \
  -f engine/migrations/002_add_provenance_columns.sql

# Run verification queries
psql -h localhost -U postgres -d anchor_engine \
  -f engine/migrations/verify_migration.sql
```

### Drop Compounds Table (if exists)
```bash
psql -h localhost -U postgres -d anchor_engine -c "DROP TABLE IF EXISTS compounds;"
```

### Full Migration Script
```bash
# Run the complete migration script
psql -h localhost -U postgres -d anchor_engine \
  -f engine/migrations/migrate_compounds_to_molecules.sql
```

---

*Document created: May 21, 2026*  
*Last updated by: Migration Team*