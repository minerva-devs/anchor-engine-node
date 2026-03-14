# API Route Map

Complete reference for Anchor Engine API endpoints.

## Route Categories

| Category | Purpose | Library Analogy | Example |
|----------|---------|-----------------|---------|
| **🔍 Search Routes** | Find specific content | "Find books about dragons" | `/v1/memory/search` |
| **🧭 Explore Routes** | Discover connections | "Show me books by this author + related authors" | `/v1/memory/explore` |
| **📦 Distill Routes** | Compress knowledge | "Summarize all dragon lore across all books" | `/v1/memory/distill` |
| **📥 Ingest Routes** | Add new content | "Add this new book to the library" | `/v1/ingest` |
| **📥 Streaming Ingest Routes** | Add large content with progress tracking | "Add this huge book with progress" | `/v1/ingest/streaming` |
| **📂 File Routes** | Read/upload files | "Read this specific book" | `/v1/files/read` |
| **⚙️ System Routes** | Management | "Is the library open?" | `/v1/system/status` |
| **🐙 Git Routes** | GitHub integration | "Import from GitHub" | `/v1/github/repos` |
| **🛡️ Admin Routes** | Security/monitoring | "Admin panel" | `/v1/terminal/exec` |

## Route Decision Tree

**Need to...?** → **Use this route:**

- Find specific content → `/v1/memory/search` (Standard 004: Streaming Search)
- Explore connections → `/v1/memory/explore` (Standard 009: BFS Traversal)
- Compress knowledge → `/v1/memory/distill` (Standard 008: Radial Distillation)
- Add new content → `/v1/ingest` (Standard 115: Atomic Ingestion)
- Add large content with progress tracking → `/v1/ingest/streaming` (Streaming Ingestion)
- Read files → `/v1/files/read` (Standard 101: Byte Offset Protocol)
- Monitor system → `/v1/system/*` (Standard 102: Centralized Config)
- GitHub integration → `/v1/github/*` (Standard 115: GitHub Ingestion)
- Security tools → `/v1/terminal/exec` (Standard 129: Command Injection Prevention)

## Search Routes

### `POST /v1/memory/search`

**Purpose:** Primary search endpoint with streaming results

**Use when:** You need to find specific content by query

**Request:**
```json
{
  "query": "Zod validation schemas",
  "max_chars": 5000,
  "buckets": ["anchor-engine-node"],
  "provenance": "all",
  "strategy": "standard",
  "batch_size": 20
}
```

**Response:** Server-Sent Events (SSE) stream

**Schema:** `searchSchema` (see `engine/src/schemas/api-schemas.ts`)

---

### `POST /v1/memory/molecule-search`

**Purpose:** Search with molecule-level granularity

**Use when:** You need fine-grained paragraph-level results

**Request:**
```json
{
  "query": "streaming search implementation",
  "deep": false,
  "max_chars": 8000
}
```

**Schema:** `moleculeSearchSchema`

---

### `POST /v1/memory/search-max-recall`

**Purpose:** Maximum recall search for comprehensive results

**Use when:** You need to find everything related to a topic

**Request:**
```json
{
  "query": "physics tag walker",
  "max_chars": 16384
}
```

**Schema:** `maxRecallSearchSchema`

---

## Explore Routes

### `POST /v1/memory/explore`

**Purpose:** Graph-based exploration (Illuminate algorithm)

**Use when:** You want to discover connections and related concepts

**Request:**
```json
{
  "seed": {
    "query": "radial distillation",
    "global": false
  },
  "max_depth": 3,
  "max_nodes": 50,
  "format": "flat"
}
```

**Schema:** `exploreSchema`

---

## Distill Routes

### `POST /v1/memory/distill`

**Purpose:** Lossless corpus compression

**Use when:** You need a condensed summary of a topic across multiple documents

**Request:**
```json
{
  "seed": {
    "query": "Anchor Engine architecture"
  },
  "radius": 3,
  "max_nodes": 500,
  "output_format": "yaml",
  "normalization": "strict"
}
```

**Schema:** `distillSchema`

---

## Ingest Routes

### `POST /v1/ingest`

**Purpose:** Add new content to the knowledge graph

**Use when:** You have new documents, code, or text to index

**Request:**
```json
{
  "content": "Full text content here...",
  "source": "github:RSBalchII/anchor-engine-node:README.md",
  "type": "markdown",
  "bucket": "anchor-engine-node",
  "tags": ["documentation", "readme"]
}
```

**Schema:** `ingestSchema`

---

### `POST /v1/ingest/streaming`

**Purpose:** Add large content with progress tracking and memory-efficient processing

**Use when:** You have large files (>1MB) to index without memory issues

**Request:**
```json
{
  "content": "Large text content here...",
  "source": "large_document.pdf",
  "type": "pdf",
  "bucket": "documents",
  "tags": ["large_file", "pdf"],
  "chunk_size": 1048576,  // 1MB chunks (optional)
  "batch_size": 50        // Items per batch (optional)
}
```

**Response:** Progress updates and final result

**Schema:** `ingestSchema` (same as regular ingest)

**Features:**
- Processes large files in configurable chunks
- Provides progress tracking via callbacks
- Memory-efficient to prevent OOM errors
- Automatically falls back to regular ingestion for smaller files

---

## File Routes

### `GET /v1/files/read`

**Purpose:** Read file content with optional line range

**Use when:** You need to read a specific file

**Request:**
```
GET /v1/files/read?path=/path/to/file.ts&start_line=0&end_line=100
```

**Schema:** `fileReadSchema`

---

## System Routes

### `GET /v1/system/status`

**Purpose:** Check system health and database status

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-03-12T22:00:00.000Z",
  "message": "Anchor Context Engine is running and database is responsive"
}
```

### `GET /v1/stats`

**Purpose:** Get database statistics

**Response:**
```json
{
  "atoms": 281690,
  "molecules": 45230,
  "compounds": 1250
}
```

---

## Git Routes

### `POST /v1/github/repos`

**Purpose:** Register GitHub repository for ingestion

**Use when:** You want to ingest an entire GitHub repository

**Request:**
```json
{
  "url": "https://github.com/username/repo",
  "bucket": "repo-name",
  "include_history": false
}
```

**Schema:** `githubRepoSchema`

---

## Admin Routes

### `POST /v1/terminal/exec`

**Purpose:** Execute terminal commands (secure sandbox)

**Use when:** You need to run system commands safely

**Request:**
```json
{
  "command": "ls -la"
}
```

**Schema:** `terminalExecSchema`

---

## Shared Schemas

All validation uses shared Zod schemas from `engine/src/schemas/api-schemas.ts`:

| Schema | Used By |
|--------|---------|
| `contextOptionsSchema` | Base for search/explore/distill |
| `searchSchema` | `/v1/memory/search` |
| `moleculeSearchSchema` | `/v1/memory/molecule-search` |
| `maxRecallSearchSchema` | `/v1/memory/search-max-recall` |
| `ingestSchema` | `/v1/ingest` |
| `exploreSchema` | `/v1/memory/explore` |
| `distillSchema` | `/v1/memory/distill` |
| `fileReadSchema` | `/v1/files/read` |
| `errorResponseSchema` | All error responses |

---

## Related Standards

- **Standard 104:** Universal Semantic Search
- **Standard 009:** Illuminate BFS Traversal
- **Standard 008:** Radial Distillation
- **Standard 004:** Streaming Search