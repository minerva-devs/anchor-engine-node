# Agent-Controlled Anchor Engine

**Version:** 4.8.2+  
**Status:** Production Ready  
**Purpose:** Enable Qwen Code agents to control Anchor Engine lifecycle, ingestion, and configuration programmatically

---

## 🎯 Overview

As of v4.8.2, Anchor Engine exposes a comprehensive MCP (Model Context Protocol) server that allows AI agents to:

1. **Control** the engine (start/stop/health monitoring)
2. **Monitor** state (ingestion progress, queue depth)
3. **Configure** behavior (concept density, tag granularity, token budget)
4. **Wait** for operations (synchronous workflows)

This enables **checkpoint distillation**: agents can ingest their own conversation history, distill it into decision records, and query it in future sessions.

---

## 🏗️ Architecture

```
┌─────────────────┐
│  Qwen Code      │
│  Agent          │
│                 │
│  /research      │
│  /distill       │
└────────┬────────┘
         │ MCP Protocol (stdio)
         ▼
┌─────────────────┐
│  Anchor MCP     │
│  Server         │
│                 │
│  - anchor_start │
│  - anchor_ingest│
│  - anchor_search│
│  - anchor_distill│
└────────┬────────┘
         │ HTTP REST API
         ▼
┌─────────────────┐
│  Anchor Engine  │
│  REST API       │
│                 │
│  /v1/system/    │
│  /v1/ingest/    │
│  /v1/config/    │
│  /v1/distill    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PGlite DB      │
│  local-data/    │
└─────────────────┘
```

---

## 🛠️ MCP Tools Reference

### Lifecycle Control

#### `anchor_start`
Start Anchor Engine server (if not already running).

**Parameters:** None  
**Returns:**
```json
{
  "status": "starting" | "already_running",
  "message": "Server start initiated",
  "started_at": "2026-03-20T12:34:56Z",
  "uptime_seconds": 1234
}
```

---

#### `anchor_stop`
Graceful shutdown of Anchor Engine server.

**Parameters:**
- `timeout` (number, optional): Milliseconds to wait for shutdown (default: 30000)

**Returns:**
```json
{
  "status": "shutting_down",
  "message": "Graceful shutdown initiated",
  "timeout_ms": 30000,
  "timestamp": "2026-03-20T12:34:56Z"
}
```

---

#### `anchor_health`
Check server health (database connectivity, directory accessibility).

**Parameters:** None  
**Returns:**
```json
{
  "status": "healthy" | "unhealthy",
  "timestamp": "2026-03-20T12:34:56Z",
  "checks": {
    "database": "connected" | "disconnected" | "error",
    "directories": "accessible" | "some missing"
  }
}
```

---

#### `anchor_status`
Get current server status including state, active tasks, and progress.

**Parameters:** None  
**Returns:**
```json
{
  "status": "success",
  "state": "idle" | "ingesting" | "searching" | "maintenance",
  "isBusy": false,
  "activeTask": "Ingesting qwen-session-123",
  "progress": {
    "current": 50,
    "total": 100,
    "description": "Processed 50 files"
  },
  "lastIngestion": "2026-03-20T12:30:00Z",
  "queueDepth": 0
}
```

---

#### `anchor_server_info`
Get server metadata (uptime, version, port).

**Parameters:** None  
**Returns:**
```json
{
  "status": "success",
  "server_info": {
    "is_running": true,
    "is_shutting_down": false,
    "started_at": "2026-03-20T10:00:00Z",
    "uptime_seconds": 9000,
    "port": 3160,
    "host": "0.0.0.0",
    "version": "4.8.2"
  }
}
```

---

### Ingestion Control

#### `anchor_ingest`
Ingest content into Anchor Engine memory.

**Parameters:**
- `path` (string, optional): File or directory path to ingest
- `content` (string, optional): Raw content to ingest (alternative to path)
- `source` (string, optional): Source identifier (e.g., "qwen-session-123")
- `type` (string, optional): Content type (e.g., "chat", "code", "notes")
- `buckets` (string[], optional): Buckets to ingest into
- `wait` (boolean, optional): If true, block until ingestion completes

**Returns:**
```json
{
  "status": "success",
  "message": "Ingested 42 atoms and 12 molecules",
  "id": "compound-abc123",
  "duration_ms": 1234,
  "job_id": "job-xyz789"
}
```

---

#### `anchor_ingest_status`
Get current ingestion progress and status.

**Parameters:** None  
**Returns:**
```json
{
  "status": "success",
  "status": "idle" | "processing" | "complete" | "error",
  "currentJob": {
    "id": "job-xyz789",
    "status": "processing",
    "source": "qwen-session-123",
    "filesProcessed": 50,
    "filesTotal": 100,
    "startedAt": "2026-03-20T12:30:00Z"
  },
  "lastCompleted": "2026-03-20T12:25:00Z",
  "queueDepth": 0
}
```

---

#### `anchor_wait_for_ingest`
Block until current ingestion completes.

**Parameters:**
- `timeout` (number, optional): Maximum time to wait in milliseconds (default: 300000)
- `job_id` (string, optional): Specific job ID to wait for

**Returns:**
```json
{
  "status": "complete",
  "final_status": "complete",
  "duration_ms": 45000,
  "job": {
    "id": "job-xyz789",
    "status": "complete",
    "source": "qwen-session-123"
  }
}
```

---

### Configuration

#### `anchor_set_ingestion_config`
Configure ingestion behavior (concept density, tag granularity, etc.).

**Parameters:**
- `concept_density` ("low" | "medium" | "high"): How many concepts/tags to extract
- `tag_threshold` (number, 0-1): Minimum confidence for tag extraction
- `dedup_strength` ("light" | "medium" | "aggressive"): How aggressively to deduplicate
- `token_budget_default` (number): Default token budget for searches
- `ingestion_profile` ("code" | "notes" | "chat" | "default"): Preset for content type

**Returns:**
```json
{
  "status": "success",
  "message": "Ingestion config updated",
  "config": {
    "concept_density": "high",
    "tag_threshold": 0.8,
    "dedup_strength": "aggressive",
    "token_budget_default": 2000,
    "ingestion_profile": "chat"
  }
}
```

---

#### `anchor_get_ingestion_config`
Get current ingestion configuration.

**Parameters:** None  
**Returns:** Same structure as `anchor_set_ingestion_config` response.

---

### Search & Distillation

#### `anchor_search`
Search Anchor Engine memory with configurable parameters.

**Parameters:**
- `query` (string, required): Search query
- `token_budget` (number, optional): Maximum tokens to return
- `max_hop_distance` (number, optional): Maximum graph hop distance
- `include_provenance` (boolean, optional): Include provenance metadata

**Returns:**
```json
{
  "status": "success",
  "results": [
    {
      "content": "...",
      "score": 0.95,
      "provenance": "qwen-session-123",
      "tags": ["#v4.8.2", "#rate_limiting"]
    }
  ],
  "total_results": 5,
  "duration_ms": 234
}
```

---

#### `anchor_distill`
Compress knowledge into deduplicated summaries (YAML/MD).

**Parameters:**
- `seed` (object, optional): Seed for radial distillation
  - `query` (string): Query to seed distillation
  - `compound_ids` (string[]): Specific compounds to distill
  - `buckets` (string[]): Buckets to distill from
- `radius` (number, optional): Search radius in graph hops
- `max_radius` (number, optional): Maximum radius to expand to
- `output_format` ("yaml" | "json" | "compound", optional): Output format
- `output_path` (string, optional): Custom output path

**Returns:**
```json
{
  "stats": {
    "compounds_processed": 100,
    "lines_total": 5000,
    "lines_unique": 2500,
    "lines_duplicate": 2500,
    "compression_ratio": "2.00:1",
    "duration_ms": 5000,
    "memory_peak_mb": 256
  },
  "output": {
    "format": "compound",
    "path": "local-data/distilled/session-123-distilled.md",
    "size_bytes": 102400,
    "compounds_created": 3
  },
  "provenance": {
    "source_compounds": [
      "qwen-session-123.jsonl"
    ],
    "unique_sources": 1,
    "distilled_at": "2026-03-20T12:35:00Z",
    "parameters": { ... }
  }
}
```

---

#### `anchor_illuminate`
Explore connected concepts from a seed topic using BFS graph traversal.

**Parameters:**
- `seed` (string, required): Seed query or topic to explore
- `depth` (number, optional): Maximum traversal depth (default: 3)
- `max_nodes` (number, optional): Maximum nodes to explore (default: 50)

**Returns:**
```json
{
  "status": "success",
  "nodes": [
    {
      "id": "atom-123",
      "content": "...",
      "tags": ["#rate_limiting", "#security"],
      "relevance_score": 0.95
    }
  ],
  "total_nodes": 25
}
```

---

#### `anchor_set_path`
Add a new path to watch for file changes.

**Parameters:**
- `path` (string, required): Absolute path to watch

**Returns:**
```json
{
  "status": "success" | "warning",
  "message": "Now watching: /path/to/dir",
  "path": "/path/to/dir",
  "within_project_root": true
}
```

---

## 🔄 Checkpoint Distillation Workflow

### Scenario: Qwen Code Session Checkpointing

This workflow enables Qwen Code agents to:
1. Export their conversation history
2. Ingest it into Anchor Engine
3. Distill it into a decision record
4. Query it in future sessions

### Step-by-Step

#### 1. Pre-Flight Check
```typescript
// Check engine health
const health = await anchor_health();
if (health.status !== 'healthy') {
  await anchor_start();
  // Wait for healthy...
}

// Check not currently ingesting
const status = await anchor_status();
if (status.state === 'ingesting') {
  await anchor_wait_for_ingest();
}
```

#### 2. Configure for Chat Ingestion
```typescript
await anchor_set_ingestion_config({
  concept_density: 'high',      // Capture all concepts from chat
  ingestion_profile: 'chat',    // Optimize for conversational content
  dedup_strength: 'aggressive', // Remove repetitive chat messages
  tag_threshold: 0.7            // Moderate tag confidence
});
```

#### 3. Ingest Chat Export
```typescript
const result = await anchor_ingest({
  path: '/path/to/qwen-session-56f5e665.jsonl',
  source: 'qwen-session-56f5e665',
  type: 'chat',
  buckets: ['qwen_checkpoints'],
  wait: true  // Block until complete
});
```

#### 4. Distill Decision Record
```typescript
const distilled = await anchor_distill({
  seed: {
    buckets: ['qwen_checkpoints'],
    query: 'v4.8.2 development decisions'
  },
  radius: 2,
  output_format: 'compound',
  output_path: 'local-data/distilled/session-56f5e665-distilled.md'
});
```

#### 5. Query in Future Session
```typescript
const findings = await anchor_search({
  query: 'What did we decide about rate limiting in v4.8.2?',
  token_budget: 2000,
  include_provenance: true
});
```

---

## 📝 Agent Definition Updates

The `anchor-researcher` agent has been updated to use these new MCP tools. Key changes:

### New Workflow
```markdown
1. Check health: anchor_health → ensure DB connected
2. Configure for task: anchor_set_ingestion_config { ... }
3. Ingest if needed: anchor_ingest { path: '...', wait: true }
4. Query: anchor_search { query: '...', token_budget: 2000 }
5. Distill: anchor_distill { seed: { ... }, radius: 3 }
```

### Pre-Flight Checklist
```markdown
1. anchor_health → verify healthy
2. anchor_status → check not ingesting (or wait)
3. anchor_get_ingestion_config → verify settings appropriate for task
```

---

## 🔒 Security Considerations

### Path Validation
- All paths must be absolute
- Paths outside `PROJECT_ROOT` trigger warnings
- Path traversal protection via `realpath()` validation

### Rate Limiting
- Ingest endpoints: 10 requests/minute
- General API: 100 requests/minute
- Localhost exempt in development mode

### Health Endpoint
- Returns 200 if healthy, 503 if unhealthy
- Docker health check compatible
- No authentication required (public endpoint)

---

## 🧪 Testing

### Manual Test Commands

```bash
# Check health
curl http://localhost:3160/health

# Get ingestion status
curl http://localhost:3160/v1/system/ingest-status

# Update config
curl -X POST http://localhost:3160/v1/config/ingestion \
  -H "Content-Type: application/json" \
  -d '{"concept_density": "high", "ingestion_profile": "chat"}'

# Start ingestion
curl -X POST http://localhost:3160/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{"path": "/path/to/file.md", "source": "test", "wait": true}'
```

### MCP Tool Test (via Qwen Code)

```bash
/research v4.8.2 rate limiting implementation
```

Expected agent workflow:
1. `anchor_health` → verify healthy
2. `anchor_get_ingestion_config` → check settings
3. `anchor_search` → find rate limiting decisions
4. Synthesize answer with sources

---

## 📊 Token Savings

Using Anchor Engine MCP tools vs. raw context:

| Operation | Raw Context | With Anchor | Savings |
|-----------|-------------|-------------|---------|
| Full chat history | ~50k tokens | ~2k tokens (distilled) | 96% |
| Code search | ~10k tokens | ~500 tokens (results only) | 95% |
| Decision lookup | ~5k tokens | ~200 tokens (summary) | 96% |

**Estimated savings:** ~90-95% tokens for large context operations.

---

## 🚀 Future Enhancements

### Planned for v4.9.0
- [ ] Automatic checkpoint triggering (every N messages)
- [ ] Distilled data re-ingestion with provenance chaining
- [ ] Multi-session distillation (weekly/monthly summaries)
- [ ] Agent configuration profiles (save/load presets)

### Under Consideration
- [ ] Real-time ingestion progress streaming (SSE)
- [ ] Collaborative distillation (multi-agent consensus)
- [ ] Versioned distillation outputs (track evolution)

---

## 📚 Related Documentation

- [API.md](./API.md) - Full REST API reference
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment guide
- [CHANGELOG.md](../CHANGELOG.md) - v4.8.2 release notes
- [Agent System](../.qwen/agents/) - Qwen Code agent definitions

---

*This document should be ingested into Anchor Engine when MCP is enabled.*
