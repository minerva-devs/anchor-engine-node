# Anchor Engine - Current Tasks

**Last Updated:** May 7, 2026 | **Current Sprint:** Test Consolidation & Housekeeping

---

## 🧹 Test Consolidation & Housekeeping (May 2026) — CURRENT

### P0 — Test File Consolidation
- [ ] **Move all tests under `engine/tests/`** — Consolidate `tests/` root directory into `engine/tests/`
  - Convert all `.js`/`.mjs` test files to `.test.ts`
  - Remove standalone test runners (`minimal-framework.mjs`, `minimal-pglite-test.ts`, `minimal/`)
  - Remove duplicate test files in `tests/unit/` (legacy `.js`/`.ts` files with `.js.map` artifacts)
- [ ] **Simplify `package.json` test scripts** — Reduce to:
  - `pnpm test` — run all tests
  - `pnpm test:unit` — unit tests only
  - `pnpm test:integration` — integration tests only
  - `pnpm test:bench` — benchmarks only
  - Remove: `test:orchestrator:*`, `test:cross-route:*`, `test:github-ingestion`, `test:text-flow`, `test:validate-decision-records`, `test:compare`, `test:compare:pattern`
- [ ] **Fix remaining 19 failing tests** — See `specs/plan.md` § Test Suite Audit for breakdown

### P1 — Runtime Data Cleanup
- [ ] **Verify `.anchor/` at project root is empty** — All paths should resolve to `~/.anchor/` via `user_settings.json`
- [ ] **Clean up stale data from project root** — `notebook/`, `test_minimal_db/`, `backups/`
- [ ] **Update `.gitignore`** — Add `.anchor/`, `agent.json`, `skill.json`

### P2 — WASM Binary Packaging
- [ ] **Audit WASM dependencies** — List all `@rbalchii/*-wasm` packages
- [ ] **Evaluate direct `.wasm` loading** — Ship `.wasm` files, load via `fetch()` or `WebAssembly.instantiate()`
- [ ] **Prototype one module** — Pick smallest WASM module, test direct loading
- [ ] **Document tradeoffs** — npm registry vs direct loading

### P2 — DB Schema Clarification
- [ ] **Audit all SQL tables** — Document every table, column, index, and purpose
- [ ] **Create `schema-migration.sql`** — Consolidate all `CREATE TABLE IF NOT EXISTS` statements
- [ ] **Remove `ALTER TABLE` from `db.ts`** — Migrate `ADD COLUMN IF NOT EXISTS` into migration file
- [ ] **Add schema version tracking** — Track schema version in a dedicated table
- [ ] **Document schema** — Add to `docs/` or `specs/`

---

## 🔧 Test Suite Stabilization (May 2026) — PREVIOUS

**Run:** `pnpm test:all` or `vitest run --config engine/vitest.config.ts`
**Baseline:** 19 failed / 35 passed / 4 skipped (out of 58 total)

### P0 — AST Parser Tests (our change, immediate fix)
- [ ] **`engine/tests/unit/ast-parser.test.ts`** — All `parseCodeStructure()` calls need `await`; test bodies need to be `async`
  - 12 tests affected; error: `"Cannot read properties of undefined (reading 'find')"` on Promise return value

### P1 — Module Resolution & Config Issues
- [x] **`engine/tests/unit/context-inflator.test.ts`** — Fixed import paths (added `src/` to db, mirror, db-batch) ✅ DONE
- [x] **`engine/tests/unit/native-module-manager.test.ts`** — Inlined mock function for vitest hoisting fix ✅ DONE
- [x] **`engine/tests/unit/engine-version-logger.test.ts`** — Added vitest import ✅ DONE

### P2 — Environment & Skeleton Issues
- [x] **`engine/tests/unit/physics_walker.test.ts`** — Fixed deterministic ordering (id ASC tiebreaker) ✅ DONE. Note: passes individually; fails when run concurrently with pglite-database due to shared DB path race condition.
- [x] **`engine/tests/unit/security.test.ts`** — Migrated from node:test to vitest/expect ✅ DONE

### P3 — Pre-existing Assertion Bugs (update stale expectations)
- [x] **`engine/tests/unit/github-ingest-history.test.ts`** — Fixed format assertion to `'A new.txt'` ✅ DONE
- [x] **`engine/tests/unit/safe-dns.test.ts`** — Added graceful error handling for DNS fallback failure ✅ DONE
- [x] **`engine/tests/unit/search-logging-verification.test.ts`** — Searches all log files for matching query instead of assuming latest ✅ FIXED

---

## ✅ Completed (February 2026)

### Phase: Production Ready
- [x] Whitepaper implementation complete
- [x] All 77 architecture standards documented
- [x] 100MB+ production data ingested (436 files)
- [x] ~280,000 molecules processed
- [x] ~1,500 atoms indexed
- [x] Performance benchmarks verified
- [x] Documentation streamlined

---

## 🎯 Current Focus

### Phase: Security Hardening (P0 - April 2026)
**Goal:** Address critical security vulnerabilities identified in March 2026 review

- [x] Path traversal prevention utility (`engine/src/utils/security.ts`)
- [x] Fix `/v1/system/paths` endpoint (Standard 129)
- [x] Fix `/v1/system/explorer` endpoint (Standard 129)
- [x] Fix `/v1/test/run-file` endpoint (Standard 129)
- [x] Security unit tests (`engine/tests/unit/security.test.ts`)
- [x] Document security standard (Standard 129)
- [x] SQL injection prevention (LIMIT clause parameterization) - Standard 130
- [x] Auth bypass audit on `/v1/test/*` endpoints - Standard 131
- [x] API key strength validation enhancement - Standard 132
- [x] Security documentation in README

### Phase: Documentation & Reproducibility (COMPLETED March 2026)
- [x] Benchmark suite with sample corpus generator
- [x] Benchmark protocol documentation (Standard 077)
- [x] STAR parameter tuning guide (Standard 078)
- [x] API contracts with request/response examples
- [x] Security hardening documentation
- [x] Architecture tradeoffs analysis
- [x] GitHub Actions benchmark workflow
- [x] Tag limiting implementation (Standard 121)
- [x] Physics Walker underflow fix (Standard 122)
- [x] Settings UI help text enhancements
- [x] Physics Walker Jest tests created
- [x] Path traversal prevention (Standard 129) - `dev/security/path-traversal`
- [x] SQL injection fix via parameterized LIMIT (Standard 130) - `dev/security/sql-injection`
- [x] Auth bypass audit complete (Standard 131) - `dev/security/auth-bypass-audit`
- [x] API key strength validation (Standard 132) - `dev/security/api-key-strength`
- [x] Security documentation in README

### Phase: Frictionless Experience (P0 - April 2026)
**Goal:** Zero-conf installation, automatic discovery, transparent operations

**P0 - Critical (Must complete before next release):**
- [ ] **Watchdog auto-enable** - Auto-start if `watcher.extra_paths` configured
  - Related: `FRICTIONLESS_SPEC.md` Section 1.2
  - Current: Manual start required from Settings UI
  
- [ ] **Startup banner with VERSION** - Display version from `user_settings.json`
  - Related: `FRICTIONLESS_SPEC.md` Section 1.3
  - Current: Hardcoded version in banner
  
- [ ] **Search returns content** - Return actual text in search results
  - Related: `FRICTIONLESS_SPEC.md` Section 4.1
  - Current: Returns metadata only, no content
  
- [ ] **MCP reads settings** - Auto-load API key from `user_settings.json`
  - Related: `FRICTIONLESS_SPEC.md` Section 5.1
  - Current: Requires env vars or manual config

**P1 - High Priority (Complete within 2 weeks):**
- [ ] **CLI commands** - `anchor start`, `anchor status`, `anchor search`
  - Related: `FRICTIONLESS_SPEC.md` Section 6.1
  - Current: Requires curl commands
  
- [ ] **Agent discovery** - Auto-detect Qwen, Claude, Cursor chat dirs
  - Related: `FRICTIONLESS_SPEC.md` Section 2.1
  - Current: Manual path configuration
  
- [ ] **Ingestion progress** - Real-time file-level stats
  - Related: `FRICTIONLESS_SPEC.md` Section 3.1
  - Current: Silent failures, no progress feedback
  
- [ ] **Debug endpoint** - Show why results filtered
  - Related: `FRICTIONLESS_SPEC.md` Section 4.2
  - Current: No debug info in responses

**P2 - Medium Priority (Backlog):**
- [ ] **Agent registration API** - `POST /v1/agent/register`
  - Related: `FRICTIONLESS_SPEC.md` Section 2.2
  - Current: Manual config via `user_settings.json`
  
- [ ] **Agent SDK** - `autoRegister: true` in client init
  - Related: `FRICTIONLESS_SPEC.md` Section 8.3
  - Current: Manual setup per agent

- [x] API key strength validation (Standard 132) - `dev/security/api-key-strength`
- [ ] Ablation study framework (pending execution)
- [ ] Cross-platform CI testing (pending)

### Phase: Agent Harness Integration (P1 - Q2 2026)
- [ ] OpenCLAW integration (primary target harness)
- [ ] Harness plugin system architecture
- [ ] Multi-harness performance monitoring
- [ ] API documentation for external developers

### Phase: Advanced RAG Features
- [ ] Backup & restore system (`POST /v1/backup`)
- [ ] Rolling context slicer (middle-out budgeting)
- [ ] Live context visualizer (RAG IDE)
- [ ] Provenance bias controls (Sovereign vs External)

### Phase: Memory & Performance Optimizations (Based on Rust Implementation Insights)
- [x] Zero-Copy Deduplication in Distillation (Standard 134)
  - [x] Tier 1 compound-level SHA-256 dedup before line processing
  - [x] Skip UTF-8 split + normalization for duplicate compounds
  - [x] Stats tracking: compoundsSkipped, compoundsTotal, tier1_skip_rate
  - [x] Documentation: specs/standards/134-zero-copy-dedup.md
- [ ] Pointer-Only Storage Pattern Implementation
  - [ ] Modify database schema to store only pointers (source_path, start_byte, end_byte)
  - [ ] Create mirrored_brain/ directory for content storage
  - [ ] Update ingestion pipeline to write content to filesystem and store pointers
  - [ ] Update search functionality to load content from filesystem using byte ranges
  - [ ] Implement content caching layer
- [ ] LRU Caching for Content
  - [ ] Integrate LRU cache library
  - [ ] Implement caching layer for content loaded from filesystem
  - [ ] Add cache invalidation mechanisms
- [ ] Memory Pressure Monitoring & Throttling
  - [ ] Add memory monitoring utilities
  - [ ] Implement throttling based on heap usage
  - [ ] Add emergency stop mechanisms
- [ ] Database Schema Optimization
  - [ ] Add proper indexes for pointer fields
  - [ ] Optimize FTS indexes for path-based search
  - [ ] Review and optimize table structures

### Phase: Code Analysis Enhancement
- [ ] AST pointer support for code files
  - [x] **AST parser made async** — `parseCodeStructure()` now uses dynamic `await import()` for tree-sitter modules; all callers and tests updated to use `await` ✅ COMPLETED (May 2026)
  - [ ] Test suite audit — 19/58 tests failing; see plan.md § Test Suite Audit for full breakdown
- [ ] Semantic code search ("find all functions calling X")
- [ ] Import/export graph edges
- [ ] Type-aware retrieval

---

## 📋 Backlog

### Short-Term (Q2 2026)
- [ ] Enhanced relationship narrative discovery
- [ ] Mobile application support
- [ ] Plugin marketplace architecture
- [ ] Diffusion-based reasoning models research

### Long-Term (Q3-Q4 2026)
- [ ] Federation protocol (P2P sync)
- [ ] Multi-model support
- [ ] Distributed processing across machines
- [ ] Enterprise security features

---

## Historical Phases (July 2025 - February 2026)

<details>
<summary><strong>Click to expand completed phases</strong></summary>

### Phase 24: Semantic Shift Architecture (Feb 2026) ✅
- [x] Semantic category system (#Relationship, #Narrative, #Technical)
- [x] Relationship discovery protocol
- [x] Stateless contextual chat
- [x] Molecule-atom architecture

### Phase 23: R1 Reasoning & UI Consolidation (Feb 2026) ✅
- [x] Multi-stage reasoning loop
- [x] UI simplification (glass panel design)
- [x] Stream alignment

### Phase 22: Browser Paradigm Implementation (Jan 2026) ✅
- [x] Hybrid Node.js/C++ architecture
- [x] PathManager for cross-platform compatibility
- [x] NativeModuleManager with fallbacks
- [x] Resource manager for memory optimization

### Phase 21: Native Module Acceleration (Jan 2026) ✅
- [x] Key Assassin (C++ text sanitization)
- [x] Atomizer (C++ text splitting)
- [x] Fingerprint (C++ SimHash)
- [x] 2.3x performance improvement

### Phase 20: Tag-Walker & Mirror 2.0 (Jan 2026) ✅
- [x] Tag-Walker protocol (replaces vector search)
- [x] Mirror 2.0 filesystem projection
- [x] FTS hardening

### Phase 19: Monorepo & Configuration (Jan 2026) ✅
- [x] PNPM workspace migration
- [x] Shared types package
- [x] Unified configuration (sovereign.yaml)
- [x] Lifecycle management

### Phase 18: Production Polish (Dec 2025) ✅
- [x] API fortification
- [x] Search resiliency
- [x] Verification suite (100% pass)
- [x] Streaming responses

### Phase 17: Cortex Upgrade (Dec 2025) ✅
- [x] Local inference (node-llama-cpp)
- [x] Multi-bucket schema
- [x] Dreamer service
- [x] PGlite hardening

### Phase 16: Node.js Monolith (Nov 2025) ✅
- [x] Migration from Python/Browser bridge
- [x] FTS optimization
- [x] Operational safety protocols
- [x] Snapshot portability

### Phase 15: Schema Evolution (Nov 2025) ✅
- [x] Epochal historian enhancement
- [x] Database schema updates
- [x] Path resolution fixes

### Phase 14: Epochal Historian (Oct 2025) ✅
- [x] Recursive decomposition
- [x] Mirror protocol enhancement
- [x] Watcher shield

### Phase 13: Markovian Reasoning (Oct 2025) ✅
- [x] Scribe service
- [x] Context weaving
- [x] Test suite
- [x] Benchmark tool

### Phase 12: Production Foundation (Sep 2025) ✅
- [x] Post-migration safety
- [x] API endpoints
- [x] Chat cockpit
- [x] One-click install

### Phase 11: Brain Link (Sep 2025) ✅
- [x] Schema introspection fix
- [x] FTS persistence
- [x] Chat UI overhaul
- [x] Streaming tokens

### Phase 10: PGlite Migration (Aug 2025) ✅
- [x] Database migration from CozoDB
- [x] Core tools creation
- [x] Model loading fixes

### Phase 1: Foundation (July 2025) ✅
- [x] Project inception
- [x] Initial architecture
- [x] Whitepaper development

</details>

---

## Task Priority Legend

| Priority | Description | Timeline |
|----------|-------------|----------|
| **P0** | Critical path - blocks other work | Current sprint |
| **P1** | Important but can parallelize | Next 2-4 weeks |
| **P2** | Nice to have | Backlog |

---

## Definition of Done

Tasks are complete when:
- ✅ Implementation complete and tested
- ✅ Documentation updated
- ✅ Standards created/updated if applicable
- ✅ Performance benchmarks met
- ✅ Code reviewed

---

**Full Task History:** See `specs/plan.md` for detailed 6-month timeline
**Standards:** See `specs/standards/` for architecture documentation

---

## 📁 Documentation Cleanup (April 2026)

**Goal:** Consolidate documentation into standard locations (docs/, specs/)

### Phase: Documentation Organization (P1 - April 2026)

- [ ] **MCP_AGENT_SETUP.md** - Move to `docs/integrations/mcp-agent.md`
  - Current: Root directory
  - Content: Automatic chat ingestion setup for AI agents
  - Related to: Watchdog (Standard 001), MCP (Standard 003)

- [ ] **PAIN_POINTS_DOCUMENTATION.md** - Move to `docs/guides/pain-points.md`
  - Current: Root directory
  - Content: Agent memory setup pain points (watchdog, database corruption)
  - Related to: Watchdog auto-enable (Standard 001), Database integrity

- [ ] **RECURSIVE_SEARCH_FALLBACKS.md** - Move to `docs/technical/search-strategy.md`
  - Current: Root directory
  - Content: Multi-layer recursive search fallback strategy
  - Related to: Search algorithm (STAR), Fallback mechanisms

- [ ] **.ai-instructions.md** - Move to `docs/development/ai-assistant.md`
  - Current: Root directory
  - Content: AI assistant rules for documentation creation
  - Related to: Documentation standards

