# Live-Fire Test Suite for Anchor Engine v5.0.0

## Overview

This test suite performs end-to-end integration testing by running against a live server instance. It validates:

- **Search API** - Query parsing, retrieval, response formatting
- **Ingestion pipeline** - File upload, atom/molecule creation, provenance tracking  
- **Distillation API** - Radial distillation queries
- **Migration verification** - Compounds table removal (Standard 051)

## Prerequisites

| Requirement | Details |
|-------------|---------|
| Node.js | v18.0.0 or later |
| pnpm | Global package manager configured |
| Git CLI | For repository operations |
| Port 3160 | Available (or use `--port` flag) |

## Setup Options

### Option A: Run Against Existing Server (Recommended)

If the Anchor Engine server is already running, run tests directly:

```bash
# From project root
pnpm run live-fire:run

# Or specify a different server URL
pnpm run live-fire:run --url "http://localhost:3160"
```

### Option B: Full Integration Test (Starts Server)

This will automatically start the engine, run tests, then optionally stop it:

```bash
pnpm run live-fire:integration
```

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Run all tests against existing server
pnpm run live-fire:all
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `live-fire:run` | Run tests against existing server (default) |
| `live-fire:integration` | Start engine, run tests, stop server |
| `live-fire:search` | Search API tests only |
| `live-fire:distill` | Distillation API tests only |
| `live-fire:schema` | Schema verification tests |

## Test Coverage

### Core Functionality Tests
1. **Health Check** - Verify server is responding
2. **Molecules List** - List molecules with provenance fields
3. **Atoms List** - List atoms structure after migration
4. **Search Query** - Memory search API functionality
5. **Compounds Table** - Verify removal (returns 404 or empty)

### Ingestion Tests
6. **File Upload** - Create test document
7. **Provenance Verification** - Check provenance/molecular_signature fields
8. **Post-Ingest Query** - Search for newly ingested content

### API Schema Tests
9. **Molecules Schema** - Verify columns after migration
10. **Atoms Schema** - Verify provenance column exists

## Expected Results

### Success Criteria
- All 10 tests pass
- Server responds within timeout (30s default)
- No errors in test output

### Known Limitations

The suite currently does NOT run automatically on server start. Instead, use one of the methods above to execute tests manually. This requires manual intervention but gives you full control over when tests run.

## Test Output

Results are logged to:
- `engine/tests/live-fire/results.json` - Structured test results
- `engine/tests/live-fire/server.log` - Server output (if started)
- `engine/tests/live-fire/run-tests.js` - Full execution log

## Troubleshooting

### Common Issues

**Issue**: Port 3160 in use  
**Solution**: Use a different port:
```bash
set PORT=3161 && pnpm run live-fire:run --url "http://localhost:3161"
```

**Issue**: Server not responding  
**Solution**: Ensure engine is running with `node engine/dist/index.js`

**Issue**: Database initialization errors  
**Solution**: Clean data directory and restart:
```bash
rmdir /s /q .anchor && pnpm run live-fire:integration
```

## Test Results Format

Results are saved to `engine/tests/live-fire/results.json`:

```json
{
  "timestamp": "2026-05-22T03:40:12.000Z",
  "serverUrl": "http://localhost:3160",
  "summary": {
    "total": 10,
    "passed": 10,
    "failed": 0
  },
  "tests": [
    {
      "name": "Server health check",
      "status": "pass",
      "duration_ms": 42,
      "error": null
    }
  ]
}
```

## Migration Verification Checklist

After running the test suite, verify these items:

- [ ] Compounds table endpoint returns 404 or empty response
- [ ] Molecules have `provenance` and `molecular_signature` fields
- [ ] Atoms have `provenance` field  
- [ ] Ingestion creates records in atoms/molecules (not compounds)
- [ ] Search queries return results without compound table joins

## References

- Standard 051: Pointer-only database storage
- Database Schema Migration documentation (`MIGRATION_COMPLETE.md`)
- Ingestion Service implementation (`engine/src/services/ingest/`)