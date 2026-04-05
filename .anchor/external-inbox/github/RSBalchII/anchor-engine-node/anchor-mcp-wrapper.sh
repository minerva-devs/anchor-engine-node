#!/data/data/com.termux/files/usr/bin/bash
# Anchor MCP Wrapper - Auto-configures environment

# Default to bolt-memory instance
export ANCHOR_API_URL="${ANCHOR_API_URL:-http://localhost:3161}"
export ANCHOR_API_KEY="${ANCHOR_API_KEY:-bolt-memory-secret}"

# Run MCP server
exec node /data/data/com.termux/files/home/projects/anchor-engine-node/mcp-server/dist/index.js "$@"
