# Anchor Engine System Structure

## Architecture Overview

```mermaid
graph TB
    subgraph Frontend
        A[Dashboard UI] --> B[Search Page]
        A --> C[Settings Page]
        A --> D[Quarantine Page]
        A --> E[Test Suite Page]
    end
    
    subgraph Backend_API["Backend API (Express.js :3160)"]
        B --> F[/v1/memory/search]
        B --> G[/v1/memory/distill]
        B --> H[/v1/ingest]
        A --> I[/v1/files/read]
        A --> J[/v1/files/upload]
        D --> K[/v1/quarantine]
    end
    
    subgraph Engine_Core["Engine Core (STAR Algorithm)"]
        F --> L[STAR Search<br/>Tag-Walker Graph]
        L --> M[(PGlite<br/>WASM PostgreSQL)]
        G --> N[Radial Distiller v2]
        H --> O[Git Cloner]
        H --> P[AST Parser<br/>web-tree-sitter WASM]
    end
    
    subgraph Storage["Storage Layer"]
        M --> Q[~/.anchor/context_data/<br/>Disposable Index]
        L --> R[~/.anchor/mirrored_brain/<br/>Source of Truth]
    end
```

## Web Dashboard

**Location:** `engine/public/index.html`

**Tech Stack:**
- React 18.3.1 (CDN)
- ReactDOM 18.3.1 (CDN)
- Babel 7.26.0 (CDN, for JSX)
- TailwindCSS 3.4 (CDN)
- Lucide Icons
- js-yaml 4.1.0

**Entry Point:** Single-file HTML with embedded React components

**How to Run Locally:**

1. Build the engine:
   ```bash
   pnpm build
   ```

2. Start the engine with HTTP server:
   ```bash
   pnpm dev
   # or
   node src/index.ts
   ```

3. Open browser at: `http://localhost:3160`

**Available Routes:**

| Route | Description | API Endpoints |
|-------|-------------|---------------|
| `/` | Homepage with status | Health check, status |
| `/search` | Main search interface | `GET /v1/search` |
| `/settings` | Configuration page | `POST /v1/settings`, `GET /v1/settings` |
| `/quarantine` | Quarantined files | `GET /v1/quarantine`, `POST /v1/quarantine/unquarantine` |
| `/test` | Test suite runner | `POST /v1/test/run` |

**UI Components:**

- **Homepage:** Status indicator, utility buttons (Web Research, GitHub Ingestion, Quarantine, Settings, Test Suite)
- **Search Page:** Query input, results list with pagination, YAML export
- **Settings Page:** API key input, data paths, search preferences
- **Quarantine Page:** List of quarantined files with unquarantine options
- **Test Suite Page:** Test execution interface with result display

**Build Commands:**
- None required - single-file HTML
- Browser caches are invalidated with cache-busting timestamps

**Environment Variables Required:**
- `ANCHOR_API_KEY` (optional, for authenticated API calls)
- `API_URL` (defaults to `http://localhost:3160/v1`)

---

## Engine Core

**Location:** `engine/src/`

**Main Entry:** `engine/src/index.js`

**Build Command:**
```bash
pnpm build
# Compiles TypeScript to JavaScript in dist/
```

**Core Modules:**

| Module | Purpose | Files |
|--------|---------|-------|
| Context Engine | Core reasoning loop | `src/context/`, `src/index.js` |
| Vector DB | PGlite in-memory vector store | `src/vector/` |
| Knowledge Graph | Entity resolution & graph | `src/graph/` |
| Distillation | Summarization & extraction | `src/distillation/` |
| Git Cloner | Repository cloning & parsing | `src/git/` |
| File System | Document management | `src/files/` |

---

## Testing Suite

### Integration Tests

**Location:** `engine/tests/`

**Types:**

| Type | Files | Purpose | Run Command |
|------|-------|---------|-------------|
| **Smoke (P0)** | `integration/*.test.ts` | Fast API tests (circuit breakers, search pipeline, distiller) | `pnpm test:vitest run integration --reporter=verbose` |
| **Live Fire (E2E)** | `integration/live-fire/*.ts` | Full workflow with server spawn, git clone, ingestion | `pnpm test:vitest run integration/live-fire --reporter=verbose` |
| **A/B Testing** | `integration/github-history-search.vitest.ts` | In-memory FTS algorithm validation | `pnpm test:vitest run integration/github-history-search --reporter=verbose` |

**Environment Variables:**
- `ANCHOR_API_KEY` - API key for authenticated tests
- `GITHUB_TOKEN` - GitHub token for cloning
- `NODE_EXE` - Node executable path
- `API_URL` - Engine API URL (default: `http://localhost:3160/v1`)

### E2E UI Tests

**Location:** `tests/e2e/`

| File | Purpose |
|------|---------|
| `github-clone-e2e.test.ts` | Full GitHub clone workflow: verify repo exists → clone via API → verify structure |
| `ui-verification.test.ts` | Browser automation tests for UI navigation and interactions |

**Test Coverage:**
- ✅ Repository cloning via API
- ✅ Search pipeline end-to-end
- ✅ Distillation results
- ✅ UI navigation (homepage, search, settings)
- ❓ Settings page field verification (incomplete)

### Unit Tests

**Location:** `tests/unit/`

Run: `pnpm test:unit`

---

## Document Generation

| Type | Location | Purpose |
|------|----------|---------|
| `DOCS/STRUCTURE.md` | This file | System architecture and navigation |
| `engine/tests/README.md` | `engine/tests/README.md` | Integration test documentation |
| `MISSIONS/*` | `missions/` | Active mission configurations |

---

## Quick Reference

| Task | Command |
|------|---------|
| Start engine | `pnpm dev` |
| Run all tests | `pnpm test` |
| Run integration tests | `pnpm test:vitest run integration` |
| Build production | `pnpm build` |
| Open dashboard | `pnpm dev` → `http://localhost:3160` |

**API Base URL:** `http://localhost:3160/v1`

**Dashboard:** `http://localhost:3160`

---

## Test Coverage Gap Analysis

| Category | API Tests | UI Tests | Gap | User Impact |
|----------|-----------|----------|-----|-------------|
| Search | ✅ 100% | ❌ 40% | High | Core feature |
| Ingestion | ✅ 100% | ❌ 20% | High | Primary use case |
| Distillation | ✅ 80% | ❌ 30% | High | Key workflow |
| Settings | ⚠️ 50% | ❌ 60% | Medium | Configuration |
| Error Handling | ❌ 10% | ❌ 5% | Critical | Production safety |

### Detailed Gap Analysis

#### 1. Search Functionality
**UI Components:** Search input, results list, pagination, filter controls, YAML export
**Test Coverage:** Basic search (GET /v1/search) ✅, Result display ✅, Pagination ⚠️ (API only), YAML export ❌
**Gap Priority:** High
**Missing Tests:** User types search query → sees results, User clicks pagination → results update, User clicks "Export YAML" → file downloads

#### 2. Ingestion Workflow
**UI Components:** File upload/drop zone, Paste & Ingest, GitHub clone button, progress indicator
**Test Coverage:** GitHub clone API ✅, File ingestion API ✅, File listing API ✅, Upload UI ❌
**Gap Priority:** High
**Missing Tests:** User drags file to drop zone → file ingests, User pastes text → text appears in search

#### 3. Settings & Configuration
**UI Components:** API key input, data path configuration, search preferences, theme selection
**Test Coverage:** Navigation to settings page ✅, Field existence check ⚠️, Field validation ❌
**Gap Priority:** Medium
**Missing Tests:** User enters API key → saves and authenticates, Settings persist after page refresh

#### 4. Error States & Edge Cases
**Error Scenarios:** Network timeout, Invalid API key (401), Rate limited (429), Server error (500)
**Test Coverage:** Network timeout ❌, 401 Authentication failure ❌, 429 Rate limit ❌, 500 Server error ⚠️
**Gap Priority:** Critical
**Missing Tests:** User experiences timeout → retry button appears, User enters invalid API key → "Authentication failed" with help text

#### 5. Performance & Load Testing
**Scenarios:** Large file upload (100MB+), Concurrent search requests, Memory pressure
**Test Coverage:** Basic search latency ⚠️ (API only), Large file handling ❌, Concurrent requests ❌
**Gap Priority:** Medium
**Missing Tests:** Upload 100MB file → completes within timeout, 10 concurrent searches → all complete successfully

#### 6. Authentication & Security
**Features:** API key authentication, GitHub token handling, File quarantine, Access control
**Test Coverage:** API key validation ❌, GitHub token ⚠️ (integration only), Quarantine page ❌
**Gap Priority:** High
**Missing Tests:** User enters API key → authenticated session starts, File triggers quarantine → moves to quarantine page

---

### Test Files Status

| Test File | UI Tests | API Tests | Last Updated |
|-----------|----------|-----------|--------------|
| `tests/e2e/ui-verification.test.ts` | ⚠️ 30% | ❌ | 2026-05-23 |
| `tests/e2e/github-clone-e2e.test.ts` | ❌ | ✅ 100% | 2026-05-23 |
| `engine/tests/integration/live-fire.test.ts` | ❌ | ✅ 80% | 2026-05-23 |
| `engine/tests/integration/search-pipeline.test.ts` | ❌ | ✅ 100% | 2026-05-23 |
| `engine/tests/integration/distillation-results.test.ts` | ❌ | ✅ 80% | 2026-05-23 |
| `engine/tests/integration/github-clone.test.ts` | ❌ | ✅ 100% | 2026-05-23 |

### Priority Matrix

**🔴 Critical (Fix in Next Sprint):**
1. Error states - 401, 404, 500 handling missing from UI tests
2. YAML export - Core deliverable workflow untested
3. Pagination - Critical search feature only API-tested

**🟠 High (Fix Before Production Release):**
1. Large file uploads - Performance risk for core workflow
2. Authentication flow - Security gap for API key handling
3. Settings validation - Poor UX when settings invalid

**🟡 Medium (Fix in Q3 2026):**
1. Filter controls - Advanced search not tested
2. Quarantine page - Security feature needs coverage
3. Concurrent requests - Production load simulation

---

### Recommendations

**Immediate Actions:**
1. Add YAML export test to `ui-verification.test.ts`
2. Add pagination test for search results
3. Add 401/404 error handling tests
4. Add large file upload test

**Short-term (Next 2 Sprints):**
1. Build comprehensive settings test suite
2. Add authentication flow tests
3. Implement quarantine page tests
4. Add performance/load tests

**Long-term (Q3 2026):**
1. Visual regression testing
2. Accessibility testing
3. Cross-browser testing
4. Mobile responsiveness