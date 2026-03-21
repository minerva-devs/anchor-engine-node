# 🔌 Qwen Code + Anchor Engine Integration

**Seamless persistent memory for your AI coding sessions**

---

## 🚀 Quick Setup (2 Minutes)

### Step 1: Start Anchor Engine

Make sure the Anchor Engine is running:

```bash
# Check if already running (port 3161 for bolt-memory)
curl http://localhost:3161/health

# Or start a new instance
cd /data/data/com.termux/files/home/projects/anchor-engine-node
node engine/dist/index.js start
```

### Step 2: Start MCP Server

```bash
# Use the wrapper script (auto-configures env)
/data/data/com.termux/files/home/projects/anchor-engine-node/anchor-mcp-wrapper.sh &

# Or manually with env vars
ANCHOR_API_URL=http://localhost:3161 \
ANCHOR_API_KEY=bolt-memory-secret \
node /data/data/com.termux/files/home/projects/anchor-engine-node/mcp-server/dist/index.js &
```

### Step 3: Configure Qwen Code

Add MCP server to Qwen Code's settings.

**Option A: Copy the pre-made config**
```bash
cp /data/data/com.termux/files/home/projects/anchor-engine-node/qwen-mcp-config.json \
   /data/data/com.termux/files/home/.qwen/mcp.json
```

**Option B: Manual config**
Edit `/data/data/com.termux/files/home/.qwen/settings.json`:

```json
{
  "mcp": {
    "servers": {
      "anchor": {
        "command": "/data/data/com.termux/files/home/projects/anchor-engine-node/anchor-mcp-wrapper.sh",
        "enabled": true
      }
    }
  }
}
```

### Step 4: Restart Qwen Code

Close and reopen Qwen Code. You should see:
- ✅ MCP server connected
- ✅ Anchor tools available

---

## 🧰 Available Tools

Once connected, you can use these MCP tools in Qwen Code chat:

| Tool | Description | Example |
|------|-------------|---------|
| `anchor_query` | Search memory with semantic + graph search | "Find our discussion about MCP authentication" |
| `anchor_distill` | Create checkpoint summary from session | "Summarize today's decisions" |
| `anchor_illuminate` | Explore related concepts via BFS | "Show me everything about orchestration" |
| `anchor_read_file` | Read files by line range (token-efficient) | "Read lines 100-200 of orchestrator-v2.js" |
| `anchor_list_compounds` | List all source files in memory | "What documents do you have?" |
| `anchor_get_stats` | Check engine health and stats | "How many memories are stored?" |
| `anchor_ingest_text` | Add new text to memory | "Save this meeting note..." |
| `anchor_ingest_file` | Ingest a file from filesystem | "Add this PDF to memory" |

---

## 💡 Usage Examples

### Search Previous Decisions
```
@anchor Can you find what we decided about the MCP server authentication?
```

### Save Important Context
```
@anchor Remember this: We use Qwen 3.5 2B for orchestration, 
running on llama.cpp at /data/data/com.termux/files/usr/bin/llama-server
```

### Create Session Checkpoint
```
@anchor Create a distillation of our conversation about Anchor Engine setup
```

### Explore Related Topics
```
@anchor Show me all memories related to "semantic search" and "STAR algorithm"
```

---

## 🔧 Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANCHOR_API_URL` | `http://localhost:3161` | Anchor Engine API endpoint |
| `ANCHOR_API_KEY` | (none) | API key for authentication |

### Security Settings

Edit `user_settings.json` to customize MCP behavior:

```json
{
  "mcp": {
    "enabled": true,
    "rate_limit_requests_per_minute": 120,
    "max_query_results": 100,
    "allowed_operations": [
      "query",
      "read_file", 
      "get_stats",
      "ingest",
      "distill"
    ]
  }
}
```

---

## 🐛 Troubleshooting

### MCP Server Won't Start
```bash
# Check if Anchor Engine is running
curl http://localhost:3161/health

# Check MCP logs
tail -f ~/mcp.log

# Restart with debug logging
ANCHOR_API_URL=http://localhost:3161 \
ANCHOR_API_KEY=bolt-memory-secret \
node mcp-server/dist/index.js 2>&1 | tee ~/mcp.log
```

### Qwen Code Doesn't See MCP
1. Restart Qwen Code completely
2. Check MCP server is running: `ps aux | grep mcp-server`
3. Verify config: `cat ~/.qwen/mcp.json`

### Authentication Errors
```bash
# Test API key
curl -H "Authorization: Bearer bolt-memory-secret" \
     http://localhost:3161/health

# Update ANCHOR_API_KEY in wrapper script
```

---

## 📊 Performance Tips

- **Token Budget**: Use `max_results` parameter to limit response size
- **Clustering**: Related memories are automatically grouped
- **Temporal Decay**: Recent memories weighted higher by default
- **Provenance**: All results include source tracking

---

## 🎯 Best Practices

1. **Ingest Important Decisions**: After key discussions, save them
2. **Use Checkpoints**: Create distillations at session end
3. **Search Before Asking**: Let Anchor find relevant context first
4. **Tag Strategically**: Use consistent terminology for better retrieval

---

**Created:** 2026-03-21  
**Version:** 1.0  
**Compatible:** Qwen Code + Anchor Engine v4.8.1+
