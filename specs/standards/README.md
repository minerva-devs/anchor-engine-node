# Architecture Standards Index

**Last Updated:** March 9, 2026 | **Total Standards:** 92

---

## Active Standards (Current Implementation)

These standards define the current production architecture:

### v4.5.4 Standards (Security Hardening + Test Coverage + Async I/O)

| # | Standard | Description | Status |
|---|----------|-------------|--------|
| **132** | [API Versioning Strategy](132-api-versioning.md) | URL-based versioning, deprecation process, breaking changes policy | ✅ v1.0 |
| **131** | [Async File I/O](131-async-file-io.md) | Non-blocking API endpoints, event loop preservation | ✅ v1.0 |
| **130** | [Test Coverage Requirements](130-test-coverage-requirements.md) | Minimum coverage targets, testing patterns, mock strategies | ✅ v1.0 |
| **129** | [Command Injection Prevention](129-command-injection-prevention.md) | execFile whitelist, path validation, security patterns | ✅ v1.0 |

### v4.5.2 Standards (Illuminate + MCP Generalization)

| # | Standard | Description | Status |
|---|----------|-------------|--------|
| **128** | [Illuminate BFS Traversal](128-illuminate-bfs-traversal.md) | BFS graph traversal from seed concepts; structural corpus compression (v2.0 with Explore/Illuminate split) | ✅ v2.0 |

### v4.4.2 Standards (Search Result Quality)

| # | Standard | Description | Status |
|---|----------|-------------|--------|
| **200** | [Deployment Security](200-deployment_security.md) | Production security hardening & threat model | ✅ v1.0 |
| **126** | [Pointer-Only Index Design](126-pointer_only_index_design.md) | Architecture tradeoffs for filesystem + pointer index | ✅ v1.0 |
| **123** | [Search Result Tag Sanitization](123-search_result_tag_sanitization.md) | Strip inline `#Tag` tokens from content before LLM delivery | ✅ v1.0 |
| **124** | [Virtual Anchor Resolution](124-virtual_anchor_resolution.md) | Map `virtual_*` ContextInflator IDs to real `mol_*` DB IDs for Physics Walker | ✅ v1.0 |
| **125** | [Semantic Deduplication](125-semantic_deduplication.md) | Per-source snippet cap + word-overlap dedup to eliminate redundant results | ✅ v1.0 |

### v4.3.2 Standards (Output Quality & Stability)

| # | Standard | Description | Status |
|---|----------|-------------|--------|
| **121** | [Tag Limiting](121-tag_limiting.md) | 10-tag limit per molecule for output quality | ✅ v1.0 |
| **122** | [Physics Walker Safety](122-physics_walker_safety.md) | Temporal decay underflow prevention | ✅ v1.0 |

### v4.3.0 Standards (PGlite-First Architecture)

| # | Standard | Description | Status |
|---|----------|-------------|--------|
| **119** | [PGlite-First Architecture](119-pglite-first-architecture.md) | ARM64 Windows migration, transaction support | ✅ v1.0 |

### v4.2.0 Standards (Context Quality Improvements)

| # | Standard | Description | Status |
|---|----------|-------------|--------|
| **086** | [Dual-Strategy Search](086-dual_strategy_search.md) | Standard + Max-Recall with XML metadata | ✅ v2.0 |
| **113** | [Automatic Max-Recall](113-automatic_max_recall.md) | Auto-trigger at >16k tokens | ✅ v1.0 |
| **116** | [Phoenix Protocol](116-phoenix-protocol.md) | Backup/Restore with mirrored_brain (v2 files format) | ✅ v2.0 |
| **118** | [Native Core Stabilization](118-native-core-stabilization.md) | C++ N-API Migration, N+1 Query Fixes, Thread Safety | ✅ v1.0 |

### Core Standards (v4.x)

| # | Standard | Description | Status |
|---|----------|-------------|--------|
| **105** | [API Contracts](105-api-contracts.md) | Integration API specification with authentication & examples | ✅ ACTIVE |
| **104** | [Universal Semantic Search](104-universal-semantic-search.md) | Unified search architecture (70/30 budget) | ✅ ACTIVE |
| **110** | Ephemeral Index | Disposable database pattern | ✅ ACTIVE |
| **109** | Batched Ingestion | Large file handling | ✅ ACTIVE |
| **103** | [Standalone UI Capability](103-standalone-ui-capability.md) | Internal lightweight UI serving | ✅ ACTIVE |
| **102** | [Centralized Configuration](102-centralized-configuration-management.md) | user_settings.json as single source | ✅ ACTIVE |
| **101** | [Byte Offset Protocol](101-byte-offset-protocol.md) | Efficient content retrieval | ✅ ACTIVE |
| **100** | [PGlite Type Handling](100-pglite-type-handling.md) | Database type validation | ✅ ACTIVE |
| **099** | [SQL Injection Prevention](099-sql-injection-prevention.md) | Parameterized queries | ✅ ACTIVE |
| **098** | [Scaling Architecture](098-scaling-architecture.md) | Horizontal scaling protocol | ✅ ACTIVE |
| **097** | [Enhanced Code Analysis](097-enhanced-code-analysis.md) | AST pointers for code | ✅ ACTIVE |
| **096** | [Timestamp Assignment](096-timestamp-assignment-protocol.md) | Temporal decay scoring | ✅ ACTIVE |
| **095** | [Database Reset](095-database-reset-on-startup.md) | Ephemeral index pattern | ✅ ACTIVE |
| **088** | [Server Startup Sequence](088-server-startup-sequence.md) | ECONNREFUSED fix | ✅ ACTIVE |
| **077** | [Benchmark Protocol](077-benchmark-protocol.md) | Standardized benchmarking methodology | ✅ ACTIVE |
| **074** | [Native Module Acceleration](074-native-module-acceleration.md) | Iron Lung Protocol (C++) | ✅ ACTIVE |
| **065** | [Graph Associative Retrieval](065-graph-associative-retrieval.md) | Tag-Walker protocol | ✅ ACTIVE |
| **059** | [Reliable Ingestion](059-reliable-ingestion.md) | Ghost Data Protocol | ✅ ACTIVE |

---

## Deprecated Standards (Historical Reference)

These standards have been superseded but are kept for reference:

| # | Standard | Superseded By | Date |
|---|----------|---------------|------|
| **094** | [Smart Search Protocol](094-smart-search-protocol.md) | Standard 104 | Feb 2026 |
| **086** | Tag-Walker Calibration | Standard 104 | Feb 2026 |
| **084** | Semantic Shift Architecture | Current implementation | Jan 2026 |
| **073** | CozoDB Integration | PGlite migration | Nov 2025 |
| **063** | Cozo DB Syntax | PGlite migration | Nov 2025 |
| **064** | CozoDB Query Stability | PGlite migration | Nov 2025 |
| **067** | CozoDB Query Sanitization | PGlite migration | Nov 2025 |
| **053** | CozoDB Pain Points | PGlite migration | Nov 2025 |

---

## Archived Standards

Older standards organized by development phase:

### 001-050: Early Standards (July-September 2025)

**Location:** `archive/001-050-early-standards/`

Foundation standards from the CozoDB era:
- 001-009: Model loading configuration
- 012-030: Core architecture patterns
- 032-050: Service module patterns

### 051-080: Foundation Standards (October-November 2025)

**Location:** `archive/051-080-foundation-standards/`

PGlite migration and stabilization:
- 051-060: Service architecture
- 061-070: Data pipeline standards
- 071-080: UI and integration standards

### 081-095: Architecture Evolution (December 2025 - January 2026)

**Location:** `archive/081-095-architecture-standards/`

Browser Paradigm implementation:
- 081-085: Semantic architecture
- 086-090: Search optimization
- 091-095: Performance standards

---

## Core Architecture Documents

These documents provide overarching architecture guidance:

| Document | Description |
|----------|-------------|
| [System_Architecture.md](System_Architecture.md) | High-level system overview |
| [Database_Schema.md](Database_Schema.md) | PGlite schema reference |
| [Data_Pipeline.md](Data_Pipeline.md) | Ingestion pipeline specification |
| [Search_Protocol.md](Search_Protocol.md) | Search algorithm reference |

---

## Standards by Domain

### CORE Domain (Philosophy & Invariants)
- 001-030: Local-first invariants, privacy, configuration

### ARCH Domain (System Architecture)
- 051-080: Node.js monolith, PGlite, workers, UI

### DATA Domain (Data & Memory)
- 017-070: Ingestion, schemas, mirror protocol, Tag-Walker

### OPS Domain (Operations & Safety)
- 035-062: Logging, async handling, inference stability
- **129-131: Security hardening, test coverage, async I/O**

### BRIDGE Domain (APIs & Interfaces)
- 058-103: Universal RAG API, UI architecture, extensions

---

## How to Use This Index

1. **Implementation:** Start with Active Standards (top section)
2. **Historical Context:** Check Deprecated Standards for why changes were made
3. **Deep Dives:** Browse Archived Standards by development phase
4. **Cross-Reference:** Use domain organization for related standards

---

## Standard Numbering

Standards are numbered sequentially. Gaps indicate deprecated or merged standards.

**Ranges:**
- 001-050: Foundation (July-September 2025)
- 051-080: Stabilization (October-November 2025)
- 081-100: Acceleration (December 2025-January 2026)
- 101-125: Production (February 2026)
- 126-131: Security & Quality (March 2026)

---

## Contributing

When proposing new standards:

1. Check if existing standard covers the topic
2. Create new standard with next available number
3. Update this index
4. Link to related standards
5. Document deprecation if superseding existing standard

---

**Full Archive:** See `archive/` subdirectories for historical standards  
**Project Specs:** See `../spec.md`, `../tasks.md`, `../plan.md`  
**Whitepaper:** See `../../docs/whitepaper.md`
