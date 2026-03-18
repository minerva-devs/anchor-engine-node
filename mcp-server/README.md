# Anchor Engine MCP Server

Model Context Protocol (MCP) server for Anchor Engine. Exposes your knowledge graph to any MCP-compatible AI client (Claude, Cursor, Qwen Code, etc.).

## Features

- **🔍 Semantic Search** - Query your memory with `anchor_query`
- **🧪 Radial Distillation** - Compress knowledge into source-of-truth files
- **🌐 Graph Exploration** - BFS traversal with `anchor_illuminate`
- **📄 Token-Efficient Reading** - Read files by line ranges
- **📊 Real-time Stats** - Monitor your knowledge graph
- **📋 Session Index Search** - Fast chat session lookup with `anchor_search_index`
- **📨 Session Fetching** - Targeted retrieval with `anchor_fetch_session`

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

### For Qwen Coder

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

### `anchor_search_index` (NEW in v4.8.0)

Search the distillation session index for relevant chat sessions. Fast, lightweight query routing for two-tier retrieval.

**Two-Tier Retrieval Pattern:**
1. Use `anchor_search_index` to find relevant sessions (fast, searches small index)
2. Use `anchor_fetch_session` to retrieve full context for specific sessions

```json
{
  "query": "OAuth authentication setup",
  "max_results": 10,
  "commands_only": false
}
```

**Response includes:**
- Session IDs for targeted queries
- Date/time of sessions
- Commands run during session
- Topics extracted
- Message count
- Participants (user/assistant/system)

### `anchor_fetch_session` (NEW in v4.8.0)

Fetch full session data by session ID. Use after `anchor_search_index` to retrieve complete conversation context.

```json
{
  "session_id": "a057132d-deef-49fa-9214-e8f0bb923fa0",
  "max_messages": 100,
  "include_metadata": true
}
```

**Parameters:**
- `session_id` (required): UUID of the session to fetch
- `max_messages`: Limit messages returned (default: 100, use 0 for all)
- `include_metadata`: Include session metadata (default: true)

## Two-Tier Retrieval Workflow

The session index enables efficient memory retrieval without searching the entire corpus:

```
1. User asks: "How did we set up OAuth?"
   ↓
2. anchor_search_index: { query: "OAuth authentication" }
   ↓ (fast, searches ~100 session entries)
3. Returns: Session a057132d... from March 9 with /auth command
   ↓
4. anchor_fetch_session: { session_id: "a057132d-..." }
   ↓ (targeted, reads single file)
5. Returns: Full conversation context for injection
```

**Benefits:**
- **Token Efficient**: Don't load full context unless needed
- **Fast**: Index search is ~100x faster than full corpus search
- **Precise**: Session-scoped results reduce noise
- **Human-Like**: Matches how we remember (gist → details on demand)

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

### Pattern 1: Distillation-Based Retrieval

1. **Distill** your corpus: `anchor_distill` with a seed query
2. **Get** the output file path from results
3. **Read** the file in chunks: `anchor_read_file` with line ranges
4. **Search** recursively within chunks

This mimics Kimi's recursive search and saves massive token budgets!

### Pattern 2: Two-Tier Session Retrieval (NEW)

1. **Search Index**: `anchor_search_index` with natural language query
2. **Review Results**: Find relevant session IDs from the index
3. **Fetch Session**: `anchor_fetch_session` with specific session_id
4. **Inject Context**: Use retrieved messages as conversation context

This pattern is ideal for:
- Finding specific past conversations
- Command-based lookups ("show me when I ran /auth")
- Topic-scoped retrieval ("OAuth setup discussions")

## Environment Variables

- `ANCHOR_API_URL` - Anchor Engine API endpoint (default: `http://localhost:3160`)

## License

MIT
