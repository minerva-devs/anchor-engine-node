# Anchor Engine - Current Tasks

**Last Updated:** May 10, 2026 | **Current Sprint:** v5.0.0 + v5.1.0 Prep

---

## 🎯 Completed (v5.0.0 — May 2026)

### Streaming Architecture
- [x] **Streaming Search** (`/v1/memory/search/stream`) - SSE-based, progressive results, 60% lower peak memory ✅ DONE
- [x] **Streaming Ingest** (`/v1/ingest/streaming`) - Large file processing in 1MB chunks with progress tracking ✅ DONE

### Validation Framework
- [x] **Zod Validation Schemas** - Centralized schemas in `engine/src/config/index.ts` (645 lines) ✅ DONE
- [x] **PostgreSQL Array Conversion** - `toPgArray` helper for proper DB format ✅ DONE
- [x] **API Route Map** - Complete documentation in `specs/API-ROUTE-MAP.md` ✅ DONE

### Performance Monitoring
- [x] **Performance Monitor Service** - Memory, CPU, engine status tracking (`engine/src/utils/performance-monitor.ts`) ✅ DONE
- [x] **UI Stats Dashboard** - Real-time system metrics display ✅ DONE
- [x] **DB Clearing & Distill Output** - Clean state management ✅ DONE
- [x] **Runtime Data Consolidation** - All paths route to `~/.anchor/` via `engine/src/config/paths.ts` ✅ DONE

### Security Hardening (April 2026)
- [x] Path traversal prevention utility (`engine/src/utils/security.ts`) ✅ DONE
- [x] Fix `/v1/system/paths` endpoint (Standard 025) ✅ DONE
- [x] Fix `/v1/system/explorer` endpoint (Standard 025) ✅ DONE
- [x] Fix `/v1/test/run-file` endpoint (Standard 025) ✅ DONE
- [x] Security unit tests (`engine/tests/unit/security.test.ts`) ✅ DONE
- [x] SQL injection prevention (LIMIT clause parameterization) - Standard 130 ✅ DONE
- [x] Auth bypass audit on `/v1/test/*` endpoints - Standard 023 ✅ DONE
- [x] API key strength validation enhancement - Standard 024 ✅ DONE

### Frictionless Experience (April 2026)
- [x] Project consolidation ✅ DONE
- [x] README updates with consolidated documentation ✅ DONE
- [x] Standards alignment - Unified numbering (001-029) ✅ DONE
- [x] Spec updates in plan.md and spec.md ✅ DONE

### Test Suite Stabilization (May 2026)
- [x] Vitest migration complete ✅ DONE
- [x] 100% pass rate achieved ✅ DONE
- [x] Test consolidation under `engine/tests/` ✅ DONE

---

## 🔧 In Progress (v5.1.0 — May 2026)

### P0 — Integration Test Suite (CRITICAL)
**Goal:** End-to-end testing for core functionality

- [ ] **`engine/tests/integration/search-pipeline.test.ts`** - Full search flow, deduplication, tag filtering
- [ ] **`engine/tests/integration/radial-distiller.test.ts`** - Line dedup, memory safety, output generation
- [ ] **`engine/tests/integration/mcp-server.test.ts`** - Tool execution, rate limiting, security settings
- [ ] **`engine/tests/integration/memory-pressure.test.ts`** - Adaptive concurrency, throttling, GC management

### P1 — Failure Tracking & Circuit Breaker
**Goal:** Automatic degradation when services fail

- [ ] **FailureTracker Service** - Track failures by operation/error code with circuit breaker
- [ ] **Circuit Breaker Integration** - Auto-open after N failures, half-open recovery

### P2 — Tag Sanitization at Write Time
**Goal:** Clean tags stored in database (not just returned)

- [ ] **Update Ingestion Pipeline** - `ingest-atomic.ts` sanitize atom/molecule tags on write
- [ ] **Update Search Enrichment** - Sanitize enriched tags before returning results

### P3 — WASM Health Check + Fallbacks
**Goal:** Graceful degradation when WASM unavailable

- [ ] **Startup Health Check Integration** - Auto-run on engine start, log warnings

---

## ✅ Completed (May 2026) — Test Consolidation & Housekeeping

### P0 — Test File Consolidation ✅ DONE
- [x] **Consolidate test files** — All tests under `engine/tests/` as `.test.ts` files
- [x] **Simplify `package.json` test scripts** — `pnpm test`, `pnpm test:unit`, `pnpm test:integration`, `pnpm test:bench`
- [x] **Fix remaining failing tests** — 100% pass rate achieved

### P1 — Runtime Data Cleanup ✅ DONE
- [x] **Verify `~/.anchor/` path configured** — All paths resolve via `engine/src/config/paths.ts`
- [x] **Update `.gitignore`** — `~/.anchor/` excluded, project-local runtime data excluded
- [x] **Clean up stale data** — All 16 stale directories inside `engine/` removed

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

## ✅ Completed (February 2026)

### Phase: Production Ready
- [x] Whitepaper implementation complete
- [x] All architecture standards documented
- [x] 100MB+ production data ingested (436 files)
- [x] ~280,000 molecules processed
- [x] ~1,500 atoms indexed
- [x] Performance benchmarks verified
- [x] Documentation streamlined

---

## 🎯 Current Focus

### Phase: v5.0.0 Streaming & Observability (COMPLETED — May 2026)
**Goal:** Memory-efficient streaming, centralized validation, observability infrastructure

All v5.0.0 tasks completed. Moving to v5.1.0 prep.

### Phase: v5.1.0 Prep (CURRENT — May 2026)
**Goal:** Production reliability through integration tests and failure tracking

See **In Progress** section above for detailed task list.

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

### Phase: Semantic Shift Architecture (Feb 2026) ✅
- [x] Semantic category system (#Relationship, #Narrative, #Technical)
- [x] Relationship discovery protocol
- [x] Stateless contextual chat
- [x] Molecule-atom architecture

### Phase: R1 Reasoning & UI Consolidation (Feb 2026) ✅
- [x] Multi-stage reasoning loop
- [x] UI simplification (glass panel design)
- [x] Stream alignment

### Phase: Browser Paradigm Implementation (Jan 2026) ✅
- [x] Hybrid Node.js/C++ architecture
- [x] PathManager for cross-platform compatibility
- [x] NativeModuleManager with fallbacks
- [x] Resource manager for memory optimization

### Phase: Native Module Acceleration (Jan 2026) ✅
- [x] Key Assassin (C++ text sanitization)
- [x] Atomizer (C++ text splitting)
- [x] Fingerprint (C++ SimHash)
- [x] 2.3x performance improvement

### Phase: Tag-Walker & Mirror 2.0 (Jan 2026) ✅
- [x] Tag-Walker protocol (replaces vector search)
- [x] Mirror 2.0 filesystem projection
- [x] FTS hardening

### Phase: Monorepo & Configuration (Jan 2026) ✅
- [x] PNPM workspace migration
- [x] Shared types package
- [x] Unified configuration (sovereign.yaml)
- [x] Lifecycle management

### Phase: Production Polish (Dec 2025) ✅
- [x] API fortification
- [x] Search resiliency
- [x] Verification suite (100% pass)
- [x] Streaming responses

### Phase: Cortex Upgrade (Dec 2025) ✅
- [x] Local inference (node-llama-cpp)
- [x] Multi-bucket schema
- [x] Dreamer service
- [x] PGlite hardening

### Phase: Node.js Monolith (Nov 2025) ✅
- [x] Migration from Python/Browser bridge
- [x] FTS optimization
- [x] Operational safety protocols
- [x] Snapshot portability

### Phase: Schema Evolution (Nov 2025) ✅
- [x] Epochal historian enhancement
- [x] Database schema updates
- [x] Path resolution fixes

### Phase: Epochal Historian (Oct 2025) ✅
- [x] Recursive decomposition
- [x] Mirror protocol enhancement
- [x] Watcher shield

### Phase: Markovian Reasoning (Oct 2025) ✅
- [x] Scribe service
- [x] Context weaving
- [x] Test suite
- [x] Benchmark tool

### Phase: Production Foundation (Sep 2025) ✅
- [x] Post-migration safety
- [x] API endpoints
- [x] Chat cockpit
- [x] One-click install

### Phase: Brain Link (Sep 2025) ✅
- [x] Schema introspection fix
- [x] FTS persistence
- [x] Chat UI overhaul
- [x] Streaming tokens

### Phase: PGlite Migration (Aug 2025) ✅
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

**Full Task History:** See `specs/plan.md` for detailed timeline
**Standards:** See `specs/current-standards/` for architecture documentation
