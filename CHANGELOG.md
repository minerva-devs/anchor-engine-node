# Changelog

All notable changes to the Anchor Engine will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [4.2.1] - 2026-02-24 — Documentation Synthesis, Docker & C++ Optimization

### Documentation Consolidation

Synthesized arXiv documentation into project specs for better maintainability:

#### New Documentation
- **docs/ARCHITECTURE_DIAGRAMS.md** - Human-friendly visual architecture (Mermaid diagrams)
- **docs/CPP_OPTIMIZATION.md** - C++ optimization project overview
- **specs/standards/STANDARD_117_ARXIV_SUBMISSION.md** - arXiv submission workflow
- **specs/standards/RESEARCH_LANDSCAPE.md** - Related work analysis & citation guide
- **specs/standards/doc_policy.md** - Documentation policy and workflow
- **docs/BIBLIOGRAPHY.bib** - Project-wide citation database (15 key papers)

#### Research Landscape Analysis
Analyzed and positioned STAR against related work:
- **Vector RAG:** HNSW (Malkov 2018), FAISS (Johnson 2019)
- **Graph-Based Memory:** T-Retriever (Wei 2026), PersonalAI (Menschikov 2025)
- **Personal AI Memory:** Second Me (Wei 2025), Cognitive AI (Salas 2025)
- **Foundational:** SimHash (Charikar 2002), PageRank (Brin & Page 1998)

### arXiv Preparation

**Whitepaper Status:** Ready for submission to arXiv cs.IR (primary), cs.AI (secondary)

**Added to Whitepaper:**
- Related Work section (6 subsections)
- Bibliography with 15 citations
- In-text citations (SimHash, PageRank, HNSW, etc.)
- Implementation notes (normalization, damping, hop distance)

**Helper Scripts Created:**
- `docs/arxiv/compile.bat` - 4-pass LaTeX compilation
- `docs/arxiv/prepare-submission.bat` - Package preparation

### Docker Support

**Containerization:**
- **Dockerfile** - Single-stage build based on Node.js 20 LTS
- **docker-compose.yml** - Full orchestration with volumes and health checks
- **.dockerignore** - Build context optimization
- **Volume Mounts:** inbox, external-inbox, mirrored_brain, backups, notebook
- **Environment Variables:** PROJECT_ROOT, CONTEXT_DIR, NOTEBOOK_DIR
- **Health Check:** HTTP endpoint monitoring
- **Resource Limits:** 2 CPU, 2GB RAM (tested on 4GB laptops)

**Path Alignment:**
- Docker paths match native deployment structure
- Seamless migration between Docker and native
- Phoenix Protocol backups accessible at ./backups/
- Synonym rings saved to ./notebook/

### C++ Optimization Project

**New Branch:** `cpp-optimization` (50% complete - 4/8 phases)

**Phase 0: Foundation ✅**
- CMake build system with C++17 standard
- Core type definitions (Atom, Tag, Source, Candidate, etc.)
- API headers for all components
- Build scripts for Linux/macOS/Windows

**Phase 1: Database Layer ✅**
- Full SQLite3 wrapper with RAII pattern
- Schema ported from Rust implementation
- Tables: sources, atoms, tags, molecules, edges, atoms_fts
- FTS5 full-text search with auto-sync triggers
- WAL mode for concurrent reads
- All CRUD operations implemented

**Phase 2: Context Inflation ✅**
- n-1, n+1 expansion from file coordinates
- Paragraph boundary detection
- Configurable base_radius (default 205 chars)
- max_chars clamping to prevent overflow
- File I/O utilities (read, write, range read)

**Phase 3: Deduplication ✅**
- 5-layer deduplication strategy:
  1. Geometric overlap (50% threshold)
  2. MD5 fingerprint (first 500 chars)
  3. Containment check (substring match)
  4. Fuzzy prefix matching (90% similarity)
  5. SimHash distance (Hamming < 5)
- Optimized Hamming distance with popcount instruction
- Configurable thresholds for all layers

**Performance Targets:**
- Memory: <200MB RSS (vs 900MB current) - 4.5x improvement
- Search: <50ms p95 (vs 150-200ms current) - 3-4x improvement
- Ingestion: 2x throughput

**Total C++ Code:** 3,757 lines across 20+ files

### SQL Fixes (Physics Walker)

**Bug Fixes:**
1. **WITH RECURSIVE** - Added for recursive CTE support (PostgreSQL requirement)
2. **COALESCE** - NULL handling for all fields (hop_distance, shared_tags, simhash, timestamps)
3. **Hop Distance Clamping** - LEAST(GREATEST(hop, 0), 3) prevents POWER underflow
4. **UNION ALL Restructuring** - Split candidates into separate CTEs for PGlite compatibility

**Fixed Errors:**
- `syntax error at or near UNION` → Fixed with CTE restructuring
- `relation hop_traversal does not exist` → Fixed with WITH RECURSIVE
- `value out of range: underflow` → Fixed with COALESCE + hop clamping

**SQL Improvements:**
```sql
-- Before: POWER(0.85, hop_distance) - fails on NULL or large values
-- After: POWER(0.85, LEAST(GREATEST(COALESCE(hop, 1), 0), 3))
-- Result: hop 0=1.0, hop 1=0.85, hop 2=0.72, hop 3=0.61
```

### Competitive Positioning

| Paper | STAR's Advantage |
|-------|------------------|
| **Second Me** | Simpler, deterministic, CPU-only |
| **PersonalAI** | Real production validation (28M tokens) |
| **T-Retriever** | Includes temporal decay |
| **HNSW/FAISS** | 4GB RAM, explainable retrieval |

---

## [4.2.0] - 2026-02-23 — Context Quality Improvements

### From "Data Dump" to "Sovereign Context"

Three major improvements to move from raw data retrieval to curated, LLM-friendly context:

#### A. Pre-Injection Timestamp Sorting

**File:** `engine/src/services/search/search-utils.ts`

```typescript
// Sort by timestamp first (causal narrative), then by score (relevance)
// This restores causal logic: Code v1 → Error → Code v2
const sortedResults = results.sort((a, b) => {
    // Primary: chronological order (oldest first)
    const timeDiff = a.timestamp - b.timestamp;
    if (timeDiff !== 0) return timeDiff;
    
    // Secondary: relevance score (higher first)
    return b.score - a.score;
});
```

**Impact:** LLM sees evolution over time, not random chunks

#### B. XML Relevance Metadata Wrapper

**File:** `engine/src/services/search/search-utils.ts`

```typescript
// Build XML-wrapped context with relevance metadata
// This helps LLM prioritize content if context window is truncated
const xmlContext = enrichedResults.map(r => {
    const relevanceScore = ((r.score || 0) * (r.temporal_weight || 1)).toFixed(3);
    const timestamp = new Date(r.timestamp).toISOString();
    const persona = r.buckets?.[0] || 'unknown';
    
    return `<atom id="${r.id}" relevance="${relevanceScore}" timestamp="${timestamp}" persona="${persona}" source="${r.source}">
${r.content || ''}
</atom>`;
}).join('\n\n');
```

**Impact:** LLM knows what to prioritize if context gets truncated

#### D. Transient Data Filter

**Files:** `atomizer-service.ts`, `watchdog.ts`, `ingest.ts`, `api.ts`, `github-ingest-service.ts`

```typescript
private static TRANSIENT_PATTERNS = [
    // Terminal error logs
    /Traceback \(most recent call last\)/i,
    /KeyError:/i, /TypeError:/i,
    
    // Package installation logs
    /npm install/i, /pip install/i,
    /added \d+ package/i,
    
    // Build artifacts
    /Build succeeded/i, /Compiling\.\.\./i,
];
```

**Impact:** ~30% context window reclaimed

### UI: Time Ordering Toggle

**File:** `packages/anchor-ui/src/components/features/SearchColumn.tsx`

- **Toggle Button:** 📅 Chronological (green) ↔ 🎯 Relevance (purple)
- **Chronological:** oldest first (causal narrative)
- **Relevance:** highest score first (associative discovery)
- **Tooltip:** Explains current mode and what clicking will do

**Rationale:** Sometimes association is better than linearity—users choose.

### Expected Impact

| Improvement | Benefit | Cost |
|-------------|---------|------|
| **Timestamp Sorting** | Causal narrative restored | Negligible (client-side sort) |
| **XML Metadata** | LLM prioritization | Minimal (~5% overhead) |
| **Transient Filter** | ~30% context reclaimed | None (prevents noise) |

**Combined:** Moves STAR from "data dump" to "sovereign context"

---

## [4.1.2] - 2026-02-22 — SimHash Deduplication Fix

### ✅ Cross-File Near-Duplicate Deduplication

Added SimHash distance check to catch cross-file near-duplicates:

- ✅ **SimHash Distance Check** - Hamming distance < 5 = near-duplicate
- ✅ **Cross-File Detection** - Catches paraphrased/modified versions
- ✅ **Expected Improvement** - 25-35% → 40-50% dedup rate

### Implementation

**File:** `engine/src/services/search/search.ts` (line 393-399)

```typescript
// 3. SimHash Distance Check - Cross-file near-duplicates (NEW)
// Hamming distance < 5 out of 64 bits = near-duplicate content
if (candidate.molecular_signature && kept.molecular_signature) {
  const simhashDistance = getHammingDistance(candidate.molecular_signature, kept.molecular_signature);
  if (simhashDistance < 5) {
    isContentDuplicate = true;
    break;
  }
}
```

### Dedup Strategy (Complete)

1. ✅ **Geometric Dedup** - Same-file overlapping windows (50% threshold)
2. ✅ **Content Fingerprint** - Cross-file exact duplicates (MD5 hash)
3. ✅ **Containment Check** - Subset detection
4. ✅ **Fuzzy Prefix Match** - Near-exact duplicates (50-100 chars)
5. ✅ **SimHash Distance** - Cross-file near-duplicates (NEW)

---

## [4.1.1] - 2026-02-22 — Max-Recall & Context Inflation Complete

### ✅ Dual-Strategy Search Implementation

Complete max-recall mode with automatic triggering and context inflation:

- ✅ **Auto-Trigger** - Activates at >16k tokens (65k chars)
- ✅ **Context Inflation** - Post-merge n-1, n+1 expansion from disk
- ✅ **Physics Walker Config** - 3-hop, zero decay, 200 nodes/hop
- ✅ **Full Budget Allocation** - Each sub-query gets full budget
- ✅ **Query Splitting** - 4-word chunks, 5 max parallel searches

### Performance Benchmarks (Production Verified)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| **Context Retrieved** | 524k chars | **618k chars** | ✅ **+18%** |
| **Avg Chars/Atom** | 5k chars | **8,550 chars** | ✅ **+71%** |
| **Budget Utilization** | 90% | **98%** | ✅ **+8%** |
| **Atoms Retrieved** | 40-100 | **60 atoms** | ✅ Optimal |

### New Standards

- **Standard 086 (Updated)** - Dual-Strategy Search with max-recall
- **Standard 113** - Automatic Max-Recall for large budgets
- **Standard 116** - Phoenix Protocol (transactional backup/restore)

### Configuration

**Max-Recall Parameters** (`config/max-recall-config.ts`):
```typescript
{
  temporal_decay: 0.0,      // Zero age bias
  damping: 1.0,             // Zero signal loss
  max_hops: 3,              // Deep traversal
  max_per_hop: 200,         // Aggressive expansion
  temperature: 0.8          // High serendipity
}
```

### API Changes

- `POST /v1/memory/search` - Now accepts `strategy: 'max-recall'`
- Auto-triggers when `max_chars > 65,536`
- Response includes inflated context from disk

### UI Changes

- Deep Research button explicitly triggers max-recall
- Volume slider auto-triggers at maximum setting
- Bucket filtering works with max-recall mode

### Known Limitations

- **Search Latency:** 25-50s for max-recall (acceptable for 600k+ chars)
- **Cross-File Deduplication:** SimHash distance not yet implemented

---

## [4.1.0] - 2026-02-22 — Phoenix Protocol Complete

### ✅ Phoenix Protocol Implementation

Full transactional backup/restore system with filesystem rebuild:

- ✅ **Database Restore** - atoms, sources, engrams tables
- ✅ **Filesystem Rebuild** - inbox/, external-inbox/, mirrored_brain/
- ✅ **Performance Metrics** - timing, throughput stats
- ✅ **UI Integration** - inline confirmation, progress display
- ✅ **Optimized Batching** - 1000 items/batch (10x faster)

### Performance Benchmarks (Production Verified)

| Metric | Value |
|--------|-------|
| **Backup Size** | 1,015.40 MB |
| **Atoms Restored** | 281,690 |
| **Sources Restored** | 17 |
| **Total Time** | 828.8s (13.8 min) |
| **Throughput** | 340 atoms/second |
| **Memory Peak** | <600 MB |

### New Standards

- **Standard 116** - Phoenix Protocol (transactional backup/restore)

### API Changes

- `POST /v1/backup/restore` - Now includes timing metrics
- Response includes `totalTime` and `atomsPerSec`

### UI Changes

- Restore button with inline confirmation
- Progress logging every 10 seconds
- Final stats display with timing

---

## [4.0.0] - 2026-02-20 — Production Ready

### ✅ Whitepaper Implementation Complete

All specifications from the Sovereign Context Protocol whitepaper have been implemented and verified:

- ✅ STAR Algorithm (Tag-Walker with gravity scoring)
- ✅ SimHash Deduplication (O(1) duplicate detection)
- ✅ Disposable Index Architecture (Standard 110)
- ✅ Cross-Platform Native Modules (@rbalchii/* npm packages)
- ✅ Resource Efficiency (<1GB for 90MB datasets)
- ✅ SQL-Native Implementation (PGlite + CTEs)

### Performance Benchmarks (Verified)

| Metric | Result | Target | Status |
|--------|--------|--------|--------|
| **90MB Ingestion** | ~178s | <200s | ✅ |
| **Memory Peak** | <1GB | <1GB | ✅ |
| **Search Latency (p95)** | ~150ms | <200ms | ✅ |
| **Event Loop Yielding** | <100ms | <100ms | ✅ |
| **Native Acceleration** | 20x | 20x | ✅ |

### Production Deployment (Feb 2026)

- **436 files** ingested (~100MB total)
- **~280,000 molecules** processed
- **~1,500 atoms** indexed
- **331 files** rehydrated successfully
- **Zero data loss** with ephemeral index architecture

---

## [4.0.0] - 2026-02-16 — Architecture Clarification

### Critical Architecture Documentation

**The PGlite database is NOT the source of truth.** This release clarifies the **disposable index architecture**:

- **Source of Truth:** `mirrored_brain/` directory (plain filesystem)
- **Index:** PGlite database (byte-offset pointers + tags, rebuildable)
- **Implication:** Database wipe on shutdown is intentional—data persists in `mirrored_brain/`

### STAR Algorithm Documentation

Comprehensive documentation added for the physics-based search algorithm:

**Unified Field Equation:**
```
Gravity(atom, anchor) = (SharedTags) × e^(-λ × ΔTime) × (1 - SimHashDistance/64)
```

**Search Phases:**
1. **Planets (70%):** Direct keyword FTS matches
2. **Moons (30%):** Graph-discovered associations via tag-walker
3. **Fusion Scoring:** Gravity-weighted ranking

### Data Model Clarification

**Compound → Molecule → Atom** hierarchy:
- **Compound:** File/document reference
- **Molecule:** Semantic chunk with byte-offset pointers
- **Atom:** Tag/concept (NOT content)—content lives in `mirrored_brain/`

---

## [Standard 104] - 2026-02-10 — Universal Semantic Search

### Added

- **Universal Semantic Search Protocol:** Unified search architecture
- **70/30 Distributed Budgeting:** Strict token budget split (70% Direct / 30% Associative)
- **Adaptive Radius:** Dynamic context window sizing based on budget
- **Smart Content Weighting:** `code_weight` parameter for search tuning

### Deprecated

- **Standard 094 (Smart Search):** "Strict Anchor Phase" (AND logic) too brittle for natural language
- **Standard 086 (Tag Walker):** Replaced by unified Semantic Search route

---

## [Standard 103] - 2026-02-05 — Standalone UI

### Added

- **Standalone UI:** Internal lightweight UI serving capability
- **UI Detection Logic:** Automatic selection between external/internal UI
- **Catch-all Routes:** SPA routing support

---

## [Standard 102] - 2026-02-01 — Configuration Management

### Added

- **Centralized Configuration:** `user_settings.json` as single source of truth
- **Path Management:** Cross-platform path resolution
- **Runtime Configuration:** Dynamic reload capabilities

---

## [Standard 101] - 2026-01-28 — Byte Offset Protocol

### Added

- **Byte Offset Pointers:** Efficient content retrieval without loading full files
- **Radial Context Inflation:** Load ±50KB around matched atoms
- **Memory Efficiency:** 60% reduction in memory usage

---

## [Standard 100] - 2026-01-25 — PGlite Type Handling

### Fixed

- **Type Validation:** Proper input validation for PGlite
- **String Type Errors:** Fixed "Invalid input for string type" errors
- **Parameter Binding:** Safe parameterized queries

---

## [Standard 099] - 2026-01-22 — SQL Injection Prevention

### Added

- **Parameterized Queries:** All database queries use parameter binding
- **Input Sanitization:** Query input validation and sanitization
- **Security Audit:** Comprehensive security review

---

## [Standard 098] - 2026-01-28 — Scaling Architecture

### Added

- **Horizontal Scaling:** Distributed processing protocol
- **Worker System:** High-performance worker architecture
- **Load Balancing:** Request distribution across workers

---

## [Standard 097] - 2026-01-20 — Enhanced Code Analysis

### Added

- **AST Pointers:** Semantic code search support
- **Code Type Detection:** Function, class, module identification
- **Dependency Tracking:** Import/export graph edges

---

## [Standard 096] - 2026-01-18 — Timestamp Assignment

### Added

- **Consistent Timestamps:** Unified timestamp assignment protocol
- **Temporal Decay:** Time-based relevance scoring
- **Chronology Sorting:** "Earliest" and "latest" query modifiers

---

## [Standard 095] - 2026-01-15 — Database Reset

### Added

- **Startup Reset:** Automatic database wipe on startup (ephemeral index)
- **Rehydration:** Rebuild index from `mirrored_brain/` on startup
- **Zero Data Loss:** Guaranteed data persistence in filesystem

---

## [Standard 094] - 2026-01-12 — Smart Search Protocol

### Added

- **Intelligent Parsing:** Stopword removal and intent detection
- **Fuzzy Fallback:** Automatic retry with broader logic
- **Dynamic Sorting:** Keyword-based chronological sorting
- **Tag-Based Filtering:** Hashtag filtering support

### Deprecated

- Replaced by Standard 104 (Universal Semantic Search)

---

## [Standard 088] - 2026-01-10 — Server Startup Sequence

### Fixed

- **ECONNREFUSED:** Server starts before database initialization
- **Health Endpoints:** Handle uninitialized state gracefully
- **Extended Timeouts:** Proper initialization sequences

---

## [Standard 087] - 2026-01-08 — Relationship Narratives

### Added

- **Entity Co-occurrence:** Detect relationships between entities
- **Semantic Categories:** #Relationship, #Narrative, #Technical tags
- **Relationship Historian:** Track entity interactions over time

---

## [Standard 086] - 2026-01-06 — Tag-Walker Calibration

### Added

- **Search Calibration:** Improved natural language query handling
- **Multi-Context Split:** Decompose complex queries
- **Iterative Search:** Progressive query simplification

### Deprecated

- Replaced by Standard 104 (Universal Semantic Search)

---

## [Standard 085] - 2026-01-04 — Context Inflation

### Added

- **Context Inflation:** Combine adjacent molecules into coherent windows
- **Molecule Merging:** Contextually meaningful segments
- **Coherence Improvement:** Better retrieval quality

---

## [Standard 084] - 2026-01-02 — Semantic Shift

### Added

- **Semantic Categories:** High-level categorization system
- **Relationship-Focused Search:** Entity relationship prioritization
- **Intent Mapping:** Natural language to semantic categories

---

## [Standard 074] - 2025-12-20 — Native Module Acceleration

### Added

- **C++ N-API Modules:** Performance-critical operations
- **Graceful Degradation:** JavaScript fallbacks when native unavailable
- **Cross-Platform Builds:** Windows, macOS, Linux support
- **Performance Monitoring:** Native module health tracking

### Performance

- **2.3x faster** code processing
- **Sub-millisecond** operations for typical tasks
- **Zero-copy** string processing with `std::string_view`

---

## [Standard 065] - 2025-12-10 — Graph Associative Retrieval

### Added

- **Tag-Walker Protocol:** Graph-based search replacing vector search
- **Bipartite Graph:** Atoms ↔ Tags structure
- **70/30 Budget:** Planets (direct) and Moons (associative) split
- **Unified Field Equation:** Physics-based gravity scoring

---

## [Standard 059] - 2025-11-25 — Reliable Ingestion

### Added

- **Ghost Data Protocol:** Reliable ingestion pipeline
- **Batched Processing:** Atomic batch commits
- **Error Recovery:** Graceful error handling
- **Progress Tracking:** Ingestion status monitoring

---

## [Unreleased]

### Planned

- Enhanced code analysis with AST pointers
- Relationship narrative discovery improvements
- Mobile application support
- Plugin marketplace
- Diffusion-based reasoning models

---

## Legacy Versions

### [3.x] - 2025 (CozoDB Era)

- CozoDB database integration (deprecated)
- Initial Tag-Walker implementation
- Basic ingestion pipeline

### [2.x] - 2024 (Prototype)

- Prototype implementation
- Core atomization concepts
- Early search algorithms

### [1.x] - 2023 (Concept)

- Initial concept and design
- Whitepaper development
- Architecture planning

---

**Production Status:** ✅ Ready (February 20, 2026)  
**Repository:** https://github.com/RSBalchII/anchor-engine-node
