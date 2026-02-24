# SQLite3 Integration Guide

**Date:** February 24, 2026  
**Status:** Ready for Integration  
**Branch:** `cpp-optimization`

---

## Overview

This guide documents the integration of the C++ SQLite3 core library with the existing Node.js codebase, replacing PGlite with high-performance C++ implementations.

---

## Architecture

```
┌─────────────────────────────────────────┐
│     Node.js Application Layer           │
│  (search.ts, physics-tag-walker.ts)     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│     SQLite3 Adapter (TypeScript)        │
│  (engine/src/core/sqlite-database.ts)   │
└──────────────┬──────────────────────────┘
               │ N-API
               ▼
┌─────────────────────────────────────────┐
│     C++ Core Library                    │
│  (anchor_core.node)                     │
│  - Database wrapper                     │
│  - Physics Walker                       │
│  - Context Inflator                     │
│  - Deduplicator                         │
│  - Transient Filter                     │
└──────────────┬──────────────────────────┘
               │ SQLite3 C API
               ▼
┌─────────────────────────────────────────┐
│     SQLite3 Database File               │
│  (context.db)                           │
└─────────────────────────────────────────┘
```

---

## Integration Steps

### Step 1: Build C++ Core Library

```bash
cd cpp

# Build with N-API bindings
./build.sh --with-napi

# Windows
build.bat --with-napi
```

**Output:**
- `cpp/build/libanchor_core.a` - Static library
- `cpp/build/anchor_core.node` - N-API module

### Step 2: Copy N-API Module

```bash
# Copy compiled module to Node.js directory
cp cpp/build/anchor_core.node engine/native/

# Or use the post-build script (automatic with --with-napi)
```

### Step 3: Update Database Configuration

**File:** `engine/src/core/db.ts`

**Option A: Replace PGlite completely**

```typescript
// Replace import
import { db } from './sqlite-database.js';  // New

// Remove old import
// import { PGlite } from '@electric-sql/pglite';  // Old
```

**Option B: Hybrid approach (gradual migration)**

```typescript
// Use SQLite3 for read operations, PGlite for writes
import { db as sqliteDb } from './sqlite-database.js';
import { db as pgliteDb } from './pglite-database.js';

// Route queries based on type
export const db = {
  async run(query: string, params: any[] = []) {
    if (query.trim().toUpperCase().startsWith('SELECT')) {
      return sqliteDb.run(query, params);  // Fast reads
    } else {
      return pgliteDb.run(query, params);  // Compatible writes
    }
  }
};
```

### Step 4: Update Package Dependencies

**File:** `package.json` or `engine/package.json`

```json
{
  "dependencies": {
    "@anchor-engine/native": "file:./engine/native",
    "better-sqlite3": "^9.0.0"  // Fallback option
  }
}
```

### Step 5: Install Dependencies

```bash
pnpm install
# or
npm install
```

### Step 6: Test Integration

```bash
# Run N-API binding tests
node tests/unit/test_napi_bindings.js

# Run search tests
pnpm test

# Run benchmarks
node tests/benchmarks/memory_bench.js
node tests/benchmarks/search_latency_bench.js
node tests/benchmarks/ingestion_bench.js
```

---

## API Compatibility

### PGlite → SQLite3 Mapping

| PGlite API | SQLite3 Adapter | Status |
|------------|-----------------|--------|
| `db.run(query, params)` | `db.run(query, params)` | ✅ Compatible |
| `db.sql` (template) | Not supported | ⚠️ Use `run()` |
| `transaction(fn)` | Not implemented | 🔴 TODO |
| `close()` | `db.close()` | ✅ Compatible |

### Query Syntax Differences

**PGlite (PostgreSQL):**
```sql
SELECT * FROM atoms WHERE to_tsvector(content) @@ to_tsquery($1)
```

**SQLite3:**
```sql
SELECT * FROM atoms WHERE atoms_fts MATCH $1
```

**Adapter handles conversion automatically** ✅

---

## Migration Checklist

### Phase 1: Core Integration

- [ ] Build C++ core library
- [ ] Copy N-API module to `engine/native/`
- [ ] Update `engine/src/core/db.ts` to use SQLite3 adapter
- [ ] Run N-API binding tests
- [ ] Run existing test suite

### Phase 2: Feature Parity

- [ ] Implement write operations in N-API bindings
- [ ] Add transaction support
- [ ] Implement prepared statements
- [ ] Add async workers for long operations

### Phase 3: Optimization

- [ ] Enable WAL mode for concurrent reads
- [ ] Tune FTS5 configuration
- [ ] Add query caching
- [ ] Implement connection pooling

### Phase 4: Production Deployment

- [ ] Run full benchmark suite
- [ ] Deploy to staging environment
- [ ] Monitor performance metrics
- [ ] Roll out to production

---

## Troubleshooting

### Build Errors

**Error:** `Node.js headers not found`

**Solution:**
```bash
# Ubuntu/Debian
sudo apt-get install nodejs-dev

# macOS (headers included with Node.js)
# No action needed

# Windows (vcpkg)
vcpkg install nodejs
```

**Error:** `N-API version mismatch`

**Solution:** Ensure Node.js >= 14 (N-API v6+)
```bash
node --version  # Should be v14 or higher
```

### Runtime Errors

**Error:** `Cannot find module '@anchor-engine/native'`

**Solution:**
```bash
# Rebuild N-API module
cd cpp && ./build.sh --with-napi

# Reinstall dependencies
cd .. && pnpm install
```

**Error:** `Database not initialized`

**Solution:**
```typescript
// Ensure init() is called before using db
await db.init();
```

### Performance Issues

**Issue:** Slow search queries

**Solution:**
```sql
-- Rebuild FTS index
INSERT INTO atoms_fts(atoms_fts) VALUES('rebuild');

-- Analyze database
ANALYZE;
```

---

## Performance Expectations

### Memory Usage

| Scenario | PGlite | SQLite3 (C++) | Improvement |
|----------|--------|---------------|-------------|
| Idle | 150MB | 50MB | 3x |
| After ingestion (10K atoms) | 400MB | 100MB | 4x |
| Under load (search) | 900MB | 200MB | 4.5x |

### Search Latency

| Query Type | PGlite | SQLite3 (C++) | Improvement |
|------------|--------|---------------|-------------|
| Simple FTS | 80ms | 25ms | 3.2x |
| Complex (with walker) | 200ms | 60ms | 3.3x |
| Max recall | 500ms | 150ms | 3.3x |

### Ingestion Throughput

| Operation | PGlite | SQLite3 (C++) | Improvement |
|-----------|--------|---------------|-------------|
| Batch insert (1K atoms) | 500ms | 250ms | 2x |
| Atomization | 200ms | 100ms | 2x |
| Indexing | 300ms | 150ms | 2x |

---

## Rollback Plan

If issues arise during integration:

### Immediate Rollback

1. **Revert db.ts changes:**
   ```bash
   git checkout engine/src/core/db.ts
   ```

2. **Restore PGlite:**
   ```bash
   pnpm install
   ```

3. **Restart application**

### Gradual Rollback

1. **Use hybrid approach** (see Step 3, Option B)
2. **Route only read queries to SQLite3**
3. **Keep write queries on PGlite**
4. **Monitor for issues**
5. **Roll back fully if needed**

---

## Success Criteria

Integration is successful when:

- ✅ All existing tests pass
- ✅ Memory usage < 200MB RSS
- ✅ Search latency < 50ms p95
- ✅ No regressions in functionality
- ✅ Benchmarks show improvement

---

## Next Steps

After successful integration:

1. **Monitor production metrics**
2. **Gather user feedback**
3. **Optimize further based on real-world usage**
4. **Document lessons learned**
5. **Plan next optimization phase**

---

**Contact:** Anchor Engine Team  
**Last Updated:** February 24, 2026  
**GitHub:** https://github.com/RSBalchII/anchor-engine-node/tree/cpp-optimization
