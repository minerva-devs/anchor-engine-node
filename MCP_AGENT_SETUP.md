# 🤖 MCP Agent Memory Setup Guide

**Automatic chat ingestion for persistent AI memory**

---

## 🎯 Quick Start for Agents

When an MCP-compatible agent connects to Anchor Engine, it should:

### **1. Check Watcher Configuration**

Read `user_settings.json` → `watcher.extra_paths`

```json
{
  "watcher": {
    "extra_paths": [
      "/data/data/com.termux/files/home/.qwen/projects/-data-data-com-termux-files-home/chats"
    ]
  }
}
```

### **2. Add Your Chat Directory**

If your agent's chat logs aren't in the list, **add them**:

```json
{
  "watcher": {
    "extra_paths": [
      "/existing/path/chats",
      "/path/to/YOUR/agent/chats"  // ← Add yours here
    ]
  }
}
```

### **3. Verify Ingestion**

```bash
# Check if your chats are being ingested
curl http://localhost:3161/v1/stats -H "Authorization: Bearer your-api-key"

# Search for your content
curl -X POST http://localhost:3161/v1/memory/search \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"query": "your recent conversation topic"}'
```

---

## 📁 Common Agent Chat Locations

### **Qwen Code** (Termux/Android)
```
/data/data/com.termux/files/home/.qwen/projects/-data-data-com-termux-files-home/chats/
```

### **Qwen Code** (Desktop/Linux)
```
~/.qwen/projects/<project-id>/chats/
```

### **Claude Desktop**
```
~/Library/Application Support/Claude/chats/  # macOS
~/.config/Claude/chats/                       # Linux
```

### **Cursor**
```
~/.cursor/chats/
```

### **Continue.dev**
```
~/.continue/chats/
```

---

## 🔧 Configuration Reference

### **Watcher Settings**

| Setting | Default | Description |
|---------|---------|-------------|
| `debounce_ms` | 2000 | Wait time before processing (prevents duplicate reads) |
| `stability_threshold_ms` | 2000 | Additional stability check |
| `extra_paths` | `[]` | **Your agent's chat directory goes here** |

### **Database Settings**

| Setting | Values | Description |
|---------|--------|-------------|
| `wipe_on_startup` | `true`/`false` | Clear database on engine start |

**Recommendation:** Set `true` for first run, then `false` for persistence.

### **MCP Settings**

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Enable MCP server |
| `allow_write_operations` | `false` | Allow agents to ingest content |
| `default_bucket_for_writes` | `"external-inbox"` | Default bucket for new content |

---

## 📊 How Automatic Ingestion Works

```
┌─────────────────────────────────────────────────────────┐
│                   Your AI Agent                         │
│                   (Qwen, Claude, etc.)                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ 1. Chat message saved
                     ▼
┌─────────────────────────────────────────────────────────┐
│         Agent's Chat Directory (*.jsonl)                │
│   ~/.qwen/projects/.../chats/session-uuid.jsonl         │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ 2. Watcher detects new file (<2 sec)
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Anchor Engine Watcher                      │
│   - Monitors extra_paths                                │
│   - Debounce: 2000ms                                    │
│   - Auto-ingests .jsonl files                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ 3. Atomization + Tag Derivation
                     ▼
┌─────────────────────────────────────────────────────────┐
│              PGlite Database                            │
│   - Atoms (content chunks)                              │
│   - Molecules (related atoms)                           │
│   - Tags (semantic markers)                             │
│   - Provenance (source tracking)                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ 4. Available via MCP
                     ▼
┌─────────────────────────────────────────────────────────┐
│              MCP Server Tools                           │
│   - anchor_query: Search memory                         │
│   - anchor_distill: Create checkpoints                  │
│   - anchor_illuminate: Explore connections              │
└─────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing Your Setup

### **Step 1: Check Watcher Paths**

```bash
cat /data/data/com.termux/files/home/projects/anchor-engine-node/user_settings.json | \
  grep -A10 '"watcher"'
```

**Expected Output:**
```json
"watcher": {
  "debounce_ms": 2000,
  "stability_threshold_ms": 2000,
  "extra_paths": [
    "/data/data/com.termux/files/home/.qwen/projects/-data-data-com-termux-files-home/chats"
  ],
  "agent_note": "Add your agent's chat directory here..."
}
```

### **Step 2: Verify Files Exist**

```bash
ls -la /data/data/com.termux/files/home/.qwen/projects/-data-data-com-termux-files-home/chats/*.jsonl | head -5
```

**Expected:** Multiple `.jsonl` files with timestamps from today.

### **Step 3: Check Database Stats**

```bash
curl http://localhost:3161/v1/stats -H "Authorization: Bearer bolt-memory-secret"
```

**Expected:**
```json
{
  "atoms": 1000+,
  "sources": 10+,
  "tags": 500+,
  "molecules": 800+
}
```

### **Step 4: Test Search**

```bash
curl -X POST http://localhost:3161/v1/memory/search \
  -H "Authorization: Bearer bolt-memory-secret" \
  -H "Content-Type: application/json" \
  -d '{"query": "what did we discuss about android", "token_budget": 2048}'
```

**Expected:** Results with actual content from your chats.

---

## 🛠️ Troubleshooting

### **Problem: Watcher Not Detecting Files**

**Check:**
1. Path is correct in `extra_paths`
2. Files have `.jsonl` extension
3. Engine is running (check logs)

**Fix:**
```bash
# Check watcher logs
tail -100 logs/anchor_engine.log.* | grep -i watcher

# Manually trigger ingestion
curl -X POST http://localhost:3161/v1/watchdog/ingest \
  -H "Authorization: Bearer your-key" \
  -H "Content-Type: application/json" \
  -d '{"path": "/your/chat/directory"}'
```

### **Problem: Database Empty After Ingestion**

**Check:**
1. `wipe_on_startup: true` (good for first run)
2. PGlite database initialized
3. No errors in logs

**Fix:**
```bash
# Check for errors
tail -100 logs/anchor_engine.log.* | grep -i error

# Restart engine
node engine/dist/index.js start
```

### **Problem: MCP Can't Connect**

**Check:**
1. Engine running on port 3161
2. API key correct
3. MCP server started with env vars

**Fix:**
```bash
# Start MCP with correct settings
ANCHOR_API_URL=http://localhost:3161 \
ANCHOR_API_KEY=your-secret-key \
node mcp-server/dist/index.js
```

### **Problem: "Not connected" Error in MCP Tools**

**Symptoms:**
- MCP tools return "Not connected" error
- Engine is running and healthy
- MCP server starts correctly when tested directly

**Root Cause:**
Port mismatch between MCP configuration and engine port. This can happen when:
1. Multiple config files have different ports
2. Engine port was changed but MCP config wasn't updated
3. Different systems (Termux, Desktop, etc.) have different default ports

**Check:**
```bash
# Check engine port
curl http://localhost:3160/health && echo "Port 3160 OK"
curl http://localhost:3161/health && echo "Port 3161 OK"

# Check MCP config in Qwen Code
cat ~/.qwen/mcp.json | grep ANCHOR_API_URL
cat ~/.qwen/settings.json | grep -A5 mcpServers

# Check engine config
cat user_settings.json | grep -A3 '"server"'
```

**Fix:**
Ensure all configs use the same port:

```bash
# 1. Find the correct port from engine config
ENGINE_PORT=$(cat user_settings.json | grep -A1 '"server"' | grep port | grep -o '[0-9]\+')
echo "Engine port: $ENGINE_PORT"

# 2. Update ~/.qwen/mcp.json
# Change ANCHOR_API_URL to match engine port

# 3. Update ~/.qwen/settings.json mcpServers section
# Change ANCHOR_API_URL to match engine port

# 4. Restart Qwen Code session to pick up new config
```

**Config Files to Check:**

| File | Setting | Must Match |
|------|---------|------------|
| `user_settings.json` | `server.port` | Engine's actual port |
| `~/.qwen/mcp.json` | `ANCHOR_API_URL` | Engine's port |
| `~/.qwen/settings.json` | `mcpServers.anchor.env.ANCHOR_API_URL` | Engine's port |

**Note for Termux/Android Users:**
On Termux, the default port is typically `3160`. Some documentation may reference `3161` from desktop setups. Always verify the actual port in `user_settings.json`.

---

## 📝 Best Practices

### **For Agent Developers**

1. **Document Your Chat Path**
   - Add it to `extra_paths` on first connection
   - Include in your agent's setup docs

2. **Use Consistent Formats**
   - JSONL format works best
   - Include timestamps and session IDs
   - Preserve conversation structure

3. **Test Ingestion**
   - Verify your chats appear in search
   - Check provenance tracking works
   - Test with different query types

### **For Users**

1. **First Run: Wipe Database**
   ```json
   {"database": {"wipe_on_startup": true}}
   ```

2. **Ongoing: Persist Data**
   ```json
   {"database": {"wipe_on_startup": false}}
   ```

3. **Multiple Agents: Add All Paths**
   ```json
   {
     "watcher": {
       "extra_paths": [
         "/path/to/qwen/chats",
         "/path/to/claude/chats",
         "/path/to/cursor/chats"
       ]
     }
   }
   ```

---

## 🎓 Example: Adding a New Agent

**Scenario:** You want to add Claude Desktop to your memory system.

### **Step 1: Find Claude's Chat Directory**

```bash
# macOS
ls ~/Library/Application\ Support/Claude/chats/

# Linux
ls ~/.config/Claude/chats/
```

### **Step 2: Add to Watcher**

Edit `user_settings.json`:
```json
{
  "watcher": {
    "extra_paths": [
      "/data/data/com.termux/files/home/.qwen/projects/-data-data-com-termux-files-home/chats",
      "/Users/yourname/Library/Application Support/Claude/chats"  // ← Added
    ]
  }
}
```

### **Step 3: Restart Engine**

```bash
pkill -f "node.*engine/dist"
node engine/dist/index.js start
```

### **Step 4: Verify**

```bash
# Check stats (should increase)
curl http://localhost:3161/v1/stats

# Search Claude content
curl -X POST http://localhost:3161/v1/memory/search \
  -H "Authorization: Bearer your-key" \
  -d '{"query": "claude conversation topic"}'
```

---

**Created:** 2026-03-21  
**Version:** 1.0  
**Applies to:** All MCP-compatible agents
