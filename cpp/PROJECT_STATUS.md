# C++ Optimization Project Status

**Branch:** cpp-optimization  
**Created:** February 24, 2026  
**Status:** Foundation Complete - Ready for Implementation

---

## Executive Summary

The C++ optimization branch has been created with a complete skeleton for the high-performance core library. The foundation includes:

✅ CMake build system configured  
✅ C++17 standard enforced  
✅ Core type definitions established  
✅ Physics Walker API designed  
✅ Database wrapper (SQLite3) architected  
✅ N-API bindings skeleton created  
✅ Build scripts for Linux/macOS/Windows  

---

## What's Complete

### 1. Branch Structure

```
anchor-engine-node/
├── cpp/                          # NEW: C++ core library
│   ├── CMakeLists.txt           # ✅ Build configuration
│   ├── README.md                # ✅ Documentation
│   ├── build.sh                 # ✅ Unix build script
│   ├── build.bat                # ✅ Windows build script
│   ├── include/                 # ✅ Header files
│   │   ├── types.h              # ✅ Core type definitions
│   │   ├── database.h           # ✅ SQLite3 wrapper
│   │   ├── physics_walker.h     # ✅ STAR algorithm API
│   │   ├── context_inflator.h   # ✅ n-1, n+1 expansion API
│   │   ├── deduplicator.h       # ✅ 5-layer dedup API
│   │   ├── transient_filter.h   # ✅ Noise filtering API
│   │   ├── simhash.h            # ✅ Fingerprinting API
│   │   ├── graph_traversal.h    # ✅ BFS traversal API
│   │   └── unified_field_equation.h  # ✅ Gravity equation API
│   ├── src/                     # ✅ Implementation stubs
│   │   ├── physics_walker.cpp   # ✅ Partial implementation
│   │   ├── context_inflator.cpp # ✅ Stub
│   │   ├── deduplicator.cpp     # ✅ Stub
│   │   ├── transient_filter.cpp # ✅ Stub
│   │   ├── simhash.cpp          # ✅ Stub
│   │   ├── graph_traversal.cpp  # ✅ Stub
│   │   └── unified_field_equation.cpp  # ✅ Stub
│   └── napi/                    # ✅ Node.js bindings
│       └── CMakeLists.txt       # ✅ N-API build config
├── engine/
│   └── native/                  # (will contain compiled .node file)
└── tests/                       # Existing test suite (reusable)
```

### 2. Core API Design

**Physics Walker:**
```cpp
PhysicsWalker walker(config);
auto candidates = walker.performRadialInflation(
    db,
    anchor_ids,
    150,   // limit
    0.005  // threshold
);
```

**Unified Field Equation:**
```cpp
// W(q,a) = |T(q) ∩ T(a)| · γ^(d(q,a)) × e^(-λΔt) × (1 - H(h_q,h_a)/64)
double score = computeGravityScore(
    shared_tags,    // |T(q) ∩ T(a)|
    hop_distance,   // d(q,a)
    delta_t,        // Δt
    simhash_diff,   // H(h_q,h_a)
    config
);
```

### 3. Database Schema (Planned)

Based on Rust implementation with additions for Physics Walker:

```sql
-- Core tables (from Rust)
sources (id, path, bucket, created_at, updated_at, metadata)
atoms (id, source_id, content, char_start, char_end, timestamp, simhash, metadata)
tags (id, atom_id, tag, bucket)
atoms_fts (FTS5 virtual table)

-- Additional tables for Physics Walker
atom_positions (atom_id, compound_id, start_byte, end_byte)
molecules (id, compound_id, content, start_byte, end_byte, timestamp, simhash)
edges (from_atom, to_atom, weight, edge_type)
```

---

## What's Next (Implementation Phases)

### Phase 1: Database Layer (Week 1)

**Tasks:**
- [ ] Port SQLite schema from Rust (`anchor-rust-v0/crates/anchor-engine/src/db.rs`)
- [ ] Implement `Database` class methods
- [ ] Add FTS5 search support
- [ ] Implement batch insert with transactions
- [ ] Add WAL mode for concurrent reads

**Files to Create:**
- `cpp/src/database.cpp` (full implementation)
- `cpp/tests/test_database.cpp` (unit tests)

### Phase 2: Physics Walker (Week 2)

**Tasks:**
- [ ] Complete `performRadialInflation()` implementation
- [ ] Implement graph traversal with hop tracking
- [ ] Add temporal decay calculation
- [ ] Add SimHash similarity computation
- [ ] Implement gravity score normalization

**Files to Update:**
- `cpp/src/physics_walker.cpp` (complete implementation)
- `cpp/src/unified_field_equation.cpp` (add optimization)

### Phase 3: Context Inflation (Week 3)

**Tasks:**
- [ ] Implement n-1, n+1 expansion
- [ ] Add paragraph boundary detection
- [ ] Implement max_chars clamping
- [ ] Add file I/O for compound rehydration

**Files to Create:**
- `cpp/src/context_inflator.cpp` (full implementation)
- `cpp/src/file_utils.cpp` (helper for file I/O)

### Phase 4: Deduplication (Week 4)

**Tasks:**
- [ ] Implement 5-layer deduplication
- [ ] Add geometric overlap detection
- [ ] Add MD5 fingerprinting
- [ ] Add containment check
- [ ] Add fuzzy prefix matching
- [ ] Optimize SimHash distance (popcount)

**Files to Update:**
- `cpp/src/deduplicator.cpp` (full implementation)
- `cpp/src/md5.cpp` (new: MD5 implementation)

### Phase 5: Transient Filter (Week 5)

**Tasks:**
- [ ] Implement pattern matching
- [ ] Add configurable patterns
- [ ] Add min_content_length filter
- [ ] Optimize with Aho-Corasick algorithm

**Files to Update:**
- `cpp/src/transient_filter.cpp` (full implementation)

### Phase 6: N-API Bindings (Week 6)

**Tasks:**
- [ ] Create N-API module entry point
- [ ] Wrap PhysicsWalker class
- [ ] Wrap ContextInflator class
- [ ] Wrap Deduplicator class
- [ ] Wrap TransientFilter class
- [ ] Add async support for long operations

**Files to Create:**
- `cpp/napi/src/anchor_core_napi.cpp` (main entry)
- `cpp/napi/src/physics_walker_napi.cpp` (bindings)
- `cpp/napi/src/context_inflator_napi.cpp` (bindings)
- `cpp/napi/src/deduplicator_napi.cpp` (bindings)
- `cpp/napi/src/transient_filter_napi.cpp` (bindings)

### Phase 7: Integration & Testing (Week 7)

**Tasks:**
- [ ] Replace PGlite with SQLite3 in Node.js
- [ ] Update N-API bindings to use new C++ core
- [ ] Run existing test suite
- [ ] Fix any regressions
- [ ] Add C++ unit tests

**Files to Update:**
- `engine/src/core/db.ts` (replace PGlite with SQLite3)
- `engine/src/services/search/physics-tag-walker.ts` (use N-API)

### Phase 8: Benchmarks (Week 8)

**Tasks:**
- [ ] Run memory benchmarks
- [ ] Run latency benchmarks
- [ ] Run throughput benchmarks
- [ ] Compare with Node.js-only version
- [ ] Document improvements

**Files to Create:**
- `tests/benchmarks/memory_bench.js`
- `tests/benchmarks/search_latency_bench.js`
- `tests/benchmarks/ingestion_bench.js`
- `cpp-optimization-results.md` (final report)

---

## Build Instructions

### Prerequisites

```bash
# Install CMake
# Ubuntu/Debian
sudo apt-get install cmake libsqlite3-dev nlohmann-json3-dev

# macOS
brew install cmake sqlite nlohmann-json

# Windows (with vcpkg)
vcpkg install sqlite3 nlohmann-json
```

### Build Commands

```bash
# Navigate to cpp directory
cd cpp

# Build (Release mode)
./build.sh

# Build with N-API bindings
./build.sh --with-napi

# Build with tests
./build.sh --with-tests

# Windows
build.bat --with-napi
```

### Test Build

```bash
# After building with --with-tests
cd build
ctest --verbose
```

---

## Performance Targets

| Component | Current (Node.js) | Target (C++) | Improvement |
|-----------|------------------|--------------|-------------|
| **Memory Usage** | 900MB RSS | <200MB RSS | 4.5x |
| **Search Latency (p95)** | 150-200ms | <50ms | 3-4x |
| **Ingestion Throughput** | 1x | 2x | 2x |
| **Deduplication** | ~100ms | ~20ms | 5x |
| **Graph Traversal** | ~500ms | ~100ms | 5x |

---

## Testing Strategy

**Existing Tests (Reusable):**
- ✅ 22 unit tests in `tests/unit/`
- ✅ Integration tests
- ✅ E2E tests

**New C++ Tests:**
- Database operations (CRUD)
- Physics Walker correctness
- Context Inflation boundaries
- Deduplication accuracy
- Transient Filter patterns

---

## Risk Mitigation

**Risk:** C++ implementation diverges from Node.js behavior  
**Mitigation:** Run same test suite against both implementations

**Risk:** N-API bindings introduce complexity  
**Mitigation:** Keep bindings thin, most logic in C++ core

**Risk:** SQLite3 lacks PGlite features  
**Mitigation:** PGlite is PostgreSQL-compatible, but we only use basic SQLite features + FTS5

**Risk:** Build complexity across platforms  
**Mitigation:** CMake handles cross-platform builds, provide scripts for all platforms

---

## Success Criteria

**Phase 1-6 Complete When:**
- ✅ All C++ components implemented
- ✅ N-API bindings working
- ✅ All existing tests pass
- ✅ No regressions in functionality

**Phase 7-8 Complete When:**
- ✅ Memory usage <200MB RSS
- ✅ Search latency <50ms p95
- ✅ Ingestion throughput 2x current
- ✅ Documentation complete

---

## Next Immediate Actions

1. **Port SQLite Schema** (Current Task)
   - Copy schema from `anchor-rust-v0/crates/anchor-engine/src/db.rs`
   - Add tables for molecules, edges, atom_positions
   - Create migration script

2. **Implement Database Class**
   - Complete all CRUD operations
   - Add FTS5 search
   - Enable WAL mode

3. **Test Database Layer**
   - Create unit tests
   - Verify schema correctness
   - Benchmark CRUD operations

---

**Status:** Ready for Phase 1 implementation  
**Next Review:** After SQLite schema port complete  
**Estimated Completion:** 8 weeks from start
