# Anchor Core - C++ High-Performance Library

High-performance C++ core library for Anchor Engine's STAR (Semantic Temporal Associative Retrieval) algorithm.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Node.js Layer                       │
│  (HTTP API, UI, Config, Orchestration)              │
└───────────────────┬─────────────────────────────────┘
                    │
                    │ N-API
                    ▼
┌─────────────────────────────────────────────────────┐
│              Anchor Core (C++17)                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ Physics Walker                              │   │
│  │ - Graph traversal with hop tracking         │   │
│  │ - Unified Field Equation                    │   │
│  │ - Temporal decay, SimHash similarity        │   │
│  └─────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────┐   │
│  │ Context Inflator                            │   │
│  │ - n-1, n+1 expansion                        │   │
│  │ - Paragraph-aware boundaries                │   │
│  └─────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────┐   │
│  │ Deduplicator (5-layer)                      │   │
│  │ - Geometric, MD5, Containment               │   │
│  │ - Fuzzy prefix, SimHash distance            │   │
│  └─────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────┐   │
│  │ Transient Filter                            │   │
│  │ - Pattern matching for noise removal        │   │
│  └─────────────────────────────────────────────┘   │
└───────────────────┬─────────────────────────────────┘
                    │
                    │ SQLite3 C API
                    ▼
┌─────────────────────────────────────────────────────┐
│                  SQLite3                             │
│  - atoms, sources, tags, molecules, edges           │
│  - FTS5 full-text search                            │
│  - WAL mode for concurrent reads                    │
└─────────────────────────────────────────────────────┘
```

## Building

### Prerequisites

- CMake 3.16+
- C++17 compiler (GCC 9+, Clang 10+, MSVC 2019+)
- SQLite3 development libraries
- Node.js 18+ (for N-API bindings)

### Build Commands

```bash
# Create build directory
cd cpp
mkdir build && cd build

# Configure
cmake .. -DCMAKE_BUILD_TYPE=Release

# Build
cmake --build . --config Release

# Build with N-API bindings
cmake .. -DBUILD_NAPI_BINDINGS=ON

# Run tests
cmake --build . --target test
```

## Components

### Physics Walker

Implements the STAR algorithm's graph traversal:

```cpp
PhysicsWalker walker(config);
auto candidates = walker.performRadialInflation(
    db,
    anchor_ids,
    150,  // limit
    0.005  // threshold
);
```

**Unified Field Equation:**
```
W(q,a) = |T(q) ∩ T(a)| · γ^(d(q,a)) × e^(-λΔt) × (1 - H(h_q,h_a)/64)
```

Where:
- `γ` = 0.85 (damping factor)
- `λ` = 0.0001 per second (temporal decay)
- `d(q,a)` = hop distance (0-3)
- `H` = Hamming distance on 64-bit SimHash

### Context Inflator

Expands atoms with surrounding context:

```cpp
ContextInflator inflator(config);
auto expanded = inflator.inflate(db, atom_ids, max_chars);
```

### Deduplicator

5-layer deduplication strategy:

1. **Geometric** - 50% overlap detection
2. **MD5 Fingerprint** - First 500 chars
3. **Containment** - Substring matching
4. **Fuzzy Prefix** - 50-100 char comparison
5. **SimHash Distance** - Hamming < 5

```cpp
Deduplicator dedup(config);
auto unique = dedup.deduplicate(candidates);
```

### Transient Filter

Filters noise patterns:

```cpp
TransientFilter filter(config);
auto filtered = filter.apply(atoms);
```

## Performance Targets

| Metric | Target | Current (Node.js) |
|--------|--------|-------------------|
| Memory Usage | <200MB RSS | 900MB RSS |
| Search Latency (p95) | <50ms | 150-200ms |
| Ingestion Throughput | 2x | Baseline |

## Testing

```bash
# Build with tests
cmake .. -DBUILD_TESTS=ON
cmake --build .

# Run tests
ctest --verbose
```

## Integration with Node.js

The N-API bindings provide seamless integration:

```javascript
const anchorCore = require('anchor-core');

const walker = new anchorCore.PhysicsWalker(config);
const results = await walker.performRadialInflation(
    db,
    anchorIds,
    limit,
    threshold
);
```

## License

AGPL-3.0 (same as Anchor Engine)
