# @rbalchii/anchor-core

**High-performance C++ backend for Anchor Engine**

Version 2.0.0 now uses native C++ with SQLite3 FTS5 for **3-4x faster search** and **4.5x less memory** than pure Node.js implementations.

## Installation

```bash
npm install @rbalchii/anchor-core
```

## Quick Start

```javascript
import { anchor } from '@rbalchii/anchor-core';

// Initialize
anchor.init('./context.db');

// Search
const results = anchor.search('quantum computing', 100);
console.log(`Found ${results.length} results`);

// Get stats
const stats = anchor.getStats();
console.log(`Database: ${stats.atom_count} atoms`);

// Cleanup
anchor.destroy();
```

## API

### `init(dbPath?: string)`

Initialize the database.

```javascript
anchor.init('./context.db');  // File database
anchor.init(':memory:');       // In-memory database
```

### `destroy()`

Cleanup resources. **Always call this when done.**

### `search(query: string, limit?: number): Atom[]`

Search atoms with FTS5 full-text search.

```javascript
const results = anchor.search('quantum computing', 100);
```

### `getStats(): DatabaseStats`

Get database statistics.

```javascript
const stats = anchor.getStats();
// { atom_count: 1000, source_count: 50, tag_count: 200 }
```

### `insertAtom(...): number`

Insert a new atom.

```javascript
const id = anchor.insertAtom(
  'source-1',
  'Content here',
  0,      // char_start
  100,    // char_end
  Date.now() / 1000,
  0x1234567890ABCDEFn
);
```

### `radialInflation(anchorIds, limit?, threshold?): Candidate[]`

Perform physics-based graph traversal from anchor atoms.

```javascript
const candidates = anchor.radialInflation(
  [1, 2, 3],  // anchor IDs
  150,        // limit
  0.005       // gravity threshold
);
```

### `inflateContext(atomIds, maxChars?): Atom[]`

Expand atoms with surrounding context (n-1, n+1 expansion).

```javascript
const inflated = anchor.inflateContext(
  [42, 43],  // atom IDs
  65536      // max chars
);
```

### `deduplicate(candidates): Candidate[]`

Remove duplicate candidates using 5-layer deduplication strategy.

```javascript
const unique = anchor.deduplicate(candidates);
```

### `filterTransient(atoms): Atom[]`

Filter out transient/noise content.

```javascript
const clean = anchor.filterTransient(atoms);
```

## Performance

| Metric | Node.js (PGlite) | C++ (SQLite3) | Improvement |
|--------|------------------|---------------|-------------|
| Search (p95) | 150-200ms | **<50ms** | 3-4x faster |
| Memory | 900MB RSS | **<200MB RSS** | 4.5x less |
| Ingestion | 1x | **2x** | 2x faster |

## Platform Support

| Platform | Status | Library |
|----------|--------|---------|
| Windows x64 | ✅ Supported | `anchor_core.dll` |
| Linux x64 | 🔜 Coming Soon | `libanchor_core.so` |
| macOS ARM64 | 🔜 Coming Soon | `libanchor_core.dylib` |

## Building from Source

```bash
# Clone repository
git clone https://github.com/RSBalchII/anchor-engine-node.git
cd anchor-engine-node/cpp

# Build
.\build.bat          # Windows
./build.sh           # Linux/macOS

# Copy DLL to package
cp build/Release/anchor_core.dll ../packages/anchor-core/lib/win-x64/
```

## License

MIT
