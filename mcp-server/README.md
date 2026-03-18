# Anchor Engine MCP Server

Model Context Protocol (MCP) server for Anchor Engine. Exposes your knowledge graph to any MCP-compatible AI client (Claude, Cursor, Qwen Code, etc.).

## Features

### Read Operations (Always Available)
- **🔍 Semantic Search** - Query your memory with `anchor_query`
- **🧪 Radial Distillation** - Compress knowledge into source-of-truth files
- **🌐 Graph Exploration** - BFS traversal with `anchor_illuminate`
- **📄 Token-Efficient Reading** - Read files by line ranges
- **📊 Real-time Stats** - Monitor your knowledge graph

### Write Operations (Opt-In, Disabled by Default)
- **📝 Text Ingestion** - Add raw text content with `anchor_ingest_text`
- **📁 File Ingestion** - Ingest files from filesystem with `anchor_ingest_file`
- **🪣 Bucket Selection** - Choose `inbox` (sovereign) or `external-inbox` (external)
- **🔐 Security Toggle** - Enable/disable write operations via settings

---

## What's New in v4.8.0

### Write Operations (NEW!)

The MCP server now supports **ingesting content** into Anchor Engine, not just querying it. This allows AI agents to add knowledge to your memory graph.

**Two New Tools:**

1. **`anchor_ingest_text`** - Add raw text content
   - Perfect for: Meeting notes, thoughts, code snippets, emails
   - Deterministic atomization (no LLM processing)
   - Bucket selection: `inbox` (sovereign) or `external-inbox` (external)

2. **`anchor_ingest_file`** - Ingest files from filesystem
   - Perfect for: Documents, articles, downloaded content
   - Reads file and ingests in one operation
   - Defaults to `external-inbox` for safety

**Security First:**
- Write operations are **disabled by default**
- Must explicitly enable in `user_settings.json`
- Defaults to `external-inbox` (lower trust) for safety
- Clear guidance on when to use `inbox` vs `external-inbox`

**Example Usage:**
```typescript
// AI agent adds meeting notes
anchor_ingest_text({
  content: "Meeting summary...",
  filename: "meeting-2026-03-18.md",
  bucket: "inbox"  // You created this content
})

// AI agent ingests downloaded article
anchor_ingest_file({
  path: "~/downloads/article.html",
  bucket: "external-inbox"  // External content
})
```

**Enable Write Operations:**
```json
{
  "mcp": {
    "allow_write_operations": true,
    "default_bucket_for_writes": "external-inbox"
  }
}
```

⚠️ **Only enable write operations if you trust the AI agent.** The default `external-inbox` bucket ensures untrusted data gets lower retrieval priority until you review it.

---

## Installation

```bash
# From the anchor-engine-node directory
cd mcp-server
pnpm install
pnpm build
```

## Configuration

### For Claude Desktop

Add to `~/.config/claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "anchor": {
      "command": "node",
      "args": ["/path/to/anchor-engine-node/mcp-server/dist/index.js"],
      "env": {
        "ANCHOR_API_URL": "http://localhost:3160"
      }
    }
  }
}
```

### For Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "anchor": {
      "command": "node",
      "args": ["/path/to/anchor-engine-node/mcp-server/dist/index.js"],
      "env": {
        "ANCHOR_API_URL": "http://localhost:3160"
      }
    }
  }
}
```

### For Qwen Code / Quinn CLI

Add to your Qwen config (usually `~/.config/qwen/mcp.json` or similar):

```json
{
  "mcpServers": {
    "anchor": {
      "type": "stdio",
      "command": "node",
      "args": ["/data/data/com.termux/files/home/projects/anchor-engine-node/mcp-server/dist/index.js"],
      "env": {
        "ANCHOR_API_URL": "http://localhost:3160"
      }
    }
  }
}
```

Or in your `.qwen/settings.json`:

```json
{
  "mcp": {
    "servers": [
      {
        "name": "anchor",
        "command": "node /data/data/com.termux/files/home/projects/anchor-engine-node/mcp-server/dist/index.js",
        "env": {
          "ANCHOR_API_URL": "http://localhost:3160"
        }
      }
    ]
  }
}
```

## Available Tools

### `anchor_query`

Search your knowledge graph.

```json
{
  "query": "machine learning patterns",
  "max_results": 10,
  "strategy": "standard"
}
```

### `anchor_distill`

Create a compressed knowledge file.

```json
{
  "seed": "neural networks",
  "radius": 3,
  "max_nodes": 500
}
```

### `anchor_illuminate`

Explore connected concepts.

```json
{
  "seed": "transformer architecture",
  "depth": 3
}
```

### `anchor_read_file`

Read files efficiently with line ranges.

```json
{
  "path": "inbox/distilled/distilled_2026-03-11.yaml",
  "start_line": 0,
  "end_line": 100
}
```

### `anchor_list_compounds`

List available source files.

```json
{
  "limit": 20
}
```

### `anchor_get_stats`

Get system statistics.

```json
{}
```

### `anchor_ingest_text` (NEW in v4.8.0)

Ingest raw text content into Anchor Engine memory. Content is atomized deterministically (no LLM processing).

**Use Cases:**
- Meeting notes you wrote
- Personal thoughts and reflections
- Code snippets you created
- Email drafts
- Any sovereign content (content you created)

**Parameters:**
- `content` (required): Raw text content to ingest
- `filename` (required): Filename for the content (e.g., `meeting-notes.md`)
- `bucket` (optional): Destination bucket
  - `"inbox"` - Sovereign data (you created it) → 3.0x retrieval boost
  - `"external-inbox"` - External data (scraped/imported) → 1.0x boost
  - **Default:** `"external-inbox"` (safer)
- `tags` (optional): Tags to apply (auto-extracted if not provided)

**Example:**
```json
{
  "content": "Meeting notes from today...\n\nAction items:\n1. Review PR #123\n2. Update documentation",
  "filename": "meeting-2026-03-18.md",
  "bucket": "inbox",
  "tags": ["meetings", "action-items"]
}
```

**Response:**
```
✅ Text ingested successfully!

👑 Bucket: inbox - Sovereign data (3.0x retrieval boost)
📄 Filename: meeting-2026-03-18.md
📊 Size: 1,234 characters
🏷️ Tags: meetings, action-items

💡 Content will be atomized deterministically (no LLM processing).
   Use anchor_query to search for this content after ingestion.
```

⚠️ **Note:** Write operations must be enabled in `user_settings.json`:
```json
{
  "mcp": {
    "allow_write_operations": true,
    "default_bucket_for_writes": "external-inbox"
  }
}
```

---

### `anchor_ingest_file` (NEW in v4.8.0)

Ingest a file from filesystem into Anchor Engine. Content is atomized deterministically.

**Use Cases:**
- Documents you wrote
- Code files from your projects
- Downloaded articles (use `external-inbox`)
- Research papers (use `external-inbox`)

**Parameters:**
- `path` (required): Absolute or relative path to file
- `bucket` (optional): Destination bucket
  - `"inbox"` - Files you created
  - `"external-inbox"` - External files (downloads, scrapes)
  - **Default:** `"external-inbox"` (safer)
- `delete_original` (optional): Delete original file after ingestion (default: `false`)

**Example:**
```json
{
  "path": "~/notes/meeting-2026-03-18.md",
  "bucket": "inbox"
}
```

**Response:**
```
✅ File ingested successfully!

👑 Bucket: inbox - Sovereign data (3.0x retrieval boost)
📄 Filename: meeting-2026-03-18.md
📊 Size: 1,234 characters
📁 Source: /home/user/notes/meeting-2026-03-18.md

💡 Content will be atomized deterministically (no LLM processing).
   Use anchor_query to search for this content after ingestion.
```

⚠️ **Note:** Write operations must be enabled in `user_settings.json` (see above).

---

## 🪣 Bucket Selection Guide

**When to use `inbox`:**
- ✅ Content you created (notes, thoughts, code, emails)
- ✅ Files you wrote
- ✅ Personal knowledge
- ✅ Sovereign data (high trust, 3.0x retrieval boost)

**When to use `external-inbox`:**
- ✅ Web scrapes
- ✅ Downloaded articles
- ✅ Imported documents
- ✅ Third-party content
- ✅ External knowledge (lower trust, 1.0x boost)

**Default Behavior:** If not specified, defaults to `external-inbox` for safety. This ensures untrusted data doesn't pollute your sovereign knowledge graph until you review it.

---

## 🔒 Security Configuration

MCP is **disabled by default**. Enable it in `user_settings.json`:

```json
{
  "mcp": {
    "enabled": true,
    "require_api_key": true,
    "api_key": "your-secure-key-here",
    "rate_limit_requests_per_minute": 60,
    "max_query_results": 50,
    "restrict_to_localhost": true,
    "allowed_operations": ["query", "read_file", "get_stats"],
    "blocked_operations": []
  }
}
```

### Security Features

- **Toggle**: Enable/disable MCP entirely
- **Rate limiting**: Configurable requests per minute
- **Operation filtering**: Allow/block specific operations
- **Result limits**: Cap max results returned
- **Localhost restriction**: Only accept local connections

### Recommended Security Setup

For client data protection:

```json
{
  "mcp": {
    "enabled": false,  // Only enable when needed
    "require_api_key": true,
    "api_key": "<generate-random-key>",
    "rate_limit_requests_per_minute": 30,
    "max_query_results": 20,
    "allowed_operations": ["query", "get_stats"],  // Restrict dangerous ops
    "blocked_operations": ["distill", "illuminate"]
  }
}
```

## Token-Efficient Workflow

1. **Distill** your corpus: `anchor_distill` with a seed query
2. **Get** the output file path from results
3. **Read** the file in chunks: `anchor_read_file` with line ranges
4. **Search** recursively within chunks

This mimics Kimi's recursive search and saves massive token budgets!

## Environment Variables

- `ANCHOR_API_URL` - Anchor Engine API endpoint (default: `http://localhost:3160`)

## License

MIT
