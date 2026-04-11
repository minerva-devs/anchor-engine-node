# Anchor Engine - Source Code Overview

**Version:** (VERSION) | **Last Updated:** March 18, 2026

---

## Directory Structure

```
engine/src/
├── index.ts                    # Entry point, server startup
├── config/                     # Configuration management
│   ├── index.ts               # Config loader
│   ├── paths.ts               # Path management
│   ├── schema.ts              # Config validation (Zod)
│   └── max-recall-config.ts   # Max-recall mode settings
│
├── core/                       # Core functionality
│   ├── db.ts                  # PGlite database layer
│   ├── batch.ts               # Batch processing
│   ├── vector.ts              # Vector operations
│   └── inference/             # LLM inference (optional)
│
├── services/                   # Business logic
│   ├── ingest/                # Content ingestion
│   │   ├── atomizer-service.ts
│   │   ├── ingest.ts
│   │   ├── ingest-atomic.ts
│   │   ├── github-ingest-service.ts
│   │   ├── streaming-ingest.ts
│   │   └── watchdog.ts        # File watcher
│   │
│   ├── search/                # Search & retrieval
│   │   ├── search.ts          # STAR algorithm
│   │   ├── context-inflator.ts
│   │   ├── explore.ts
│   │   └── ...
│   │
│   ├── distillation/          # Knowledge compression
│   │   ├── radial-distiller.ts
│   │   └── radial-distiller-v2.ts
│   │
│   ├── tags/                  # Tag management
│   │   ├── tag-auditor.ts
│   │   ├── infector.ts
│   │   └── discovery.ts
│   │
│   └── ...
│
├── routes/                     # HTTP API endpoints
│   ├── v1/
│   │   ├── memory.ts          # Search, explore, distill
│   │   ├── ingest.ts          # Ingestion endpoints
│   │   ├── search.ts          # Search endpoints
│   │   ├── tags.ts            # Tag endpoints
│   │   ├── backup.ts          # Phoenix Protocol
│   │   ├── system.ts          # System endpoints
│   │   └── ...
│   └── ...
│
├── middleware/                 # Express middleware
│   ├── auth.ts                # API key auth
│   ├── validate.ts            # Request validation
│   └── request-tracing.ts     # Request tracing
│
├── schemas/                    # Zod schemas
│   └── api-schemas.ts         # API validation schemas
│
├── types/                      # TypeScript types
│   ├── atomic.ts              # Atom/molecule types
│   ├── search.ts              # Search types
│   └── ...
│
├── utils/                      # Utilities
│   ├── path-manager.ts        # Path management
│   ├── structured-logger.ts   # Logging
│   ├── timer.ts               # Timing utilities
│   └── ...
│
└── tests/                      # Unit tests
    ├── ingest.test.ts
    ├── search.test.ts
    └── distill.test.ts
```

---

## Key Entry Points

### Server Startup (`index.ts`)

```typescript
// Main entry point
import { startServer } from './core/db';
import { setupRoutes } from './routes';

async function main() {
  await startServer();
  setupRoutes();
  console.log('Anchor Engine running on port 3160');
}

main();
```

**Startup Sequence:**
1. Load configuration
2. Initialize PGlite database
3. Setup Express routes
4. Start watchdog service
5. Begin accepting requests

---

## Core Modules

### Database Layer (`core/db.ts`)

**Purpose:** PGlite database initialization and management

**Key Functions:**
- `init()` - Database initialization
- `run()` - Execute SQL queries
- `reset()` - Wipe and rebuild database

**Example:**
```typescript
import { db } from './core/db';

const results = await db.run(
  'SELECT * FROM atoms WHERE id = ?',
  [atomId]
);
```

---

### Configuration (`config/`)

**Purpose:** Load and validate configuration

**Key Files:**
- `index.ts` - Config loader
- `paths.ts` - Path resolution
- `schema.ts` - Zod validation

**Example:**
```typescript
import { config } from './config';

const maxChars = config.SEARCH.max_chars_default;
```

---

## Services

### Ingestion (`services/ingest/`)

**Purpose:** Ingest content into knowledge graph

**Key Modules:**
- `atomizer-service.ts` - Split content into atoms
- `ingest.ts` - Main ingestion logic
- `watchdog.ts` - File system watcher

**Flow:**
```
File → Mirror → Atomize → Tag → Store
```

---

### Search (`services/search/`)

**Purpose:** Retrieve relevant context using STAR algorithm

**Key Modules:**
- `search.ts` - Main search implementation
- `context-inflator.ts` - Expand context windows
- `explore.ts` - BFS graph traversal

**Algorithm:**
```
Query → Tags → Anchor Atoms → Walk Graph → Rank → Return
```

---

### Distillation (`services/distillation/`)

**Purpose:** Compress knowledge into decision records

**Key Modules:**
- `radial-distiller.ts` - v1 (line-level)
- `radial-distiller-v2.ts` - v2 (Decision Records)

**Output:**
```json
{
  "records": [...],
  "session_index": [...],
  "digital_objects": [...]
}
```

---

## Routes

### Memory Routes (`routes/v1/memory.ts`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/search` | POST | Semantic search |
| `/explore` | POST | Graph exploration |
| `/distill` | POST | Radial distillation |

### Ingest Routes (`routes/v1/ingest.ts`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | POST | Ingest text |
| `/streaming` | POST | Stream large files |

---

## Testing

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Specific test file
npx vitest run src/services/search/search.test.ts
```

### Test Structure

```typescript
describe('STAR Search', () => {
  it('returns relevant results', async () => {
    const results = await search({ query: 'test' });
    expect(results.length).toBeGreaterThan(0);
  });
});
```

---

## Philosophy Alignment

This source tree embodies the core principles:

| Principle | Implementation |
|-----------|----------------|
| **Forgetting** | `radial-distiller-v2.ts` removes redundancy |
| **Relationships** | `search.ts` walks graph edges |
| **Efficiency** | `core/db.ts` pointer-only index |
| **Clarity** | `distillation/` extracts Decision Records |
| **Explainability** | All routes return provenance |

---

## Contributing

### Adding New Features

1. **Service Layer:** Add business logic in `services/`
2. **Routes:** Add API endpoints in `routes/v1/`
3. **Schemas:** Add validation in `schemas/`
4. **Tests:** Add tests in corresponding `.test.ts` files

### Code Style

- TypeScript strict mode
- ESLint rules enforced
- Prettier formatting
- Zod validation for all inputs

---

## Support

- **API Docs:** [`docs/API.md`](../../docs/API.md)
- **Standards:** [`specs/current-standards/`](../../specs/current-standards/)
- **Issues:** https://github.com/RSBalchII/anchor-engine-node/issues
