# Database Query Batching

## Overview

Optimized database access patterns by batching individual queries into bulk operations, reducing round-trips and improving throughput.

**Location:** `engine/src/utils/db-batch.ts`

## Problem

The original code made individual database queries for each compound lookup during context inflation:

```typescript
// O(N) queries - One per compound
for (const result of results) {
  const compound = await db.run(
    'SELECT path, provenance FROM compounds WHERE id = $1',
    [result.compound_id]
  );
}
```

**Performance Impact:**
- 100 results → 100 database round-trips
- 1,000 results → 1,000 database round-trips
- Each round-trip: ~1-5ms latency

## Solution: Batch Query Pattern

### Implementation

Created `db-batch.ts` with reusable batch operations:

```typescript
// O(1) query - Single batch fetch
const compoundIds = results.map(r => r.compound_id);
const compounds = await batchFetchCompounds(compoundIds);

// Returns Map<compound_id, compound_data>
for (const result of results) {
  const compound = compounds.get(result.compound_id);
}
```

### Batch Operations

| Function | Description | Optimization |
|----------|-------------|--------------|
| `batchFetchCompounds` | Fetch multiple compounds by ID | `WHERE id = ANY(?)` |
| `batchFetchAtoms` | Fetch atoms by compound IDs | `WHERE compound_id = ANY(?)` |
| `batchInsertAtoms` | Bulk insert atoms | Multi-value INSERT |
| `batchInsertTags` | Bulk insert tags | Multi-value INSERT |
| `batchUpdate` | Batch updates in transaction | Transactional batch |
| `batchDelete` | Bulk delete by IDs | `WHERE id = ANY(?)` |

## Integration: ContextInflator

### Before (Individual Queries)

```typescript
// In inflateFromDisk()
const result = await db.run(
  'SELECT path, provenance FROM compounds WHERE id = $1',
  [res.compound_id]
);
// Called N times for N results
```

### After (Batch + Cache)

```typescript
// In inflate() - Pre-fetch all compounds
const compoundIds = Array.from(new Set(results.map(r => r.compound_id)));
const compoundCache = await batchFetchCompounds(compoundIds);

// In inflateFromDisk() - Use cache
if (compoundCache.has(res.compound_id)) {
  const compound = compoundCache.get(res.compound_id)!;
  // Use cached data, no query needed
}
```

## Performance Gains

### Query Reduction

| Scenario | Before | After | Reduction |
|----------|--------|-------|-----------|
| 10 results | 10 queries | 1 query | **90%** |
| 100 results | 100 queries | 1 query | **99%** |
| 1,000 results | 1,000 queries | 1 query | **99.9%** |

### Latency Improvement

Assuming 2ms per query round-trip:

| Results | Before | After | Speedup |
|---------|--------|-------|---------|
| 10 | 20ms | 2ms | **10x** |
| 100 | 200ms | 2ms | **100x** |
| 1,000 | 2,000ms | 5ms* | **400x** |

*Includes larger result set processing time

## PGlite ANY() Operator

The batch operations use PGlite's `ANY()` operator for array comparisons:

```sql
-- Efficient array membership test
SELECT * FROM compounds WHERE id = ANY($1)

-- $1 is an array: ['id1', 'id2', 'id3', ...]
```

**Benefits:**
- Single query plan compilation
- Efficient index usage
- Reduced network overhead
- Better query cache utilization

## Batch Size Optimization

### Multi-Value INSERT

For INSERT operations, batch in chunks to avoid query size limits:

```typescript
const BATCH_SIZE = 100; // atoms
const BATCH_SIZE = 200; // tags

for (let i = 0; i < items.length; i += BATCH_SIZE) {
  const batch = items.slice(i, i + BATCH_SIZE);
  await db.run(`INSERT INTO table ... VALUES ${batch.map(...).join(', ')}`);
}
```

### Optimal Batch Size Calculator

```typescript
function calculateOptimalBatchSize(
  itemSize: number = 1024,
  maxBatchBytes: number = 1024 * 1024
): number {
  return Math.max(1, Math.floor(maxBatchBytes / itemSize));
}
```

## Memory Considerations

### Trade-offs

| Aspect | Individual | Batch |
|--------|------------|-------|
| Memory per query | Low | Higher |
| Total memory | N × low | 1 × high |
| Peak memory | Lower | Higher |
| Throughput | Low | High |

### Best Practices

1. **Batch SELECT**: Always batch when fetching > 10 records
2. **Batch INSERT**: Use chunks of 100-200 for bulk inserts
3. **Cache Results**: Store batch results in Map for O(1) lookup
4. **Fallback Gracefully**: Fall back to individual queries if batch fails

## Usage Examples

### Batch Fetch

```typescript
import { batchFetchCompounds } from './utils/db-batch.js';

// Fetch 50 compounds in one query
const compounds = await batchFetchCompounds(['id1', 'id2', ..., 'id50']);

// Access by ID (O(1))
const compound = compounds.get('id1');
```

### Batch Insert

```typescript
import { batchInsertAtoms } from './utils/db-batch.js';

const atoms = [
  { id: 'a1', content: '...', compound_id: 'c1', byte_offset: 0 },
  { id: 'a2', content: '...', compound_id: 'c1', byte_offset: 100 },
  // ... more atoms
];

const inserted = await batchInsertAtoms(atoms);
console.log(`Inserted ${inserted} atoms`);
```

### Batch Delete

```typescript
import { batchDelete } from './utils/db-batch.js';

const deleted = await batchDelete('atoms', ['id1', 'id2', 'id3']);
console.log(`Deleted ${deleted} atoms`);
```

## Testing

### Unit Tests

(To be added in benchmark suite)

```bash
npm run test:vitest -- tests/unit/db-batch.vitest.ts
```

### Performance Testing

```bash
npm run benchmark -- db-batch-comparison
```

## Future Enhancements

- [ ] **Prepared Statements**: Cache query plans for repeated batches
- [ ] **Streaming Results**: Stream large batch results to reduce memory
- [ ] **Parallel Batches**: Run independent batches in parallel
- [ ] **Query Plan Analysis**: Monitor and optimize batch query plans
- [ ] **Adaptive Batching**: Adjust batch size based on response time

## Standards Compliance

- **Standard 062**: Memory Management
- **Standard 132**: Adaptive Concurrency

## See Also

- `src/utils/db-batch.ts`: Batch utility functions
- `src/services/search/context-inflator.ts`: Integration example
- `@electric-sql/pglite`: PGlite documentation

## Changelog

### Sprint 4 (March 25, 2026)

- ✅ Created `db-batch.ts` with batch operations
- ✅ Integrated with ContextInflator
- ✅ Reduced compound lookups from O(N) to O(1)
- ✅ Added batch insert/delete operations
- ✅ Added comprehensive documentation
