# PGlite Quick Reference

> **PGlite** = PostgreSQL in WebAssembly — embedded, zero-config, ephemeral

## Core Concepts

| Concept | Description |
|---------|-------------|
| **What** | PostgreSQL compiled to WASM — runs in-process |
| **Why** | No external DB server needed — file-based like SQLite |
| **Size** | ~15-20 MB WASM bundle |
| **Speed** | ~5-15ms per query (FTS ~15-20ms) |
| **Path** | `@electric-sql/pglite` |

## Database Setup (aen pattern)

```typescript
import { PGlite } from '@electric-sql/pglite';

// Ephemeral — wipe & recreate on every startup
const dbPath = '/path/to/context_data';
const db = new PGlite(dbPath);

// Initialize schema
await db.exec(`
  CREATE TABLE IF NOT EXISTS atoms (
    id SERIAL PRIMARY KEY,
    content TEXT,
    file_path TEXT,
    start_line INT,
    end_line INT,
    molecular_signature BIGINT,  -- SimHash
    created_at TIMESTAMP DEFAULT NOW()
  );
  
  CREATE INDEX IF NOT EXISTS idx_atoms_file ON atoms(file_path);
  CREATE INDEX IF NOT EXISTS idx_atoms_simhash ON atoms USING btree(molecular_signature);
`);
```

## Key Operations

### Basic Queries
```typescript
// SELECT
const result = await db.query('SELECT * FROM atoms WHERE file_path = $1', ['/path/to/file.ts']);
const rows = result.rows;

// INSERT
await db.query('INSERT INTO atoms (content, file_path) VALUES ($1, $2)', ['code here', '/file.ts']);

// UPDATE
await db.query('UPDATE atoms SET content = $1 WHERE id = $2', ['new content', 123]);

// DELETE
await db.query('DELETE FROM atoms WHERE file_path = $1', ['/old/file.ts']);
```

### Transactions
```typescript
await db.transaction(async (tx) => {
  await tx.query('INSERT INTO atoms ...', [vals]);
  await tx.query('UPDATE atoms ...', [vals]);
  // Auto-commits on success, auto-rollbacks on error
});
```

### Full-Text Search
```typescript
// PostgreSQL FTS (not FTS5 like SQLite)
await db.exec(`
  ALTER TABLE atoms ADD COLUMN search_vector tsvector 
    GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
  CREATE INDEX idx_atoms_search ON atoms USING GIN(search_vector);
`);

// Query
const results = await db.query(
  `SELECT * FROM atoms WHERE search_vector @@ to_tsquery('english', $1) ORDER BY ts_rank(search_vector, to_tsquery('english', $1)) DESC`,
  ['postgres & search']
);
```

### SimHash Deduplication
```typescript
// SimHash stored as BIGINT (64-bit fingerprint)
// Hamming distance < 5 = near-duplicate
await db.query(
  `SELECT * FROM atoms 
   WHERE bit_count(molecular_signature # $1::bigint) < 5`,
  [newSimHash]  // XOR + bit count = Hamming distance
);
```

## Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| Simple query | 5-10ms | In-process, no network |
| FTS search | 15-20ms | GIN index required |
| Bulk insert | 50-100ms/1K rows | Use transactions |
| Startup | 3-5s | WASM initialization |

## vs SQLite

| Feature | PGlite | SQLite |
|---------|--------|--------|
| **Size** | ~20MB | ~1MB |
| **SQL Dialect** | PostgreSQL | SQLite |
| **Concurrency** | Better (MVCC) | Limited |
| **FTS** | `tsvector`/`tsquery` | FTS5 |
| **JSON** | `jsonb` operators | `json_extract` |
| **Speed** | 5-15ms | 2-5ms |

## Common Gotchas

1. **No SAVEPOINTs** in wrapper — use raw SQL: `await db.run('SAVEPOINT sp1')`
2. **FTS uses `to_tsquery`** not `MATCH` (SQLite)
3. **Parameter syntax**: `$1, $2` (not `?` like SQLite)
4. **WASM startup**: 3-5s on first load
5. **Ephemeral pattern**: Wipe on startup to prevent corruption

## Ephemeral Pattern (aen)

```typescript
// Standard 051: Ephemeral Index
const shouldWipe = config.DATABASE?.WIPE_ON_STARTUP !== false;
if (shouldWipe) {
  fs.rmSync(dbPath, { recursive: true, force: true });
  fs.mkdirSync(dbPath, { recursive: true });
}
const db = new PGlite(dbPath);
// Database is disposable — filesystem is source of truth
```
