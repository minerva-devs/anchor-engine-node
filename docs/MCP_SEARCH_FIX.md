# MCP Server Search & Distill Fix

## Problem
The MCP server tools (`anchor_search`, `anchor_distill`, `anchor_illuminate`) were not working correctly because they were calling incorrect API endpoints.

## Root Cause
The MCP server was calling legacy endpoint paths that don't exist or use different behavior than the UI:
- `/v1/search` → Should be `/v1/memory/search`
- `/v1/distill` → Should be `/v1/memory/distill`
- `/v1/illuminate` → Should be `/v1/memory/explore`

Additionally, the search endpoint defaults to **streaming mode** (Server-Sent Events), but MCP expects standard JSON responses.

## Solution
Updated `engine/src/mcp/server.ts` to:

1. **Use correct endpoint paths** that match the UI implementation
2. **Disable streaming mode** by adding `?stream=false` query parameter
3. **Add comments** explaining the fixes

### Changes Made

#### anchor_search
```typescript
// BEFORE (broken)
case 'anchor_search': {
  const result = await callAnchorAPI('/v1/search', {
    method: 'POST',
    body: JSON.stringify(args),
  });
  resultText = JSON.stringify(result, null, 2);
  break;
}

// AFTER (fixed)
case 'anchor_search': {
  // Fixed: Use /v1/memory/search with stream=false to match UI search behavior
  const result = await callAnchorAPI('/v1/memory/search?stream=false', {
    method: 'POST',
    body: JSON.stringify(args),
  });
  resultText = JSON.stringify(result, null, 2);
  break;
}
```

#### anchor_distill
```typescript
// BEFORE (broken)
case 'anchor_distill': {
  const result = await callAnchorAPI('/v1/distill', {
    method: 'POST',
    body: JSON.stringify(args),
  });
  resultText = JSON.stringify(result, null, 2);
  break;
}

// AFTER (fixed)
case 'anchor_distill': {
  // Fixed: Use /v1/memory/distill with stream=false to match UI distill endpoint
  const result = await callAnchorAPI('/v1/memory/distill?stream=false', {
    method: 'POST',
    body: JSON.stringify(args),
  });
  resultText = JSON.stringify(result, null, 2);
  break;
}
```

#### anchor_illuminate
```typescript
// BEFORE (broken)
case 'anchor_illuminate': {
  const result = await callAnchorAPI('/v1/illuminate', {
    method: 'POST',
    body: JSON.stringify(args),
  });
  resultText = JSON.stringify(result, null, 2);
  break;
}

// AFTER (fixed)
case 'anchor_illuminate': {
  // Fixed: Use /v1/memory/explore for BFS graph traversal
  const result = await callAnchorAPI('/v1/memory/explore', {
    method: 'POST',
    body: JSON.stringify(args),
  });
  resultText = JSON.stringify(result, null, 2);
  break;
}
```

## Testing
After rebuilding the MCP server (`pnpm build` in `mcp-server/`):

```bash
# Test search endpoint directly
curl -X POST "http://localhost:3160/v1/memory/search?stream=false" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer anchor-engine-default-key" \
  -d '{"query": "anchor engine", "token_budget": 200}'
```

Expected output: JSON response with `results` array containing search results with:
- `uuid`: Molecule ID
- `content`: Text content
- `source`: Source file path
- `timestamp`: ISO timestamp
- `score`: Relevance score
- `tags`: Array of tags
- `provenance`: Internal/external
- `compound_id`: Parent compound ID

## Endpoint Reference

| MCP Tool | Correct Endpoint | Query Params | Purpose |
|----------|-----------------|--------------|---------|
| `anchor_search` | `/v1/memory/search` | `?stream=false` | STAR algorithm search |
| `anchor_distill` | `/v1/memory/distill` | `?stream=false` | Radial distillation |
| `anchor_illuminate` | `/v1/memory/explore` | (none) | BFS graph traversal |

## Why This Matters
The UI uses the `@rbalchii/anchor-client` library which automatically:
1. Calls the correct `/v1/memory/*` endpoints
2. Handles streaming vs non-streaming modes
3. Parses responses correctly

The MCP server needs to replicate this behavior explicitly by:
1. Using the correct endpoint paths
2. Disabling streaming for MCP compatibility (stdio transport)
3. Returning properly formatted JSON responses

## Files Modified
- `engine/src/mcp/server.ts` - Updated endpoint paths and added stream=false

## Build & Deploy
```bash
cd mcp-server
pnpm build
```

The MCP server will now work correctly with Qwen Code and other MCP clients.
