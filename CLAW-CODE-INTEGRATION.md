# Claw-Code + Anchor Engine Integration Guide

## ✅ What's Working

1. **claw-code with Qwen models** - System prompt optimized for Qwen tool use
2. **Anthropic Proxy** - Translates claw-code → llama.cpp format
3. **MCP Server** - Anchor memory server built and ready

## Current Status

### claw-code Configuration
- **Location:** `C:\Users\rsbiiw\Projects\claw-code`
- **Launcher:** `.\claw-local.bat` (includes Qwen mode + proxy config)
- **Model:** Qwen3.5-4B-abliterated (via llama.cpp on port 8000)
- **Proxy:** Anthropic-compatible proxy on port 8001

### Anchor MCP Server
- **Location:** `C:\Users\rsbiiw\Projects\aen\mcp-server`
- **Status:** ✅ Built and can start
- **Issue:** Requires Anchor Engine backend on port 3160/3161

## Setup Options

### Option 1: Full Integration (Recommended)

**Start everything:**
```cmd
cd C:\Users\rsbiiw\Projects\aen
.\start-all.bat
```

This starts:
1. Anchor Engine (port 3160)
2. MCP Server (stdio for claw-code)

Then in another terminal:
```cmd
cd C:\Users\rsbiiw\Projects\claw-code
.\claw-local.bat
```

### Option 2: MCP Server Only (Limited)

The MCP server can run without the engine but will have limited functionality:

```cmd
cd C:\Users\rsbiiw\Projects\aen\mcp-server
set ANCHOR_API_URL=http://localhost:3160
node dist\index.js
```

### Option 3: Use claw-code Without MCP

claw-code works fine without MCP - just use local file tools:

```cmd
cd C:\Users\rsbiiw\Projects\claw-code
.\claw-local.bat
```

## Configuration Files

### claw-code MCP Config
**File:** `C:\Users\rsbiiw\Projects\claw-code\.claw\settings.local.json`

```json
{
  "mcpServers": {
    "anchor-memory": {
      "command": "node",
      "args": ["C:\\Users\\rsbiiw\\Projects\\aen\\mcp-server\\dist\\index.js"],
      "env": {
        "ANCHOR_API_URL": "http://localhost:3160",
        "ANCHOR_API_KEY": "bolt-memory-secret"
      }
    }
  }
}
```

### Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `CLAW_QWEN_MODE` | `1` | Enables Qwen-optimized system prompt |
| `ANTHROPIC_BASE_URL` | `http://127.0.0.1:8001` | Points to Anthropic proxy |
| `ANTHROPIC_API_KEY` | `sk-local` | Dummy key for local server |
| `ANCHOR_API_URL` | `http://localhost:3160` | Anchor Engine URL |
| `ANCHOR_API_KEY` | `bolt-memory-secret` | MCP authentication |

## Quick Commands

**Check services:**
```cmd
netstat -ano | findstr :3160 :3161 :8000 :8001
```

**Test claw-code:**
```cmd
cd C:\Users\rsbiiw\Projects\claw-code
.\claw-local.bat prompt "list files in C:\Users\rsbiiw\Projects\aen\src"
```

**Test MCP server:**
```cmd
cd C:\Users\rsbiiw\Projects\aen\mcp-server
node dist\index.js
```

## Troubleshooting

### MCP Server won't connect to Engine
- Make sure Anchor Engine is running: `curl http://localhost:3160/health`
- Check API key matches in `user_settings.json`
- Try restarting: `taskkill /F /IM node.exe` then start again

### claw-code doesn't see MCP tools
- Check MCP server is in `.claw\settings.local.json`
- Restart claw-code session: `/exit` then start again
- Run `/mcp` command in claw-code to see connected servers

### Qwen model not using tools
- Make sure `CLAW_QWEN_MODE=1` is set
- Check system prompt with: `claw system-prompt`
- Try a fresh session: `/exit` and restart

## Next Steps

1. **Get Anchor Engine running** - Fix any startup issues in `engine/tools/anchor.ts`
2. **Test MCP tools in claw-code** - Use `/mcp` command to verify connection
3. **Try memory operations** - Ask claw-code to search/query your Anchor memory

---

**Created:** 2026-04-05
**Status:** Integration in progress - MCP server ready, Engine needs startup fix
