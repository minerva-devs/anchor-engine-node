# Anchor Engine - Project Context for AI Agents

## Project Overview

**Anchor Engine** is a deterministic semantic memory system for LLMs — a local-first knowledge graph and context engine that runs on Node.js with PGlite (WASM-based PostgreSQL). It provides content ingestion, STAR algorithm search, radial distillation, and watchdog file watching. The project is at version 5.0.0+ with 31 active architecture standards documented in `specs/current-standards/`.

**Purpose:** Acts as a "context engine" — ingests files/documents, builds a searchable knowledge graph, compresses knowledge via distillation, and serves relevant context to LLMs during inference. Think of it as a local RAG (Retrieval-Augmented Generation) system with graph traversal capabilities.

**Key Technologies:**
- **Runtime:** Node.js 18+ (ES Modules), TypeScript
- **Database:** PGlite (WASM PostgreSQL) — disposable index, pointer-only storage in `~/.anchor/mirrored_brain/` filesystem
- **Server:** Express.js with Zod validation schemas
- **NLP:** Wink NLP + English web model for entity recognition; custom STAR semantic search algorithm
- **Search:** Physics-inspired graph traversal (70/30 Planets/Moons ratio)
- **WASM Modules:** Rust-compiled WebAssembly packages (`anchor-atomizer-wasm`, `anchor-fingerprint-wasm`, `anchor-keyextract-wasm`, `anchor-tagwalker-wasm`) for atomization, fingerprinting, key extraction, and tag traversal — zero native compilation needed
- **Testing:** Vitest (primary), Jest (legacy, migrating)

**Architecture Pattern:** Source-of-truth is the filesystem (`~/.anchor/inbox/` + `~/.anchor/mirrored_brain/`). The PGlite database is a disposable index/cache rebuilt on every startup. Derived data (synonyms, tag audits, mirrors) is regenerated from source of truth on boot.

## Directory Structure

```
anchor-engine-node/
├── engine/src/              # Core engine — main codebase
│   ├── core/                 # Database layer (db.ts), batch processing, vector ops
│   ├── config/               # Configuration management (Zod schemas)
│   ├── routes/v1/            # REST API endpoints (memory, ingest, search, tags, system)
│   ├── services/             # Business logic: ingestion, search, distillation, tags, mirror
│   ├── middleware/            # Auth, validation, request tracing
│   ├── utils/                 # Path management, structured logging, resource management
│   └── types/                 # TypeScript type definitions
├── specs/                     # Architecture standards and specifications
│   ├── current-standards/      # 31 active standards (001–031)
│   ├── spec.md                 # Master specification document
│   ├── tasks.md                # Task tracking
│   └── plan.md                 # Project roadmap
├── skills/                    # Agent skill definitions (17+ skills)
├── docs/                      # Documentation (whitepaper, API docs, INDEX)
├── tests/                     # Integration + unit test suites
├── mcp-server/                # Model Context Protocol server
├── .anchor/                   # User data directory (auto-created on install)
│   ├── inbox/                  # Source of truth — files to ingest
│   ├── mirrored_brain/         # Derived knowledge graph state
│   ├── notebook/               # Distillation output, tag audits
│   └── user_settings.json      # Configuration file
├── package.json               # Root workspace config (pnpm monorepo)
└── AGENTS.md / HEARTBEAT.md    # Agent behavioral guidelines
```

## Building and Running

### Prerequisites
- Node.js >= 18.0.0
- pnpm package manager

### Setup & Install
```bash
pnpm install          # Installs deps, runs postinstall (setup-user-config + build)
# The .anchor directory is auto-created with proper structure
```

### Start the Engine
```bash
pnpm start            # Starts Express server on port 3160
# or: node --expose-gc engine/dist/index.js
```

### Development Mode
```bash
pnpm dev              # Hot-reload development mode (ts-node)
pnpm build:engine      # Build TypeScript to dist/
pnpm build:all         # Full workspace build
```

### Testing
```bash
pnpm test              # Run all tests via run-tests-with-logger.js
pnpm test:vitest        # Vitest test suite
pnpm test:unit          # Unit tests only
pnpm test:integration    # Integration tests only
pnpm live-fire          # Live-fire test suite (P1–P6 phases)
```

### Other Commands
```bash
pnpm lint               # ESLint check
pnpm run setup-user-config   # Manually re-run config setup
pnpm clean              # Remove dist/ directories
```

## Development Conventions

### Configuration Management
- All config validated via Zod schemas (`engine/src/config/schema.ts`)
- `user_settings.json` generated from template on install — controls server port, API key, search parameters, watchdog settings
- Path management centralized in `config/paths.ts` and `utils/path-manager.js`

### Database Architecture (Standard 051)
- **Pointer-only storage:** PGlite stores pointers/references to filesystem content, not raw content
- Source of truth: `~/.anchor/mirrored_brain/` filesystem directory
- Database is disposable — wiped on shutdown if configured (`database.wipe_on_shutdown=true`)
- Derived data (synonyms, tag audits) regenerated from inbox/ on every startup

### API Design
- RESTful endpoints under `/v1/*` with Zod validation on all inputs
- Rate limiting: 100 req/min general, 20 req/min for ingest operations
- API key required (32–128 chars mixed case+digit OR 64+ char hex)
- JSON error contracts standardized across all endpoints

### Testing Strategy
- **Vitest** is primary test framework (Jest legacy being migrated)
- Test ordering: hardest→easiest (P0→P4) — stress-test first
- P0 tests are critical path verification (<5 min execution time)
- Live-fire test suite validates full ingestion pipeline

### Standards System
31 active architecture standards in `specs/current-standards/` covering:
- Search algorithms, distillation modes, self-contamination prevention
- Test environment consistency, AST parser WASM implementation
- Database schema, configuration management, dependency selection

## Key Entry Points

| File | Purpose |
|------|---------|
| `engine/src/index.ts` | Server startup — initializes DB, routes, watchdog, distillation services |
| `engine/src/routes/v1/` | API route definitions (memory, ingest, search, tags) |
| `engine/src/services/search/` | STAR algorithm, context inflation, explore traversal |
| `engine/src/services/ingest/` | File ingestion, atomization, watchdog file watching |
| `engine/src/services/distillation/` | Radial distillation (v1 + v2 decision records) |
| `engine/src/config/index.ts` | Configuration loader with Zod validation |

## Common Workflows

### Adding a New API Route
1. Define Zod schema in `engine/src/config/` (or reuse existing)
2. Add route handler in `engine/src/routes/v1/`
3. Register in `engine/src/routes/api.ts`
4. Add corresponding test in `engine/tests/`

### Ingesting Content
1. Place files in `~/.anchor/inbox/` or use `/v1/ingest` API endpoint
2. Watchdog auto-detects new files (if enabled)
3. Content is atomized, tagged, and stored as pointers in PGlite + content in mirrored_brain/

### Running Tests
```bash
pnpm test:vitest                    # Run Vitest suite
pnpm test --unit                   # Unit tests only
# Or run specific file: npx vitest run engine/tests/unit/<file>.ts
```

## Notable Patterns & Gotchas

- **ESM + __dirname:** Uses `fileURLToPath(new URL('.', import.meta.url))` pattern for ES module directory resolution
- **WASM modules:** Rust WASM packages replace older C++ native modules — no `node-gyp` needed for atomization/fingerprinting/tagging
- **Database lifecycle:** Server starts → DB initializes in background → 503 on writes until ready → full routes registered after init
- **Shutdown cleanup:** Wipes PGlite DB, mirrored_brain/, GitHub mirror dir, synonym rings — regenerates from inbox/ on next boot
- **API key validation:** Runtime check duplicates Zod schema for better error messages; accepts mixed-case+digit OR 64+ char hex

## Documentation Navigation

| Document | Content |
|----------|---------|
| `specs/spec.md` | Master specification with architecture diagrams, API reference, standards index |
| `specs/current-standards/` | Individual standard documents (001–031) |
| `docs/whitepaper.md` | STAR Algorithm whitepaper (arXiv-ready) |
| `docs/API.md` | Full API endpoint documentation |
| `CROSS_PLATFORM_SETUP.md` | Cross-platform `.anchor` directory setup details |
| `CHANGELOG.md` | Version history and release notes |
