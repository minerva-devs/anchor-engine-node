# Anchor Engine

**Deterministic semantic memory for LLMs** - local-first, graph traversal, <1GB RAM

## Quick Start (5-minute setup)

```bash
pnpm install
pnpm start
```

Visit `http://localhost:3000` to see the UI.

## Core Features

- **Semantic Search**: Graph-based retrieval with deterministic results
- **Memory Layer**: Persistent knowledge graph stored in PostgreSQL
- **Local-first**: All data stays local, no cloud dependencies
- **Low Memory**: <1GB RAM footprint with efficient caching

## Architecture Overview

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────────┐
│   API Layer     │────▶│ Search Engine │────▶│  Knowledge Graph  │
│  (Express/TS)   │     │  (Graph Query)│     │   (PGlite + FTS)  │
└─────────────────┘     └──────────────┘     └──────────────────┘
```

### Components

- **Engine**: Core search and ingestion services
- **MCP Server**: Model Context Protocol integration
- **UI**: Web dashboard for interaction

## API Reference

See [API Documentation](docs/API.md) for complete endpoint reference.

## Configuration Guide

Edit `user_settings.json.template` to configure:
- Database path
- LLM provider settings
- Memory limits
- Ingestion sources

Generated config lives in `$HOME/.anchor/user_settings.json`.

## Performance Benchmarks

| Operation | Time | Notes |
|-----------|------|-------|
| Document ingestion | ~2s/100 pages | With caching |
| Search query | <50ms | For 1M+ documents |
| Memory usage | ~600MB | At rest, ~800MB active |

## Testing

The project includes an end-to-end testing suite:

- **UI Verification Tests**: `tests/e2e/ui-verification.test.ts` - Tests UI navigation and rendering using Playwright
- **GitHub Clone E2E Tests**: `tests/e2e/github-clone-e2e.test.ts` - Tests repository cloning functionality
- **Integration Tests**: `engine/tests/integration/` - API and service integration tests

### Running Tests

All e2e tests require the live engine running. Start the engine first:

```bash
# Windows (recommended)
scripts\run-engine.bat

# Or use Python wrapper directly
python scripts/engine_server.py start
```

Run tests with Vitest:

```bash
pnpm test:e2e          # Run all e2e tests
pnpm test:e2e:ui       # UI verification tests only
pnpm test:integration   # Integration tests only
```

### Engine Control Scripts

The project provides scripts for reliable engine management:

| Script | Purpose |
|--------|---------|
| `scripts/run-engine.bat` | Start/stop engine (Windows) |
| `scripts/start-engine.ps1` | Start engine with auto-ready detection |
| `scripts/stop-engine.bat` | Stop only the engine process on port 3160 |
| `scripts/engine_server.py` | Python API: `python engine_server.py start/stop` |

See [UX/UI Recursion Workflow](specs/ux-ui-recursion-workflow.md) for detailed testing procedures.

## Security Hardening

- API key authentication (configurable)
- Rate limiting on all endpoints
- Input sanitization for XSS prevention
- See [Security Guide](docs/SECURITY.md) for details.

## Contributing

1. Fork the repo
2. Create a feature branch
3. Write tests for new functionality
4. Open a PR with description

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for more info.

## License

AGPL-3.0-only (see LICENSE file for details)

---

**Anchor Engine** - Deterministic, local-first semantic memory for LLMs