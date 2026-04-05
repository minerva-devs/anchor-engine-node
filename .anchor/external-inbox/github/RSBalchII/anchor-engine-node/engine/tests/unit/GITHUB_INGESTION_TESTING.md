# GitHub Repository Ingestion Testing Guide

**Standard 115:** GitHub Repository Ingestion  
**Version:** 1.0.0  
**Last Updated:** March 2, 2026

---

## Overview

This guide explains how to test the GitHub repository ingestion functionality in Anchor Engine.

---

## Automated Tests

### Unit Test (Simulated Data)

**File:** `engine/tests/unit/github-ingest-search.ts`

Tests the GitHub ingestion workflow with simulated data:
- Repository registration
- Atom/molecule insertion
- Content search
- Tag filtering
- Tag limiting (Standard 121)
- Temporal ordering

**Run:**
```bash
node --loader ts-node/esm engine/tests/unit/github-ingest-search.ts
```

**Expected Output:**
```
🧪 GitHub Repository Ingestion & Search Tests
==================================================
✅ Database initialized
Test 1: Fixture data validation
  ✅ PASSED
Test 2: Insert repository atoms and molecules
  ✅ PASSED
...
Results: 8 passed, 0 failed
```

---

## Manual Testing (Live GitHub Repository)

### Step 1: Start the Server

```bash
pnpm start
```

### Step 2: Enable Watchdog (Optional)

Navigate to Settings UI (`http://localhost:3160/settings`) and enable the Watchdog service.

### Step 3: Add GitHub Repository

**Option A: Via API**
```bash
curl -X POST http://localhost:3160/v1/github/repos \
  -H "Content-Type: application/json" \
  -d '{
    "github_url": "https://github.com/RSBalchII/anchor-engine-node",
    "bucket": "github"
  }'
```

**Option B: Via Watchdog**

Place a `.github-repos` file in your inbox directory:
```
# inbox/.github-repos
https://github.com/RSBalchII/anchor-engine-node
```

### Step 4: Monitor Ingestion

Watch the server logs for ingestion progress:
```
[GitHub] Downloading tarball: https://api.github.com/repos/...
[GitHub] Extracting tarball...
[GitHub] Ingesting: src/index.ts
[Atomizer] ⏱️ START: github/RSBalchII/anchor-engine-node/...
[AtomicIngest] ✅ COMPLETE: ...
[GitHub] Sync complete: 42 files, 1234 atoms in 15.3s
```

### Step 5: Verify Ingestion

**Check Stats:**
```bash
curl http://localhost:3160/v1/stats
```

**Check Repository Status:**
```bash
curl http://localhost:3160/v1/github/repos
```

### Step 6: Search Ingested Content

**Search by Content:**
```bash
curl -X POST http://localhost:3160/v1/memory/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "anchor engine knowledge graph",
    "token_budget": 4096
  }'
```

**Search by Tag:**
```bash
curl -X POST http://localhost:3160/v1/memory/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "#typescript",
    "token_budget": 4096
  }'
```

**Expected Response:**
```json
{
  "results": [
    {
      "id": "atom_abc123",
      "content": "Anchor Engine uses knowledge graph...",
      "source_path": "github/RSBalchII/anchor-engine-node/src/search.ts",
      "tags": ["#typescript", "#search", "#knowledge-graph"],
      "score": 0.85
    }
  ],
  "duration_ms": 150
}
```

### Step 7: Verify Tag Limiting (Standard 121)

Query the database directly to verify tag limiting:
```bash
curl http://localhost:3160/v1/stats | jq '.atoms'
```

Or query PGlite directly:
```sql
SELECT id, jsonb_array_length(tags) as tag_count
FROM atoms
WHERE provenance = 'github'
ORDER BY tag_count DESC
LIMIT 10;
```

**Expected:** All atoms should have ≤10 tags.

---

## Troubleshooting

### GitHub Rate Limiting

If you hit GitHub's rate limit (60 requests/hour for unauthenticated):

**Solution 1: Add GitHub Token**
```bash
export GITHUB_TOKEN=your_token_here
```

**Solution 2: Wait for rate limit reset**
Check `X-RateLimit-Reset` header in API responses.

### Ingestion Failures

**Check logs for:**
- `[GitHub] Failed to ingest` - File parsing error
- `[Atomizer] Error` - Content atomization failed
- `[AtomicIngest] Error` - Database insertion failed

**Common causes:**
- Binary files (skipped automatically)
- Very large files (chunked automatically)
- Encoding issues (UTF-8 required)

### Search Returns No Results

**Possible causes:**
1. Ingestion not complete - check logs for "Sync complete"
2. Query too specific - try broader terms
3. Tags not generated - check tag modulation settings

**Debug:**
```bash
# Check if data exists
curl http://localhost:3160/v1/stats

# Check available tags
curl http://localhost:3160/v1/tags?limit=20
```

---

## Performance Benchmarks

| Metric | Target | Typical |
|--------|--------|---------|
| Download speed | - | ~500 KB/s |
| Extraction | - | ~100 files/s |
| Atomization | - | ~50 atoms/s |
| Search latency | <200ms | ~150ms |

---

## Test Repository Recommendations

For testing, use small, stable repositories:

- **RSBalchII/anchor-engine-node** - Main repository (~500 files)
- **ExpressJS/express** - Small, well-structured (~100 files)
- **Any public repo** with <1000 files for quick testing

---

## Related Standards

- **Standard 115:** GitHub Repository Ingestion
- **Standard 121:** Tag Limiting for Output Quality
- **Standard 059:** Reliable Ingestion

---

## Support

For issues or questions:
1. Check server logs (`logs/` directory)
2. Review Standard 115 specification
3. Consult `specs/standards/115-github-repository-ingestion.md`
