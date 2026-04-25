#!/bin/bash
# Anchor MCP Wrapper

export ANCHOR_API_URL="${ANCHOR_API_URL:-http://localhost:3160}"
export ANCHOR_API_KEY="${ANCHOR_API_KEY:-bolt-memory-secret}"

exec node mcp-server/dist/index.js "$@"