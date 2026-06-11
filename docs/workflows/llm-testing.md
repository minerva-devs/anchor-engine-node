# LLM Developer Testing Workflow

**Target audience:** LLM agents (local or hosted) that need to autonomously test the Anchor Engine project end-to-end.
**Minimum model:** 27B parameter (tested on Qwen 3.6 27B).
**Last updated:** June 11, 2026

---

## Copy-Paste Prompt Template

Use this prompt to direct a local 27B LLM agent through testing. Copy the entire block below.

```
You are a testing agent for the Anchor Engine project — a deterministic semantic
memory engine for local-first AI systems. The engine runs on Node.js, uses PGlite
for storage, and exposes an HTTP API on port 3160.

PROJECT PATH: C:\Users\rsbii\.qwenpaw\workspaces\P1\coding_projects\anchor-engine-node

YOUR TASK: Run the complete test suite, collect structured results from logs,
and report a summary with pass/fail counts, failures, and recommendations.

PHASE 1 — START THE ENGINE
  1. cd to the project path
  2. If engine/dist/index.js does not exist, run: pnpm build
  3. Start the engine in a separate terminal (background it):
     Windows: start "AnchorEngine" cmd /c "node --expose-gc engine/dist/index.js"
     Linux/Mac: node --expose-gc engine/dist/index.js &
     Or use: node scripts/start-engine-bg.mjs
  4. Wait up to 30 seconds for http://localhost:3160/health to return 200
  5. If the engine fails to start, report the error and STOP

PHASE 2 — RUN UNIT + INTEGRATION TESTS (Vitest)
  1. Run: npx vitest run --config engine/vitest.config.ts --reporter=verbose
  2. Capture STDOUT (the terminal output)
  3. Count total tests, passed, and failed from the Vitest summary line
  4. Record all failing test file paths and error messages

PHASE 3 — RUN LIVE-FIRE TESTS (HTTP / integration)
  1. Run: node engine/tests/live-fire/live-fire.mjs
  2. This script writes results to engine/tests/live-fire/live-fire.log and engine/tests/live-fire/results.json
  3. After it exits, read engine/tests/live-fire/live-fire.log
  4. Parse the log for PASS and FAIL lines
  5. Record: total pass count, total fail count, names of failing tests, error messages

PHASE 4 — RUN DENSITY PREFIX TESTS
  1. Send POST to http://localhost:3160/v1/memory/search with body:
     {"query":"density:"}
  2. Verify response contains "atom_density" and "tag_density" arrays
  3. Send POST to http://localhost:3160/v1/memory/search with body:
     {"query":"density:test"}
  4. Verify response contains "density_tier" key (light/medium/heavy)
  5. Send POST to http://localhost:3160/v1/memory/search with body:
     {"query":"density:contract,liability"}
  6. Verify response contains "terms" array with per-term density

PHASE 5 — COLLECT ENGINE LOGS
  1. Read the most recent log file from .anchor/logs/ (if it exists)
  2. Check for ERROR or WARN lines
  3. Count distinct error types

PHASE 6 — PRODUCE REPORT
  Produce a structured report in this exact format:

  ============================================================
  ANCHOR ENGINE TEST REPORT
  Date: <ISO timestamp>
  Server: http://localhost:3160
  ============================================================

  PHASE 2 — Vitest (Unit + Integration)
    Total: <N> | Passed: <N> | Failed: <N>
    Failures (if any):
      - <test file>: <error message>

  PHASE 3 — Live-Fire (HTTP Integration)
    Total: <N> | Passed: <N> | Failed: <N>
    Failures (if any):
      - <test name>: <error/reason>

  PHASE 4 — Density Prefix
    density:: <PASS/FAIL> — <atom_count atoms, tag_count tags>
    density:test: <PASS/FAIL> — tier=<density_tier>
    density:contract,liability: <PASS/FAIL> — <N> terms analyzed

  PHASE 5 — Engine Log Health
    Errors found: <N>
    Warnings found: <N>
    Distinct error types: <list>

  OVERALL VERDICT
    [ALL PASS | PARTIAL FAIL | CRITICAL FAIL]
    Recommendations: <bullet list>

  ============================================================
```

---

## How the Test Suite Works (for LLM agents)

### Engine Architecture

| Component | Port | Protocol | Purpose |
|-----------|------|----------|---------|
| Anchor Engine HTTP API | 3160 | HTTP REST | Search, ingest, distill, stats |
| MCP Server | 3161 (if enabled) | stdio/HTTP | Model Context Protocol tools |
| PGlite Database | in-process | WASM | Ephemeral SQL storage in `~/.anchor/` |
| Mirror Brain | filesystem | `~/.anchor/mirrored_brain/` | Pointer-only file cache |

### Test Tiers

| Tier | Framework | Command | What It Covers |
|------|-----------|---------|----------------|
| **Unit + Integration** | Vitest | `npx vitest run --config engine/vitest.config.ts` | Core logic, search algorithms, WASM modules, config validation |
| **Live-Fire** | Node.js (ESM) | `node engine/tests/live-fire/live-fire.mjs` | Real HTTP: health, molecules, atoms, search, ingestion, density prefix, live corpus, compounds migration (18 tests) |
| **Density Prefix** | curl/HTTP | `POST /v1/memory/search {"query":"density:..."}` | 3-tier RAG thresholds, multi-term analysis |
| **E2E UI** | Playwright | `npx playwright test` | Browser UI verification |

### Key API Endpoints for Testing

```
GET  /health                        → Server health check
GET  /v1/stats                      → Database stats (atom/molecule counts)
GET  /v1/molecules?limit=<N>        → List molecules with provenance
GET  /v1/atoms?limit=<N>            → List atoms with provenance
GET  /v1/compounds                  → Should return 404 (Standard 051 migration)
POST /v1/memory/search              → STAR search (accepts density:, deep:, distill: prefixes)
POST /v1/ingest                     → File ingestion pipeline
GET  /v1/distills                   → List distillation results
POST /v1/distillation/radial        → Radial distillation query
```

### Log File Locations

| Log | Path | Format |
|-----|------|--------|
| Live-fire test results | `engine/tests/live-fire/live-fire.log` | Timestamped plain text |
| Live-fire structured | `engine/tests/live-fire/results.json` | JSON summary |
| Engine runtime logs | `.anchor/logs/anchor_engine.log` | Winston daily rotate |
| Vitest output | STDOUT (no file) | Vitest reporter |

---

## Common Failure Patterns (LLM agent should check)

### 1. Engine Won't Start
- **Port 3160 in use** → Kill existing process with `netstat -ano | findstr :3160` then `taskkill /PID <PID> /F`
- **No build** → Run `pnpm build` first
- **Node version** → Requires Node 18+

### 2. All Tests Fail
- Engine didn't start → Check `http://localhost:3160/health` manually
- Wrong directory → Confirm `engine/dist/index.js` exists

### 3. Ingestion Tests Fail
- Database was wiped (ephemeral design) → Re-ingest data
- Missing `~/.anchor/` directory permissions

### 4. Density Tests Return Empty
- No data ingested → Run ingestion pipeline first (watchdog or manual ingest)
- Empty database → Check `GET /v1/stats` for atom/molecule counts

### 5. Provenance/Schema Tests Fail
- Pre-migration database → May need full rebuild
- Standard 051 migration not applied

---

## Expected Output Formats (for parsing)

### Vitest Summary (Phase 2)
```
 Test Files  15 passed (15)
      Tests  127 passed (127)
   Start at  10:23:45
   Duration  4.21s
```

### Live-Fire Log (Phase 3)
```
[2026-06-11T10:24:01.000Z] === Live-Fire Test Suite ===
[2026-06-11T10:24:01.000Z] Running: Server health check...
[2026-06-11T10:24:01.042Z] ✓ [Server health check]
[2026-06-11T10:24:02.000Z] Running: Molecules list API...
[2026-06-11T10:24:02.125Z] ✗ [Molecules list API]: Missing provenance
```

### Density Response (Phase 4)
```json
{
  "term": "contract",
  "atom_count": 47,
  "tag_count": 12,
  "density_tier": "medium",
  "total_hits": 59,
  "recommendation": "Medium-density: balanced retrieval recommended."
}
```

---

## Testing Data (for LLM agents that need to ingest)

If the database is empty and you need test data to exercise the pipeline, ingest these sample documents:

**Sample 1: Legal Contract (for density:contract testing)**
```
POST /v1/ingest
Content-Type: application/json

{
  "title": "Master Services Agreement",
  "content": "This Master Services Agreement governs the relationship between Contractor and Client. The Contractor agrees to provide services as specified in the Statement of Work. All deliverables shall be subject to review and acceptance by Client. Either party may terminate this Agreement with 30 days written notice. The Contractor warrants that all work shall be performed in a professional manner.",
  "source": "contracts/msa-2026.md",
  "bucket": "notebook"
}
```

**Sample 2: Technical Documentation (for search testing)**
```
POST /v1/ingest
Content-Type: application/json

{
  "title": "Anchor Engine Architecture",
  "content": "The STAR algorithm uses temporal decay and graph traversal for semantic retrieval. Unlike vector embeddings, STAR produces deterministic results by following explicit graph edges. The PGlite database stores atoms and molecules with provenance tracking. Compression is achieved through content-based deduplication using MD5 fingerprinting.",
  "source": "docs/architecture.md",
  "bucket": "notebook"
}
```

---

## Quick Reference Commands

```bash
# Essential startup sequence (the LLM agent MUST follow this order)
cd C:\Users\rsbii\.qwenpaw\workspaces\P1\coding_projects\anchor-engine-node
pnpm install
pnpm build
# Windows: start a new terminal or use:
node scripts/start-engine-bg.mjs

# Wait for engine, then test
curl http://localhost:3160/health
npx vitest run --config engine/vitest.config.ts --reporter=verbose
node engine/tests/live-fire/live-fire.mjs

# Density prefix tests
curl -X POST http://localhost:3160/v1/memory/search -H "Content-Type: application/json" -d "{\"query\":\"density:\"}"
curl -X POST http://localhost:3160/v1/memory/search -H "Content-Type: application/json" -d "{\"query\":\"density:contract\"}"

# Check logs
type .anchor\logs\anchor_engine.log | findstr /i "error warn"
type engine\tests\live-fire\live-fire.log
```
