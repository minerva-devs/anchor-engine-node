# C++ Optimization Project

**Branch:** `cpp-optimization`  
**Status:** In Progress (50% Complete - 4/8 Phases)  
**Started:** February 24, 2026

---

## Overview

High-performance C++ core library for Anchor Engine's STAR algorithm, targeting:
- **Memory:** <200MB RSS (vs 900MB current)
- **Search Latency:** <50ms p95 (vs 150-200ms current)
- **Ingestion:** 2x throughput

---

## Architecture

```
┌─────────────────────────────────────────┐
│          Node.js Layer                  │
│  (HTTP, UI, Config, Orchestration)      │
└──────────────┬──────────────────────────┘
               │ N-API
               ▼
┌─────────────────────────────────────────┐
│       Anchor Core (C++17)               │
│  ┌─────────────────────────────────┐   │
│  │ Physics Walker                  │   │
│  │ Context Inflator                │   │
│  │ Deduplicator (5-layer)          │   │
│  │ Transient Filter                │   │
│  └─────────────────────────────────┘   │
└──────────────┬──────────────────────────┘
               │ SQLite3 C API
               ▼
┌─────────────────────────────────────────┐
│          SQLite3                        │
│  (atoms, tags, sources, FTS5)          │
└─────────────────────────────────────────┘
```

---

## Completed Phases

### ✅ Phase 0: Foundation
- CMake build system
- C++17 standard enforcement
- Core type definitions
- API headers for all components
- Build scripts (Linux/macOS/Windows)

### ✅ Phase 1: Database Layer
- Full SQLite3 wrapper with RAII pattern
- Schema ported from Rust implementation
- Tables: sources, atoms, tags, molecules, edges, atoms_fts
- FTS5 full-text search with auto-sync triggers
- WAL mode for concurrent reads
- Thread-safe with mutex locking
- All CRUD operations implemented

### ✅ Phase 2: Context Inflation
- n-1, n+1 expansion from file coordinates
- Paragraph boundary detection
- Configurable base_radius (default 205 chars)
- max_chars clamping
- File I/O utilities (read, write, range read)
- Compound rehydration from mirrored_brain/

### ✅ Phase 3: Deduplication
- 5-layer deduplication strategy
  1. Geometric overlap (50% threshold)
  2. MD5 fingerprint (first 500 chars)
  3. Containment check (substring match)
  4. Fuzzy prefix matching (90% similarity)
  5. SimHash distance (Hamming < 5)
- Optimized Hamming distance with popcount
- Configurable thresholds for all layers

---

## Remaining Phases

### ⏳ Phase 4: Transient Filter
- Pattern matching for noise removal
- Configurable patterns (Traceback, npm install, etc.)
- Aho-Corasick algorithm optimization

### ⏳ Phase 5: N-API Bindings
- Node.js module wrapper
- Async operation support
- All component bindings

### ⏳ Phase 6: Integration
- Replace PGlite with SQLite3
- Run existing test suite
- Fix regressions

### ⏳ Phase 7: Benchmarks
- Memory benchmarks
- Latency benchmarks
- Throughput benchmarks
- Comparison with Node.js version

---

## Building

### Prerequisites

**Ubuntu/Debian:**
```bash
sudo apt-get install cmake libsqlite3-dev nlohmann-json3-dev
```

**macOS:**
```bash
brew install cmake sqlite nlohmann-json
```

**Windows (vcpkg):**
```bash
vcpkg install sqlite3 nlohmann-json
```

### Build Commands

```bash
cd cpp

# Build Release version
./build.sh          # Linux/macOS
build.bat           # Windows

# Build with N-API (when ready)
./build.sh --with-napi

# Build with tests (when ready)
./build.sh --with-tests
```

---

## Component APIs

### Database

```cpp
Database db("context.db");

// Insert atom
Atom atom{...};
AtomId id = db.insertAtom(atom);

// Search with FTS5
auto results = db.searchAtoms("query", 100);

// Batch insert
std::vector<Atom> atoms = {...};
auto ids = db.insertAtomsBatch(atoms);
```

### Context Inflator

```cpp
ContextInflator inflator(config);

auto inflated = inflator.inflate(
    db,
    atom_ids,
    65536  // max_chars
);
```

### Deduplicator

```cpp
Deduplicator dedup(config);

// Basic dedup (SimHash only)
auto unique = dedup.deduplicate(candidates);

// Full 5-layer dedup (with content)
auto unique = dedup.deduplicateWithContent(
    candidates,
    contents
);
```

### Physics Walker

```cpp
PhysicsWalker walker(config);

auto candidates = walker.performRadialInflation(
    db,
    anchor_ids,
    150,   // limit
    0.005  // threshold
);
```

---

## Performance Targets

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Memory Usage | 900MB | <200MB | 🟡 50% there |
| Search (p95) | 150-200ms | <50ms | 🟡 Database ready |
| Ingestion | 1x | 2x | 🟡 Schema ready |
| Dedup Rate | 45% | 45%+ | ✅ Implemented |

---

## Repository Structure

```
anchor-engine-node/
├── cpp/                        # C++ core library
│   ├── CMakeLists.txt
│   ├── README.md
│   ├── PROJECT_STATUS.md
│   ├── PHASE1_COMPLETE.md
│   ├── build.sh, build.bat
│   ├── include/               # Headers
│   │   ├── types.h
│   │   ├── database.h
│   │   ├── physics_walker.h
│   │   ├── context_inflator.h
│   │   ├── deduplicator.h
│   │   ├── transient_filter.h
│   │   ├── simhash.h
│   │   ├── md5.h
│   │   ├── file_utils.h
│   │   └── ...
│   ├── src/                   # Implementations
│   │   ├── database.cpp
│   │   ├── physics_walker.cpp
│   │   ├── context_inflator.cpp
│   │   ├── deduplicator.cpp
│   │   ├── md5.cpp
│   │   ├── file_utils.cpp
│   │   └── ...
│   └── napi/                  # Node.js bindings
├── engine/
│   └── native/                # Compiled .node file
└── tests/                     # Test suite (reusable)
```

---

## Documentation

- **[cpp/README.md](cpp/README.md)** - C++ library overview
- **[cpp/PROJECT_STATUS.md](cpp/PROJECT_STATUS.md)** - Detailed project status
- **[cpp/PHASE1_COMPLETE.md](cpp/PHASE1_COMPLETE.md)** - Phase 1 summary
- **[specs/spec.md](specs/spec.md)** - System specification
- **[specs/standards/RESEARCH_LANDSCAPE.md](specs/standards/RESEARCH_LANDSCAPE.md)** - Related work

---

## Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 0: Foundation | 1 week | ✅ Complete |
| Phase 1: Database | 1 week | ✅ Complete |
| Phase 2: Context Inflation | 1 week | ✅ Complete |
| Phase 3: Deduplication | 1 week | ✅ Complete |
| Phase 4: Transient Filter | 1 week | ⏳ In Progress |
| Phase 5: N-API Bindings | 1 week | ⏳ Pending |
| Phase 6: Integration | 1 week | ⏳ Pending |
| Phase 7: Benchmarks | 1 week | ⏳ Pending |

**Total Progress:** 4/8 phases (50%)  
**Estimated Completion:** 4 weeks from start

---

## License

AGPL-3.0 (same as Anchor Engine)

---

**Last Updated:** February 24, 2026  
**Branch:** cpp-optimization
