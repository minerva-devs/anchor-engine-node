# Anchor Engine Standards Reference

Quick reference for all active standards. Full specifications are in `specs/current-standards/`.

## Active Standards Index

| ID | Title | Purpose |
|----|-------|---------|
| [001](../specs/current-standards/001-memory-safe-ingestion.md) | Memory-Safe File Ingestion | Prevent OOM crashes from large files |
| [002](../specs/current-standards/002-reproducible-benchmarking.md) | Reproducible Benchmarking | Consistent performance measurement |
| [003](../specs/current-standards/003-mcp-tool-interface.md) | MCP Tool Interface | Model Context Protocol integration |
| [004](../specs/current-standards/004-streaming-search.md) | Streaming Search | Real-time search results |
| [005](../specs/current-standards/005-adaptive-concurrency-control.md) | Adaptive Concurrency | Memory-aware parallelism |
| [006](../specs/current-standards/006-mobile-search-optimization.md) | Mobile Search Optimization | Phone-friendly search |
| [007](../specs/current-standards/007-pglite-memory-optimization.md) | PGlite Memory Optimization | Database memory limits |
| [008](../specs/current-standards/008-radial-distillation.md) | Radial Distillation | Knowledge compression |
| [009](../specs/current-standards/009-illuminate-bfs-traversal.md) | Illuminate BFS Traversal | Graph exploration |
| [010](../specs/current-standards/010-radial-distillation-v2.md) | Radial Distillation v2 | Enhanced distillation |
| [011](../specs/current-standards/011-security-hardening.md) | Security Hardening | Auth, path validation, rate limiting |
| [012](../specs/current-standards/012-data-integrity.md) | Data Integrity | Database wipe, transaction safety, operation state machine |
| [013](../specs/current-standards/013-wasm-fallback.md) | WASM Module Fallbacks | Graceful degradation |
| [014](../specs/current-standards/014-operational-visibility.md) | Operational Visibility | Startup banner, health, progress |
| [015](../specs/current-standards/015-configuration-management.md) | Configuration Management | Path constants, settings hierarchy |
| [016](../specs/current-standards/016-mcp-integration-testing.md) | MCP Integration Testing | Integration tests, graceful degradation |
| [017](../specs/current-standards/017-dependency-validation.md) | Dependency Validation | deps vs devDeps, pre-publish checks |
| [018](../specs/current-standards/018-configuration-validation.md) | Configuration Validation | Fail fast, startup checks |
| [020](../specs/current-standards/020-ephemeral-database.md) | Ephemeral Database | Always wipe DB on startup, rebuild from inbox |

---

## Quick Reference: Pain Points & Standards

### Security (Standard 011)

| Pain Point | Fix | Code Pattern |
|------------|-----|--------------|
| Hardcoded API key | Fail fast if not configured | `if (!apiKey) process.exit(1)` |
| Path traversal | Validate absolute paths | `path.isAbsolute(resolved)` |
| No rate limiting | 10 req/min on ingest | `express-rate-limit` |

### Data Integrity (Standard 012)

| Pain Point | Fix | Code Pattern |
|------------|-----|--------------|
| DB corruption | Wipe on startup | `fs.rmSync(dbPath, {recursive: true})` |
| Transaction conflicts | Check before heavy ops | `if (isIngesting()) return 503` |
| Silent write failures | Verify row count | `if (rowCount !== expected) log error` |

### WASM Modules (Standard 013)

| Pain Point | Fix | Code Pattern |
|------------|-----|--------------|
| Module not found | Use `import.meta.resolve` | `import(import.meta.resolve(pkg))` |
| Missing deps | Move to `dependencies` | Check `package.json` |
| Engine crash | JS fallbacks | `catch { fn = fallbackFn }` |

### Operations (Standard 014)

| Pain Point | Fix | Code Pattern |
|------------|-----|--------------|
| Silent startup | Print banner | Startup banner with status |
| No health check | `/health` endpoint | `GET /health → 200/503` |
| No progress | `/v1/ingest/status` | `{active, currentFile, progress}` |

### Configuration (Standard 015)

| Pain Point | Fix | Code Pattern |
|------------|-----|--------------|
| Duplicate paths | Single `PATHS` constant | `import { PATHS } from config` |
| `process.cwd()` | Use PATHS | Never use `process.cwd()` |
| Manual enable | Auto-enable logic | `if (paths.length) start()` |

### MCP Integration (Standard 016)

| Pain Point | Fix | Code Pattern |
|------------|-----|--------------|
| Port mismatch | Use engine port from settings | `ANCHOR_API_URL = settings.server.port` |
| Path resolution | Go up 2 levels from dist/ | `join(__dirname, '..', '..')` |
| Engine unavailable | Graceful degradation | Return error message, don't crash |
| No visibility | Log API calls | `console.error('[MCP] Calling:', url)` |

### Dependency Validation (Standard 017)

| Pain Point | Fix | Code Pattern |
|------------|-----|--------------|
| Missing deps | Validate before publish | `npm run validate:deps` |
| WASM in devDeps | Move to dependencies | Check `package.json` |
| npm install fails | Test with `npm pack` | Smoke test packed tarball |

### Configuration Validation (Standard 018)

| Pain Point | Fix | Code Pattern |
|------------|-----|--------------|
| Missing API key | Fail fast at startup | `if (!apiKey) process.exit(1)` |
| Port in use | Check before bind | `isPortAvailable(port)` |
| Path not writable | Test write access | `fs.writeFileSync(testFile)` |
| Insecure defaults | Warn on startup | Show warnings in banner |

### Ephemeral Database (Standard 020)

| Pain Point | Fix | Code Pattern |
|------------|-----|--------------|
| Database corruption | Wipe on every startup | `wipe_on_startup: true` (default) |
| Hanging ingestion | Force kill + restart | `pkill -9 -f "anchor-engine" && pnpm start` |
| Corrupted mirrored_brain | Clear on startup | `fs.rmSync(mirroredBrainPath, {recursive: true})` |
| Data loss fear | inbox/ is source of truth | Never delete inbox/ files |

---

## Commit Reference

Standards derived from these key commits:

| Commit | Date | Standards Created |
|--------|------|-------------------|
| `035ce82` | 2026-03-21 | SEC-001 (No default credentials) |
| `7ef1bd1` | 2026-03-20 | SEC-002, SEC-003 (Path validation, rate limiting) |
| `b2cdb89` | 2026-03-22 | DATA-001, DEPS-002 (DB wipe, WASM fallbacks) |
| `3afec1d` | 2026-03-19 | DATA-002 (Transaction conflicts) |
| `f4c9cc3` | 2026-03-18 | DEPS-003 (ESM resolution) |
| `a1b1a3f` | 2026-03-17 | CONF-001, CONF-004 (Path constants) |
| `dc072f9` | 2026-03-16 | OPS-001, CONF-003 (Startup banner, auto-enable) |
| `bbc7d04` | 2026-03-15 | OPS-003, OPS-004 (Progress, agent discovery) |

---

## Archived Standards

Historical standards are preserved in `specs/archive-standards/history/`. These document the evolution of the codebase but are not actively maintained.