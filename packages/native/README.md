# @anchor-engine/native

Native C++ core for Anchor Engine using Koffi FFI.

## Installation

```bash
npm install @anchor-engine/native
```

## Quick Start

```javascript
import { anchor } from '@anchor-engine/native';

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

```javascript
anchor.destroy();
```

### `search(query: string, limit?: number): Atom[]`

Search atoms with FTS5.

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

Perform graph traversal from anchor atoms.

```javascript
const candidates = anchor.radialInflation(
  [1, 2, 3],  // anchor IDs
  150,        // limit
  0.005       // gravity threshold
);
```

### `inflateContext(atomIds, maxChars?): Atom[]`

Expand atoms with surrounding context (n-1, n+1).

```javascript
const inflated = anchor.inflateContext(
  [42, 43],  // atom IDs
  65536      // max chars
);
```

### `deduplicate(candidates): Candidate[]`

Remove duplicate candidates using 5-layer strategy.

```javascript
const unique = anchor.deduplicate(candidates);
```

### `filterTransient(atoms): Atom[]`

Filter out transient/noise content.

```javascript
const clean = anchor.filterTransient(atoms);
```

## Platform Support

| Platform | Status | DLL Location |
|----------|--------|--------------|
| Windows x64 | ✅ Supported | `lib/win-x64/anchor_core.dll` |
| Linux x64 | 🔜 Coming Soon | `lib/linux-x64/libanchor_core.so` |
| macOS ARM64 | 🔜 Coming Soon | `lib/darwin-arm64/libanchor_core.dylib` |

## Building from Source

```bash
# Clone repository
git clone https://github.com/RSBalchII/anchor-engine-node.git
cd anchor-engine-node/cpp

# Build
.\build.bat          # Windows
./build.sh           # Linux/macOS

# Copy DLL to package
cp build/Release/anchor_core.dll ../packages/native/lib/win-x64/
```

## Performance

| Operation | Time | Memory |
|-----------|------|--------|
| Search (p95) | <50ms | <200MB RSS |
| Ingestion | 2x faster than Node.js | |
| Deduplication | ~20ms per 1000 candidates | |

## License

AGPL-3.0
