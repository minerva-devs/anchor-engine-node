# Anchor Engine - API Reference

**Version:** 4.8.0 | **Base URL:** `http://localhost:3160`

---

## Quick Reference

| Category | Endpoints |
|----------|-----------|
| **🔍 Search** | `POST /v1/memory/search`, `POST /v1/memory/explore` |
| **📦 Distill** | `POST /v1/memory/distill` |
| **📥 Ingest** | `POST /v1/ingest`, `POST /v1/ingest/streaming` |
| **📂 Files** | `GET /v1/files/read` |
| **⚙️ System** | `GET /v1/system/status`, `GET /v1/stats` |
| **🔧 Admin** | `POST /v1/admin/*` (requires auth) |

Full API map: [`specs/API-ROUTE-MAP.md`](../specs/API-ROUTE-MAP.md)

---

## 🔍 Search Endpoints

### POST `/v1/memory/search`

Search the knowledge graph using STAR algorithm.

**Request:**
```json
{
  "query": "OAuth authentication setup",
  "token_budget": 2048,
  "max_chars": 8192,
  "provenance": "all",
  "buckets": ["inbox"],
  "tags": ["authentication"],
  "strategy": "standard"
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "atom_123",
      "content": "We set up GitHub OAuth...",
      "source": "inbox/chat-2026-03-09.jsonl",
      "score": 0.95,
      "timestamp": "2026-03-09T21:41:20Z"
    }
  ],
  "metadata": {
    "atomCount": 5,
    "filledPercent": 45
  }
}
```

---

### POST `/v1/memory/explore`

Graph exploration (BFS traversal).

**Request:**
```json
{
  "seed": {
    "query": "agent frameworks",
    "limit_seeds": 8
  },
  "max_depth": 3,
  "max_nodes": 50
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "atom_456",
      "content": "...",
      "score": 0.87,
      "hop_distance": 1
    }
  ]
}
```

---

## 📦 Distill Endpoints

### POST `/v1/memory/distill`

Run radial distillation to compress knowledge.

**Request:**
```json
{
  "seed": {
    "query": "career planning"
  },
  "radius": 3,
  "max_nodes": 500,
  "output_format": "json"
}
```

**Response:**
```json
{
  "status": "success",
  "stats": {
    "compounds_processed": 15,
    "blocks_total": 234,
    "blocks_unique": 89,
    "compression_ratio": "2.6:1"
  },
  "output": {
    "path": "distills/distilled_2026-03-18.json"
  }
}
```

---

## 📥 Ingest Endpoints

### POST `/v1/ingest`

Ingest text content.

**Request:**
```json
{
  "content": "Meeting notes...",
  "filename": "meeting-2026-03-18.md",
  "bucket": "inbox"
}
```

### POST `/v1/ingest/streaming`

Stream large file ingestion with progress tracking.

---

## 📂 Files Endpoints

### GET `/v1/files/read`

Read file with optional line range.

**Request:**
```
GET /v1/files/read?path=inbox%2Fmeeting-notes.md&start_line=0&end_line=100
```

**Response:**
```json
{
  "content": "# Meeting Notes\n\n...",
  "line_count": 45
}
```

---

## ⚙️ System Endpoints

### GET `/v1/system/status`

Get system health status.

**Response:**
```json
{
  "status": "ok",
  "uptime": "2d 4h 15m",
  "memory_mb": 512
}
```

### GET `/v1/stats`

Get knowledge graph statistics.

**Response:**
```json
{
  "atoms": 314000,
  "molecules": 280000,
  "compounds": 183,
  "tags": 842
}
```

---

## 🔧 MCP Tools

For MCP clients (Claude, Cursor, Qwen Code):

| Tool | Description |
|------|-------------|
| `anchor_query` | Search memory |
| `anchor_distill` | Run distillation |
| `anchor_illuminate` | BFS traversal |
| `anchor_read_file` | Read files |
| `anchor_list_compounds` | List compounds |
| `anchor_get_stats` | Get statistics |
| `anchor_ingest_text` | Ingest text (opt-in) |
| `anchor_ingest_file` | Ingest file (opt-in) |

Full MCP docs: [`mcp-server/README.md`](../mcp-server/README.md)

---

## Authentication

Most endpoints are open for local use. Admin endpoints require API key:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:3160/v1/admin/...
```

Configure in `user_settings.json`:
```json
{
  "server": {
    "api_key": "your-secret-key"
  }
}
```

---

## Error Responses

**400 Bad Request:**
```json
{
  "status": "error",
  "error": "Invalid token_budget: must be positive integer"
}
```

**404 Not Found:**
```json
{
  "status": "error",
  "error": "File not found: inbox/missing.md"
}
```

**500 Internal Error:**
```json
{
  "status": "error",
  "error": "Database not initialized"
}
```

---

## Rate Limiting

Default: 60 requests/minute. Configure in `user_settings.json`:
```json
{
  "rate_limit": {
    "requests_per_minute": 100
  }
}
```

---

## Examples

### Search with Context
```bash
curl -X POST http://localhost:3160/v1/memory/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What did we discuss about OAuth?",
    "token_budget": 4096
  }'
```

### Distill Knowledge
```bash
curl -X POST http://localhost:3160/v1/memory/distill \
  -H "Content-Type: application/json" \
  -d '{
    "seed": {"query": "AI agents"},
    "radius": 3
  }'
```

### Ingest Text
```bash
curl -X POST http://localhost:3160/v1/research/upload-raw \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Meeting notes...",
    "filename": "notes.md",
    "bucket": "inbox"
  }'
```
