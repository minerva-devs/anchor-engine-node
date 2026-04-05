# Anchor Engine - API Endpoints Reference

**Version:** 4.9.5 | **Base URL:** `http://localhost:3160` | **Last Updated:** 2026-03-25

Complete reference for all Anchor Engine HTTP API endpoints.

---

## Table of Contents

- [Authentication](#authentication)
- [Search Endpoints](#search-endpoints)
- [Distill Endpoints](#distill-endpoints)
- [Ingest Endpoints](#ingest-endpoints)
- [File Endpoints](#file-endpoints)
- [System Endpoints](#system-endpoints)
- [Admin Endpoints](#admin-endpoints)
- [Watchdog Endpoints](#watchdog-endpoints)
- [Error Responses](#error-responses)
- [Rate Limiting](#rate-limiting)

---

## Authentication

Most endpoints are open for local use. Admin endpoints require API key authentication.

### API Key Configuration

**user_settings.json:**
```json
{
  "server": {
    "api_key": "your-secret-key-here"
  }
}
```

**Environment Variable:**
```bash
export ANCHOR_API_KEY="your-secret-key-here"
```

### Using API Key

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:3160/v1/admin/...
```

---

## Search Endpoints

### POST `/v1/memory/search`

Search the knowledge graph using the STAR (Semantic Temporal Associative Retrieval) algorithm.

**Request Body:**
```json
{
  "query": "OAuth authentication setup",
  "token_budget": 2048,
  "max_chars": 8192,
  "provenance": "all",
  "buckets": ["inbox"],
  "tags": ["authentication", "github"],
  "strategy": "standard",
  "max_results": 50
}
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | - | Natural language search query |
| `token_budget` | integer | No | 2048 | Target token count for results |
| `max_chars` | integer | No | 8192 | Maximum character limit |
| `provenance` | string | No | `"all"` | Include provenance: `"all"`, `"minimal"`, `"none"` |
| `buckets` | array | No | `[]` | Filter by buckets (empty = all) |
| `tags` | array | No | `[]` | Filter by tags (empty = all) |
| `strategy` | string | No | `"standard"` | Search strategy: `"standard"`, `"max-recall"`, `"exact"` |
| `max_results` | integer | No | 50 | Maximum number of results |

**Search Strategies:**

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `standard` | Hybrid FTS + semantic scoring | Default, balanced results |
| `max-recall` | Multi-hop traversal | Comprehensive research |
| `exact` | FTS only, no physics scoring | Precise keyword matching |

**Response:**
```json
{
  "results": [
    {
      "id": "atom_123",
      "content": "We set up GitHub OAuth with client ID and secret...",
      "source": "inbox/chat-2026-03-09.jsonl",
      "source_path": "/home/user/notebook/inbox/chat-2026-03-09.jsonl",
      "score": 0.95,
      "timestamp": "2026-03-09T21:41:20Z",
      "bucket": "inbox",
      "tags": ["authentication", "github", "oauth"],
      "byte_offset": 1234,
      "byte_length": 512,
      "provenance": {
        "shared_tags": ["authentication", "github"],
        "hop_distance": 1,
        "recency_score": 0.87,
        "structural_similarity": 0.92
      }
    }
  ],
  "metadata": {
    "atomCount": 5,
    "filledPercent": 45,
    "tokenCount": 1847,
    "searchTimeMs": 42,
    "strategy": "standard"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3160/v1/memory/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What did we discuss about OAuth?",
    "token_budget": 4096,
    "strategy": "standard"
  }'
```

---

### POST `/v1/memory/explore`

Graph exploration using BFS (Breadth-First Search) traversal.

**Request Body:**
```json
{
  "seed": {
    "query": "agent frameworks",
    "limit_seeds": 8
  },
  "max_depth": 3,
  "max_nodes": 50,
  "buckets": ["inbox"]
}
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `seed.query` | string | Yes | - | Seed query for initial atoms |
| `seed.limit_seeds` | integer | No | 8 | Number of seed atoms |
| `max_depth` | integer | No | 3 | Maximum hop depth |
| `max_nodes` | integer | No | 50 | Maximum nodes to explore |
| `buckets` | array | No | `[]` | Filter by buckets |

**Response:**
```json
{
  "results": [
    {
      "id": "atom_456",
      "content": "Agent frameworks allow modular AI behavior...",
      "source": "inbox/agents.md",
      "score": 0.87,
      "hop_distance": 1,
      "depth": 1,
      "tags": ["agents", "architecture"]
    }
  ],
  "metadata": {
    "nodes_explored": 23,
    "max_depth_reached": 2,
    "seed_count": 5
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3160/v1/memory/explore \
  -H "Content-Type: application/json" \
  -d '{
    "seed": {"query": "machine learning", "limit_seeds": 5},
    "max_depth": 2,
    "max_nodes": 30
  }'
```

---

### POST `/v1/memory/search/index`

Fast session index search (chat session lookup).

**Request Body:**
```json
{
  "query": "career planning discussion",
  "session_id": "abc-123"
}
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | - | Search query |
| `session_id` | string | No | `null` | Filter by session ID |

**Response:**
```json
{
  "results": [
    {
      "id": "session_abc-123",
      "session_id": "abc-123",
      "title": "Career Planning Discussion",
      "timestamp": "2026-03-20T14:30:00Z",
      "message_count": 45,
      "preview": "Let's discuss your career goals..."
    }
  ],
  "metadata": {
    "total_sessions": 1,
    "search_time_ms": 15
  }
}
```

---

## Distill Endpoints

### POST `/v1/memory/distill`

Run radial distillation to compress knowledge into a deduplicated source-of-truth file.

**Request Body:**
```json
{
  "seed": {
    "query": "career planning"
  },
  "radius": 3,
  "max_nodes": 500,
  "output_format": "yaml",
  "buckets": ["inbox"]
}
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `seed.query` | string | Yes | - | Seed query for distillation |
| `radius` | integer | No | 3 | Search radius in graph hops |
| `max_nodes` | integer | No | 500 | Maximum nodes to process |
| `output_format` | string | No | `"yaml"` | Output format: `"yaml"`, `"md"`, `"json"` |
| `buckets` | array | No | `[]` | Filter by buckets |

**Output Formats:**

| Format | Description | Use Case |
|--------|-------------|----------|
| `yaml` | YAML source of truth | Knowledge checkpoints |
| `md` | Markdown document | Human-readable summaries |
| `json` | Structured JSON | Programmatic processing |

**Response:**
```json
{
  "status": "success",
  "stats": {
    "compounds_processed": 15,
    "blocks_total": 234,
    "blocks_unique": 89,
    "compression_ratio": "2.6:1",
    "deduplication_savings": "62%"
  },
  "output": {
    "path": "distills/distilled_2026-03-25T14-30-00Z.yaml",
    "format": "yaml",
    "size_bytes": 45678
  },
  "metadata": {
    "seed_query": "career planning",
    "radius": 3,
    "max_nodes": 500,
    "duration_ms": 2341
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3160/v1/memory/distill \
  -H "Content-Type: application/json" \
  -d '{
    "seed": {"query": "AI agents"},
    "radius": 3,
    "output_format": "md"
  }'
```

---

## Ingest Endpoints

### POST `/v1/research/upload-raw`

Ingest raw text content into the knowledge graph.

**Request Body:**
```json
{
  "content": "Meeting notes from today...\n\nAction items:\n1. Review PR #123",
  "filename": "meeting-2026-03-25.md",
  "bucket": "inbox",
  "tags": ["meetings", "action-items"]
}
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `content` | string | Yes | - | Raw text content to ingest |
| `filename` | string | Yes | - | Filename for provenance |
| `bucket` | string | No | `"external-inbox"` | Destination bucket: `"inbox"`, `"external-inbox"` |
| `tags` | array | No | `[]` | Manual tags (auto-extracted if empty) |

**Bucket Selection:**

| Bucket | Use Case | Retrieval Boost |
|--------|----------|-----------------|
| `inbox` | Content you created (sovereign) | 3.0x |
| `external-inbox` | External content (imported) | 1.0x |

**Response:**
```json
{
  "status": "success",
  "message": "Content ingested successfully",
  "stats": {
    "characters": 1234,
    "molecules": 15,
    "atoms": 23
  },
  "metadata": {
    "filename": "meeting-2026-03-25.md",
    "bucket": "inbox",
    "tags": ["meetings", "action-items"],
    "timestamp": "2026-03-25T14:30:00Z"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3160/v1/research/upload-raw \
  -H "Content-Type: application/json" \
  -d '{
    "content": "The STAR algorithm uses physics-based scoring...",
    "filename": "star-notes.md",
    "bucket": "inbox"
  }'
```

---

### POST `/v1/ingest/streaming`

Stream large file ingestion with progress tracking.

**Request:** `multipart/form-data`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | file | Yes | File to ingest |
| `bucket` | string | No | Destination bucket (default: `external-inbox`) |
| `chunk_size` | integer | No | Chunk size in bytes (default: 1048576) |

**Response (Initial):**
```json
{
  "status": "streaming",
  "upload_id": "upload_abc123",
  "message": "Streaming ingestion started"
}
```

**Progress Updates (WebSocket):**
```json
{
  "upload_id": "upload_abc123",
  "progress": {
    "bytes_received": 5242880,
    "bytes_total": 10485760,
    "percent": 50,
    "molecules_ingested": 1250,
    "atoms_ingested": 1890
  }
}
```

**Completion:**
```json
{
  "status": "complete",
  "upload_id": "upload_abc123",
  "stats": {
    "file_size_bytes": 10485760,
    "molecules": 2500,
    "atoms": 3780,
    "duration_seconds": 45
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3160/v1/ingest/streaming \
  -F "file=@large-file.txt" \
  -F "bucket=inbox"
```

---

### GET `/v1/ingest/status`

Get current ingestion status and progress.

**Response:**
```json
{
  "status": "idle",
  "active_uploads": 0,
  "pending_files": 0,
  "last_ingestion": {
    "timestamp": "2026-03-25T14:30:00Z",
    "files_processed": 5,
    "atoms_ingested": 1234
  }
}
```

**Status Values:**

| Status | Description |
|--------|-------------|
| `idle` | No active ingestion |
| `streaming` | Streaming upload in progress |
| `processing` | Processing uploaded content |
| `error` | Ingestion failed |

---

## File Endpoints

### GET `/v1/files/read`

Read file content with optional line range (token-efficient).

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `path` | string | Yes | - | File path (URL-encoded) |
| `start_line` | integer | No | 0 | Starting line number (0-indexed) |
| `end_line` | integer | No | - | Ending line number (exclusive) |

**Request:**
```
GET /v1/files/read?path=inbox%2Fmeeting-notes.md&start_line=0&end_line=100
```

**Response:**
```json
{
  "content": "# Meeting Notes\n\nDate: 2026-03-25\n\nAttendees: ...\n",
  "line_count": 45,
  "start_line": 0,
  "end_line": 45,
  "metadata": {
    "path": "inbox/meeting-notes.md",
    "size_bytes": 2048,
    "last_modified": "2026-03-25T14:30:00Z"
  }
}
```

**Example:**
```bash
# Read entire file
curl "http://localhost:3160/v1/files/read?path=inbox%2Fnotes.md"

# Read first 100 lines
curl "http://localhost:3160/v1/files/read?path=inbox%2Fnotes.md&start_line=0&end_line=100"

# Read lines 50-150
curl "http://localhost:3160/v1/files/read?path=inbox%2Fnotes.md&start_line=50&end_line=150"
```

---

### GET `/v1/files/list`

List available compounds (source files).

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `bucket` | string | No | `null` | Filter by bucket |
| `limit` | integer | No | 50 | Maximum results |
| `offset` | integer | No | 0 | Pagination offset |

**Request:**
```
GET /v1/files/list?bucket=inbox&limit=20
```

**Response:**
```json
{
  "compounds": [
    {
      "id": "compound_123",
      "filename": "meeting-2026-03-25.md",
      "bucket": "inbox",
      "path": "inbox/meeting-2026-03-25.md",
      "size_bytes": 4567,
      "molecules": 45,
      "atoms": 67,
      "ingested_at": "2026-03-25T14:30:00Z"
    }
  ],
  "metadata": {
    "total": 156,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

---

## System Endpoints

### GET `/v1/system/status`

Get system health status.

**Response:**
```json
{
  "status": "ok",
  "uptime": "2d 4h 15m 32s",
  "uptime_seconds": 201332,
  "memory_mb": 512,
  "memory_rss_mb": 645,
  "version": "4.9.5",
  "node_version": "v20.11.0",
  "platform": "linux",
  "database": {
    "status": "ready",
    "atoms": 314000,
    "molecules": 280000
  }
}
```

**Status Values:**

| Status | Description |
|--------|-------------|
| `ok` | System healthy |
| `degraded` | Some features unavailable |
| `error` | System error |
| `initializing` | Startup in progress |

---

### GET `/v1/stats`

Get knowledge graph statistics.

**Response:**
```json
{
  "atoms": 314000,
  "molecules": 280000,
  "compounds": 183,
  "tags": 842,
  "buckets": {
    "inbox": {
      "atoms": 250000,
      "molecules": 220000,
      "compounds": 145
    },
    "external-inbox": {
      "atoms": 64000,
      "molecules": 60000,
      "compounds": 38
    }
  },
  "storage": {
    "database_size_mb": 256,
    "mirrored_brain_size_mb": 512,
    "total_size_mb": 768
  },
  "performance": {
    "avg_search_ms": 42,
    "p95_search_ms": 125,
    "p99_search_ms": 198
  }
}
```

---

### GET `/health`

Simple health check endpoint (no authentication).

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-25T14:30:00Z"
}
```

**HTTP Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Healthy |
| 503 | Unhealthy |

---

### POST `/v1/system/gc`

Trigger manual garbage collection.

**Response:**
```json
{
  "status": "success",
  "gc_stats": {
    "before_mb": 768,
    "after_mb": 512,
    "freed_mb": 256
  }
}
```

---

### POST `/v1/system/vacuum`

Run database vacuum (PGlite).

**Response:**
```json
{
  "status": "success",
  "vacuum_stats": {
    "before_mb": 300,
    "after_mb": 256,
    "freed_mb": 44
  }
}
```

---

## Admin Endpoints

**Note:** All admin endpoints require API key authentication.

### POST `/v1/admin/reset`

Reset the database (wipe and rebuild).

**Request Body:**
```json
{
  "confirm": true,
  "preserve_inbox": true
}
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `confirm` | boolean | Yes | - | Must be `true` to confirm |
| `preserve_inbox` | boolean | No | `true` | Preserve inbox files |

**Response:**
```json
{
  "status": "success",
  "message": "Database reset initiated. Rebuilding from inbox...",
  "estimated_time_seconds": 120
}
```

---

### POST `/v1/admin/watchdog/start`

Start the automatic file watcher service.

**Response:**
```json
{
  "status": "success",
  "message": "Watchdog service started"
}
```

---

### POST `/v1/admin/watchdog/stop`

Stop the automatic file watcher service.

**Response:**
```json
{
  "status": "success",
  "message": "Watchdog service stopped"
}
```

---

### GET `/v1/admin/watchdog/status`

Get watchdog service status.

**Response:**
```json
{
  "status": "active",
  "watched_paths": [
    "/home/user/notebook/inbox",
    "/home/user/notebook/external-inbox"
  ],
  "pending_files": 3,
  "last_ingestion": "2026-03-25T14:30:00Z",
  "files_ingested_today": 15
}
```

---

### POST `/v1/admin/cache/clear`

Clear various caches.

**Request Body:**
```json
{
  "cache_type": "all"
}
```

**Cache Types:**

| Type | Description |
|------|-------------|
| `search` | Search result cache |
| `tag` | Tag extraction cache |
| `all` | All caches |

**Response:**
```json
{
  "status": "success",
  "cleared": ["search", "tag"]
}
```

---

## Watchdog Endpoints

### GET `/v1/watchdog/status`

Get watchdog service status (alias for `/v1/admin/watchdog/status`).

**Response:**
```json
{
  "active": true,
  "watched_paths": ["/home/user/notebook/inbox"],
  "pending_files": 0,
  "last_run": "2026-03-25T14:30:00Z"
}
```

---

### POST `/v1/watchdog/ingest`

Trigger manual ingestion run.

**Response:**
```json
{
  "status": "success",
  "message": "Manual ingestion triggered",
  "files_to_process": 3
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "status": "error",
  "error": "Invalid token_budget: must be positive integer",
  "code": "INVALID_PARAMETER"
}
```

### 401 Unauthorized

```json
{
  "status": "error",
  "error": "Invalid or missing API key",
  "code": "UNAUTHORIZED"
}
```

### 404 Not Found

```json
{
  "status": "error",
  "error": "File not found: inbox/missing.md",
  "code": "NOT_FOUND"
}
```

### 429 Too Many Requests

```json
{
  "status": "error",
  "error": "Rate limit exceeded. Try again in 30 seconds",
  "code": "RATE_LIMITED",
  "retry_after_seconds": 30
}
```

### 500 Internal Server Error

```json
{
  "status": "error",
  "error": "Database not initialized",
  "code": "INTERNAL_ERROR",
  "trace_id": "abc123"
}
```

### 503 Service Unavailable

```json
{
  "status": "error",
  "error": "Service unavailable: database initializing",
  "code": "SERVICE_UNAVAILABLE",
  "retry_after_seconds": 10
}
```

---

## Rate Limiting

Default rate limits:

| Endpoint Category | Requests/Minute |
|-------------------|-----------------|
| Search | 60 |
| Distill | 10 |
| Ingest | 30 |
| File Read | 120 |
| Admin | 20 |

**Configure in `user_settings.json`:**
```json
{
  "rate_limit": {
    "requests_per_minute": 100,
    "burst_size": 20
  }
}
```

**Rate Limit Headers:**

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests per minute |
| `X-RateLimit-Remaining` | Remaining requests |
| `X-RateLimit-Reset` | Unix timestamp for reset |
| `Retry-After` | Seconds to wait (on 429) |

---

## Examples

### Complete Workflow

```bash
# 1. Ingest content
curl -X POST http://localhost:3160/v1/research/upload-raw \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Meeting notes about OAuth setup...",
    "filename": "meeting-notes.md",
    "bucket": "inbox"
  }'

# 2. Search for content
curl -X POST http://localhost:3160/v1/memory/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "OAuth authentication",
    "token_budget": 2048
  }'

# 3. Distill knowledge
curl -X POST http://localhost:3160/v1/memory/distill \
  -H "Content-Type: application/json" \
  -d '{
    "seed": {"query": "OAuth"},
    "radius": 2,
    "output_format": "md"
  }'

# 4. Read distilled file
curl "http://localhost:3160/v1/files/read?path=distills%2Fdistilled_2026-03-25.md"
```

### MCP Tool Equivalents

| API Endpoint | MCP Tool |
|--------------|----------|
| `POST /v1/memory/search` | `anchor_query` |
| `POST /v1/memory/distill` | `anchor_distill` |
| `POST /v1/memory/explore` | `anchor_illuminate` |
| `GET /v1/files/read` | `anchor_read_file` |
| `GET /v1/files/list` | `anchor_list_compounds` |
| `GET /v1/stats` | `anchor_get_stats` |
| `POST /v1/research/upload-raw` | `anchor_ingest_text` |

---

## Related Documentation

- [MCP Server README](../../mcp-server/README.md) - MCP tool reference
- [Troubleshooting Guide](../troubleshooting/common-issues.md) - Common API issues
- [Configuration Guide](../CONFIGURATION_SINGLE_SOURCE_OF_TRUTH.md) - Server settings

---

## Changelog

### 2026-03-25 (v4.9.5)
- Added `/v1/memory/search/index` endpoint for session lookup
- Added `/v1/ingest/status` endpoint
- Documented rate limiting headers
- Added error code reference

### 2026-03-18 (v4.8.0)
- Added streaming ingestion endpoint
- Added watchdog endpoints
- Updated bucket selection documentation
