# Anchor Engine MCP Server

Model Context Protocol (MCP) server for Anchor Engine. Exposes your knowledge graph to any MCP-compatible AI client (Claude, Cursor, Qwen Code, etc.).

## Features

- **🔍 Semantic Search** - Query your memory with `anchor_query`
- **🧪 Radial Distillation** - Compress knowledge into source-of-truth files
- **🌐 Graph Exploration** - BFS traversal with `anchor_illuminate`
- **📄 Token-Efficient Reading** - Read files by line ranges
- **📊 Real-time Stats** - Monitor your knowledge graph

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

Add to your Qwen config:

```json
{
  "mcpServers": {
    "anchor": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/anchor-engine-node/mcp-server/dist/index.js"],
      "env": {
        "ANCHOR_API_URL": "http://localhost:3160"
      }
    }
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
