# Search Results Logging for Test Verification

## Overview

Search results are now logged to `.anchor/logs/` when tests run the full search pipeline. This allows verification that each part of the search pipeline and algorithms from each endpoint work correctly.

---

## Files Modified/Created

### 1. `engine/src/services/search/search-results-logger.ts` (NEW)
- Creates directory structure at `.anchor/logs/`
- Logs as JSON files with truncation to prevent unbounded growth
- Only activates when verbose flag is set or `ANCHOR_SEARCH_LOG=1` env var
- Keeps last 50 entries per unique query hash

### 2. `engine/src/services/search/streaming-search.ts` (MODIFIED)
- Added `verbose?: boolean` option to `StreamingSearchOptions`
- Integrated logger call after search completes
- Logs results with full pipeline metadata

### 3. `tests/unit/github-ingest-search.ts` (MODIFIED)
- Added Test 9: Search Pipeline Verification with Results Logging
- Runs actual search via `executeStreamingSearch()` with `verbose: true`
- Verifies log files are created in `.anchor/logs/`

---

## How It Works

### Automatic Log Creation

When a test runs the search pipeline with `verbose: true`:

```typescript
for await (const event of executeStreamingSearch({
  query: 'anchor engine',
  verbose: true, // ← Enables logging
}));
```

Results are logged to:
- **Location:** `.anchor/logs/YYYY-MM-DDTHH-MM-SSZ_search_<hash>.json`
- **Format:** JSON array with truncated entries (last 50 per query)
- **Size limit:** 10MB max before truncation kicks in

### Log File Structure

```json
[
  {
    "timestamp": "2026-04-12T00:30:45.123Z",
    "queryHash": "a1b2c3d4",
    "originalQuery": "anchor engine github ingestion",
    "results": [
      {
        "id": "atom_abc123",
        "content": "...truncated to 500 chars...",
        "source": "github/RSBalchII/.../file.ts",
        "score": 0.87,
        "tags": ["#github"],
        "buckets": ["search"],
        "provenance": "external"
      }
    ],
    "metadata": {
      "strategy": "split_merge",
      "totalResults": 42,
      "durationMs": 1523,
      "splitQueries": ["anchor engine"]
    }
  }
]
```

---

## Viewing Logs

### List Log Files

```bash
dir .anchor\logs
# Output:
#  04/12/2026  00:30 PM  <DIR>          logs
#  04/12/2026  00:30 PM                5,234 2026-04-12T00-30-45Z_search_a1b2c3d4.json
```

### View Log Contents (Windows)

```powershell
Get-Content .anchor\logs\*.json | ConvertFrom-Json | Select-Object -First 1
```

### View Log Contents (Linux/Mac)

```bash
cat .anchor/logs/*.json | jq '.[0]'
```

---

## Verification Checklist

Run Test 9 to verify the full pipeline:

```bash
cd aen/engine
npm run test:vitest tests/unit/github-ingest-search.ts
```

Expected output:
- ✅ Search pipeline executed with results logging
- 📝 Search results logged to `.anchor/logs/` (N file(s))

---

## Truncation Policy

To prevent unbounded growth:

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Max entries per query hash | 50 | Keep last N searches per unique query |
| Max file size | 10MB | Prevent disk bloat |
| File naming | Timestamp + hash | Chronological tracking with deduplication |

---

## Test Coverage

### What's Logged

- ✅ Query string (truncated to 200 chars)
- ✅ All search results with scores, tags, buckets
- ✅ Strategy used (split_merge, max_recall, etc.)
- ✅ Duration and performance metrics
- ✅ Split queries and decomposition
- ✅ Source paths from GitHub ingestion

### What's NOT Logged

- ❌ Full content (>500 chars truncated)
- ❌ Embedding vectors (too large)
- ❌ User context details (privacy)

---

## Next Steps

1. **Run Test 9** to verify search logging works end-to-end
2. **Check `.anchor/logs/`** for generated JSON files
3. **Review log contents** to verify pipeline algorithms are working correctly
4. **Add more tests** with `verbose: true` as needed for specific endpoint verification

---

## Standards Implemented

- Standard 136: Streaming Search (logging integration)
- Test Output Verification: Results persistence for audit trails
