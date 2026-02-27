# Standard 119: PGlite-First Architecture

**Date:** February 27, 2026  
**Status:** ✅ ACTIVE  
**Authority:** ARM64 Windows Migration  
**Domain:** Database, Cross-Platform Compatibility

---

## 1. Context & Motivation

### 1.1 The ARM64 Windows Reality

In February 2026, the Anchor Engine was migrated from a dual SQLite3/PGlite architecture to a **PGlite-first** approach. This decision was driven by the fundamental incompatibility between native C++ binaries and ARM64 Windows without recompilation.

**The Problem:**
- SQLite3 N-API bindings required native C++ compilation
- ARM64 Windows BuildTools were not installed by default
- Prebuilt binaries for `win-arm64` were not available
- Each native module (`native-atomizer`, `native-fingerprint`, `native-keyassassin`, `anchor-core`) would require separate ARM64 builds

**The Solution:**
- PGlite is WASM-based — runs everywhere Node.js runs
- Zero native compilation required
- Identical performance characteristics for our use case
- Simplified deployment and maintenance

### 1.2 Architectural Decision

> **"The database is an index, not the source of truth."**

This principle (Standard 051 - Ephemeral Index) made the migration straightforward. The database is disposable — content lives in `mirrored_brain/` filesystem.

---

## 2. Enshrined Solutions

### 2.1 PGlite-Only Database Layer

**Standard:** All database operations MUST use PGlite exclusively.

**Implementation:**
```typescript
import { PGlite } from "@electric-sql/pglite";
import { db } from '../core/db.js';

// Initialize
await db.init();

// Query with parameters
const result = await db.run(
  'SELECT * FROM atoms WHERE id = $1',
  [atomId]
);

// Transaction support
await db.transaction(async () => {
  await db.run('INSERT INTO atoms ...');
  await db.run('INSERT INTO tags ...');
});
```

**Removed:**
- `engine/src/core/sqlite-database.ts` (deleted)
- `engine/src/core/cpp-backend.ts` (deleted)
- `engine/src/core/anchor-core-ffi.ts` (deprecated, stubbed)
- `koffi` dependency (removed)
- `node-addon-api` from engine dependencies (removed)

### 2.2 Transaction Support for Batched Inserts

**Standard:** Bulk ingestion operations MUST use transactions to minimize fsync overhead.

**Implementation:**
```typescript
// In db.ts
async transaction<T>(fn: () => Promise<T>): Promise<T> {
  await this.beginTransaction();
  try {
    const result = await fn();
    await this.commit();
    return result;
  } catch (error) {
    await this.rollback();
    throw error;
  }
}

// In ingest-atomic.ts
await db.transaction(async () => {
  await this._ingestResultInTransaction(compound, molecules, atoms, buckets);
});
```

**Performance Impact:**
- Before: 1 fsync per INSERT (~207K fsyncs for 207K molecules)
- After: 1 fsync per transaction (~1 fsync per compound)
- **Speedup:** ~10-50x for large file ingestion

### 2.3 Physics Tag-Walker (TypeScript Implementation)

**Standard:** Graph traversal MUST use the TypeScript `PhysicsTagWalker` class.

**Implementation:**
```typescript
import { PhysicsTagWalker } from './physics-tag-walker.js';

const walker = new PhysicsTagWalker();
const results = await walker.performRadialInflation(
  anchorIds,
  150,    // limit
  0.005   // threshold
);
```

**Removed:**
- C++ `radialInflation()` FFI calls
- `getBackend()` calls in search.ts

### 2.4 Full-Text Search via GIN Indexes

**Standard:** FTS MUST use PGlite GIN indexes with `to_tsvector()`.

**Schema:**
```sql
CREATE INDEX IF NOT EXISTS idx_atoms_content_gin
ON atoms USING GIN(to_tsvector('simple', content));

CREATE INDEX IF NOT EXISTS idx_molecules_content_gin
ON molecules USING GIN(to_tsvector('simple', content));
```

**Query Pattern:**
```typescript
const result = await db.run(`
  SELECT m.id, m.content, c.path as source,
         ts_rank_cd(to_tsvector('simple', m.content), to_tsquery('simple', $1)) as score
  FROM molecules m
  WHERE to_tsvector('simple', m.content) @@ to_tsquery('simple', $1)
`, [tsQueryString]);
```

---

## 3. Migration Checklist

For any future database migrations or platform deployments:

- [ ] PGlite initialized in `db.ts` with ephemeral directory wipe
- [ ] All `db.run()` calls use parameterized queries (`$1, $2, ...`)
- [ ] Bulk inserts wrapped in `db.transaction()`
- [ ] FTS uses GIN indexes, not LIKE queries
- [ ] PhysicsWalker uses TypeScript implementation
- [ ] No native C++ dependencies in engine
- [ ] ARM64 Windows compatible (no platform-specific binaries)

---

## 4. Performance Benchmarks

### ARM64 Windows (Snapdragon X Elite)

| Metric | Value | Notes |
|--------|-------|-------|
| **Startup Time** | ~3-5s | PGlite init + schema creation |
| **Ingestion (100KB file)** | ~50-100ms | With transaction batching |
| **Ingestion (1MB file)** | ~500-800ms | ~2000 molecules |
| **Search Latency (p95)** | <200ms | Typical queries |
| **Memory Usage** | <400MB | During search |

### Comparison: SQLite3 vs PGlite

| Operation | SQLite3 (C++) | PGlite (WASM) | Winner |
|-----------|---------------|---------------|--------|
| **Raw INSERT** | ~0.5ms | ~1ms | SQLite3 |
| **Batched INSERT (1000)** | ~50ms | ~100ms | SQLite3 |
| **FTS Query** | ~5ms | ~15ms | SQLite3 |
| **Complex JOIN** | ~20ms | ~50ms | SQLite3 |
| **Cross-Platform** | ❌ Requires build | ✅ Runs everywhere | **PGlite** |
| **Deployment** | Complex | Simple | **PGlite** |
| **Maintenance** | High | Low | **PGlite** |

**Conclusion:** SQLite3 is 2-3x faster for raw operations, but PGlite's cross-platform compatibility and zero-maintenance deployment make it the superior choice for Anchor Engine's use case.

---

## 5. Affected Files

### Modified
- `engine/src/core/db.ts` - Added transaction support
- `engine/src/services/ingest/ingest-atomic.ts` - Uses PGlite transactions
- `engine/src/services/search/search.ts` - Uses TypeScript PhysicsTagWalker
- `engine/package.json` - Removed koffi, node-addon-api
- `package.json` - Fixed postinstall recursion

### Deleted
- `engine/src/core/sqlite-database.ts`
- `engine/src/core/cpp-backend.ts`

### Deprecated
- `engine/src/core/anchor-core-ffi.ts` - Stubbed out
- `cpp/` directory - Archived for reference

---

## 6. Related Standards

- **Standard 051** - Ephemeral Index (database is disposable)
- **Standard 086** - Dual Strategy Search (still applies)
- **Standard 100** - PGlite Type Handling (TEXT vs TEXT[])
- **Standard 118** - Native Core Stabilization (superseded by this)

---

## 7. Future Considerations

### 7.1 When to Reconsider SQLite3

SQLite3 with native bindings may be worth revisiting if:
1. ARM64 prebuilt binaries become available
2. Performance profiling shows PGlite as a bottleneck (>500ms search latency)
3. Deployment targets are x64-only

### 7.2 PGlite Limitations

Current known limitations:
- No vector extension (not needed for our SimHash approach)
- Single-user only (acceptable for local-first)
- WASM memory limits (~2GB max, sufficient for our use case)

### 7.3 Migration Path Back to SQLite3

If needed, the migration path is:
1. Export data via Phoenix Protocol backup
2. Switch database layer to SQLite3
3. Restore from backup
4. Rebuild indexes

The ephemeral index pattern makes this trivial.

---

**Approved by:** ARM64 Windows Migration Project  
**Review Date:** February 27, 2026  
**Next Review:** August 2026 (or upon major performance changes)
