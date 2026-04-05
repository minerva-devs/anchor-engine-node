# API Contracts - Anchor Engine

**Version:** 1.0.0  
**Date:** February 27, 2026  
**Base URL:** `http://localhost:3160`

---

## Overview

This document provides concrete API examples for integrating with Anchor Engine. All endpoints return JSON responses.

---

## Authentication

Most `/v1/*` endpoints require an API key configured in `user_settings.json`:

```json
{
  "api_key": "your-secret-key-here"
}
```

Include in requests:
```bash
curl -H "X-API-Key: your-secret-key-here" http://localhost:3160/v1/...
```

---

## Search Endpoints

### POST /v1/memory/search

Search for context matching query.

**Request:**
```json
{
  "query": "consciousness emergence",
  "max_chars": 4096,
  "token_budget": 2048,
  "provenance": "all",
  "buckets": ["research", "notes"],
  "use_max_recall": false
}
```

**Response:**
```json
{
  "status": "success",
  "results": [
    {
      "id": "mem_1234567890_abc123",
      "content": "Discussion about consciousness and emergent properties...",
      "source": "inbox/research/consciousness-notes.yaml",
      "timestamp": 1700000000000,
      "buckets": ["research"],
      "tags": ["#consciousness", "#emergence", "#philosophy"],
      "provenance": "internal",
      "score": 0.85,
      "compound_id": "cmp_abc123",
      "start_byte": 1024,
      "end_byte": 2048
    }
  ],
  "context": "Formatted context string for LLM...",
  "metadata": {
    "total_results": 15,
    "query_time_ms": 145
  }
}
```

**Error Response:**
```json
{
  "error": "Query too short",
  "message": "Query must be at least 3 characters"
}
```

---

## Memory Endpoints

### POST /v1/memory/explore

BFS graph traversal — returns the connected subgraph from seed concepts. See [Standard 128](128-illuminate-bfs-traversal.md) for full specification.

**Request:**
```json
{
  "seed": {
    "query": "physics walker STAR algorithm",
    "limit_seeds": 5
  },
  "max_depth": 2,
  "min_weight": 0.1,
  "max_nodes": 50,
  "format": "flat"
}
```

**Response (flat):**
```json
{
  "results": [
    {
      "id": "atom_abc123",
      "content": "PhysicsTagWalker traverses the co-occurrence graph...",
      "source": "engine/src/services/search/physics-tag-walker.ts",
      "tags": ["#function", "#STAR"],
      "score": 1
    }
  ],
  "nodes": [...],
  "stats": {
    "nodes_count": 30,
    "seed_nodes": 5,
    "max_depth_achieved": 2,
    "strategy": "edge-bfs"
  },
  "duration_ms": 19
}
```

**graph format** (set `"format": "graph"`): also returns `"edges": [{ "source": "atom_...", "target": "atom_...", "weight": 0.85 }]`.

---

## Ingestion Endpoints

### POST /v1/ingest

Ingest content into the knowledge base.

**Request:**
```json
{
  "content": "Meeting notes from today's discussion about AI safety...",
  "source": "inbox/meetings/2026-02-27-ai-safety.yaml",
  "type": "text",
  "bucket": "meetings",
  "tags": ["#ai-safety", "#meeting", "#2026"]
}
```

**Response:**
```json
{
  "status": "success",
  "id": "cmp_abc123def456",
  "message": "Ingested 15 atoms and 3 molecules",
  "duration_ms": 234
}
```

**Error Response:**
```json
{
  "status": "skipped",
  "message": "Content with same hash already exists"
}
```

---

## Tag Management

### GET /v1/buckets

List all buckets in the system.

**Response:**
```json
{
  "buckets": [
    "research",
    "meetings",
    "notes",
    "code",
    "personal"
  ]
}
```

### GET /v1/tags

List all tags, optionally filtered by buckets.

**Request:**
```
GET /v1/tags?buckets=research,notes
```

**Response:**
```json
{
  "tags": [
    "#ai-safety",
    "#architecture",
    "#consciousness",
    "#emergence",
    "#machine-learning",
    "#notes",
    "#research"
  ]
}
```

---

## System Control

### GET /v1/stats

Get system statistics.

**Response:**
```json
{
  "atoms": 1500,
  "molecules": 280000,
  "sources": 436,
  "tags": 350,
  "query_time_ms": 12
}
```

### GET /v1/watchdog/status

Get file watcher status.

**Response:**
```json
{
  "status": "success",
  "isRunning": true,
  "watchedPaths": [
    "/home/user/anchor-engine-node/inbox",
    "/home/user/anchor-engine-node/external-inbox",
    "/home/user/documents/knowledge"
  ]
}
```

### POST /v1/watchdog/start

Start the file watcher.

**Response:**
```json
{
  "status": "success",
  "message": "Watchdog started"
}
```

### POST /v1/watchdog/stop

Stop the file watcher.

**Response:**
```json
{
  "status": "success",
  "message": "Watchdog stopped"
}
```

### POST /v1/watchdog/ingest

Trigger manual ingestion scan.

**Response:**
```json
{
  "status": "success",
  "message": "Manual ingest complete: 15/20 files processed",
  "filesProcessed": 20,
  "filesIngested": 15
}
```

---

## Settings Management

### GET /v1/settings

Get all settings from `user_settings.json`.

**Response:**
```json
{
  "status": "success",
  "settings": {
    "server": {
      "host": "0.0.0.0",
      "port": 3160
    },
    "tagging": {
      "modulation_level": 50,
      "blacklist_strictness": 75,
      "atom_as_tag": false,
      "strict_atom_selection": true
    },
    "search": {
      "max_chars_default": 524288,
      "strategy": "hybrid"
    },
    "physics": {
      "time_decay_lambda": 0.00001,
      "damping_factor": 0.85,
      "temperature": 0.2
    }
  }
}
```

### PUT /v1/settings

Update all settings.

**Request:**
```json
{
  "tagging": {
    "modulation_level": 75,
    "blacklist_strictness": 80
  },
  "physics": {
    "time_decay_lambda": 0.000005
  }
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Settings updated successfully"
}
```

### PUT /v1/settings/tagging

Update specific category.

**Request:**
```json
{
  "modulation_level": 60,
  "strict_atom_selection": true
}
```

**Response:**
```json
{
  "status": "success",
  "message": "tagging settings updated",
  "settings": {
    "modulation_level": 60,
    "strict_atom_selection": true
  }
}
```

---

## Health & Monitoring

### GET /health

Basic health check.

**Response (Healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-27T20:00:00.000Z",
  "uptime": 3600,
  "components": [
    {
      "name": "database",
      "status": "healthy"
    },
    {
      "name": "search",
      "status": "healthy"
    }
  ]
}
```

**Response (Degraded):**
```json
{
  "status": "degraded",
  "timestamp": "2026-02-27T20:00:00.000Z",
  "components": [
    {
      "name": "database",
      "status": "healthy"
    },
    {
      "name": "search",
      "status": "degraded",
      "message": "High latency detected"
    }
  ]
}
```

### GET /v1/system/memory

Get memory usage statistics.

**Response:**
```json
{
  "status": "success",
  "memory": {
    "rss": 299,
    "heapUsed": 150,
    "heapTotal": 512,
    "percentageUsed": 29.3
  },
  "idle": {
    "isIdle": false,
    "lastActivity": "2026-02-27T19:55:00.000Z"
  },
  "timestamp": "2026-02-27T20:00:00.000Z"
}
```

---

## Agent Integration Examples

### OpenCLAW Integration

```javascript
// Search for context
const searchResponse = await fetch('http://localhost:3160/v1/memory/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key'
  },
  body: JSON.stringify({
    query: "user's current task context",
    max_chars: 8192,
    token_budget: 4096
  })
});

const { context, results } = await searchResponse.json();

// Include context in agent prompt
const prompt = `
Context from knowledge base:
${context}

User query: ${userQuery}

Respond based on the context above.
`;
```

### CUA (Computer Use Agent) Integration

```python
import requests

def get_context(query, max_tokens=2048):
    response = requests.post(
        'http://localhost:3160/v1/memory/search',
        json={
            'query': query,
            'token_budget': max_tokens,
            'provenance': 'all'
        }
    )
    return response.json()['context']

# Use in agent loop
context = get_context("previous computer interaction history")
agent_prompt = f"""
You are controlling a computer. Previous context:
{context}

Current task: {task}
"""
```

---

## Error Handling

### Common Error Codes

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad request | Check request format |
| 401 | Unauthorized | Include valid API key |
| 404 | Not found | Check endpoint path |
| 503 | Service unavailable | Wait for initialization |

### Error Response Format

```json
{
  "error": "Error type",
  "message": "Human-readable description",
  "details": {
    "field": "value"
  }
}
```

---

## Rate Limiting

Default limits (configurable):
- **Search:** 100 requests/minute
- **Ingestion:** 10 requests/minute
- **Settings:** 5 requests/minute

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1700000060
```

---

## Versioning

API version is included in the path: `/v1/...`

Breaking changes will increment the major version: `/v2/...`

---

## Related Documentation

- [Benchmark Protocol](./benchmark-protocol.md) - Performance testing
- [STAR Parameter Tuning](./standards/078-parameter-tuning.md) - Optimization guide
- [Security Guide](./security-guide.md) - Deployment security

---

**Last Updated:** February 27, 2026  
**API Version:** 1.0.0
