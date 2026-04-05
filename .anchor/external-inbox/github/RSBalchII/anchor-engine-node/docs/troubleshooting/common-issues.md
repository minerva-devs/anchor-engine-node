# Anchor Engine - Common Issues & Troubleshooting

**Version:** 4.9.5 | **Last Updated:** 2026-03-25

Quick reference for common issues and their solutions.

---

## Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Engine won't start | Check port 3160, kill existing process |
| Out of memory | Set `low_memory` mode in settings |
| Can't find data | Verify ingestion, check bucket filters |
| MCP not connecting | Check `ANCHOR_API_URL` port matches |
| Database corruption | Restart (auto-wipe and rebuild) |
| Write operations disabled | Enable in `user_settings.json` |

---

## Installation Issues

### PNPM Not Found

**Error:**
```
bash: pnpm: command not found
```

**Solutions:**

1. **Install globally:**
   ```bash
   npm install -g pnpm
   ```

2. **Use corepack (Node.js 16+):**
   ```bash
   corepack enable pnpm
   corepack prepare pnpm@latest --activate
   ```

3. **Use npm as fallback:**
   ```bash
   npm install
   npm run build
   ```

---

### Build Fails

**Error:**
```
Error: Cannot find module '@rbalchii/anchor-types'
```

**Solutions:**

1. **Clean and rebuild:**
   ```bash
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   pnpm build:all
   ```

2. **Build in correct order:**
   ```bash
   pnpm build:all
   # Or individually:
   pnpm --filter @rbalchii/anchor-types build
   pnpm --filter @rbalchii/anchor-client build
   pnpm --filter anchor-ui build
   pnpm --filter anchor-engine build
   ```

3. **Check Node.js version:**
   ```bash
   node --version
   # Required: v18.0.0 or higher
   ```

---

### Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3160
```

**Solutions:**

1. **Find what's using port 3160:**
   ```bash
   # Linux/macOS
   lsof -i :3160
   netstat -tulpn | grep 3160
   
   # Windows PowerShell
   Get-NetTCPConnection -LocalPort 3160
   ```

2. **Kill the process:**
   ```bash
   # Linux/macOS
   kill -9 <PID>
   
   # Windows
   taskkill /PID <PID> /F
   ```

3. **Or change port in `user_settings.json`:**
   ```json
   {
     "server": {
       "port": 3161
     }
   }
   ```

---

### WASM Module Loading Fails

**Error:**
```
Error: Cannot find module '@rbalchii/anchor-atomizer-wasm'
```

**Solutions:**

1. **Rebuild WASM modules:**
   ```bash
   pnpm --filter @rbalchii/anchor-atomizer-wasm build
   pnpm --filter @rbalchii/anchor-fingerprint-wasm build
   pnpm --filter @rbalchii/anchor-keyextract-wasm build
   pnpm --filter @rbalchii/anchor-tagwalker-wasm build
   ```

2. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules
   pnpm install
   pnpm build:all
   ```

3. **Check platform compatibility:**
   ```bash
   node --version
   uname -m  # Should be x86_64 or arm64
   ```

---

## Ingestion Issues

### Files Not Ingesting

**Symptoms:** Files added to watched paths don't appear in search

**Causes:**
1. Watchdog not running
2. File in exclude pattern
3. File too large (>10MB)
4. Molecule count limit exceeded (>10,000)

**Solutions:**

1. **Check Watchdog Status:**
   ```bash
   curl http://localhost:3160/v1/watchdog/status
   ```

2. **Check Exclude Patterns:**
   ```json
   {
     "watcher": {
       "exclude_patterns": [
         "**/*.log",
         "**/node_modules/**",
         "**/.git/**",
         "**/*.bin",
         "**/*.pdf"
       ]
     }
   }
   ```

3. **Manual Ingest:**
   - Use Web UI → "Paste & Ingest" tab
   - Or API: `POST /v1/research/upload-raw`

4. **Check File Size:**
   ```bash
   ls -lh large-file.txt
   # If >10MB, split or use streaming ingest
   ```

---

### Large Files Fail

**Symptoms:** Timeout or OOM on large file ingestion

**Solutions:**

1. **Use Streaming Ingest:**
   ```bash
   curl -X POST http://localhost:3160/v1/ingest/streaming \
     -F "file=@large-file.txt"
   ```

2. **Split Files:**
   ```bash
   # Split into 1MB chunks
   split -b 1M large-file.txt chunk-
   
   # Or by lines
   split -l 10000 large-file.txt chunk-
   ```

3. **Increase Memory:**
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" pnpm start
   ```

4. **Enable Low Memory Mode:**
   ```json
   {
     "adaptive_concurrency": {
       "environment": "low_memory",
       "max_concurrency": 2
     }
   }
   ```

---

### Ingestion Hangs Indefinitely

**Symptoms:**
- Ingestion API calls never return
- Files don't appear in search
- Engine appears healthy (`/health` returns 200)
- No error messages in logs

**Root Cause:** Database corruption causing the ingestion transaction to hang silently.

**Solution:**

```bash
# 1. Check if ingestion is stuck
curl http://localhost:3160/v1/ingest/status

# 2. Force kill the engine
pkill -9 -f "anchor-engine"

# 3. Verify inbox/ is intact (your data is safe)
ls -la notebook/inbox/
ls -la notebook/external-inbox/

# 4. Restart (automatic wipe and rebuild)
pnpm start

# 5. Monitor the rebuild progress
tail -f engine/logs/server.log
```

**Prevention:**
- Always use `wipe_on_startup: true` (default)
- Use graceful shutdown: `pkill -TERM -f "anchor-engine"`
- Never set `wipe_on_startup: false` for "performance"

See [Standard 020: Ephemeral Database](../../specs/current-standards/020-ephemeral-database.md) for details.

---

### "Write Operations Disabled" Error

**Symptoms:** `anchor_ingest_text` or API ingestion returns error

**Error:**
```
Write operations are disabled. Enable in user_settings.json
```

**Solution:**

Edit `user_settings.json`:
```json
{
  "mcp": {
    "allow_write_operations": true,
    "default_bucket_for_writes": "external-inbox"
  }
}
```

**Restart the engine:**
```bash
pnpm restart
```

**Security Note:** Only enable write operations if you trust the AI agent. The default `external-inbox` bucket ensures untrusted data gets lower retrieval priority.

---

## Search Issues

### No Results Found

**Symptoms:** Query returns empty results

**Causes:**
1. No data ingested
2. Wrong bucket selected
3. Token budget too low
4. Query too specific

**Solutions:**

1. **Verify Data Exists:**
   ```bash
   curl http://localhost:3160/v1/stats
   # Check atoms > 0
   ```

2. **Check Bucket Filters:**
   - Web UI: Ensure correct buckets selected in filters
   - API: Remove `buckets` filter or add correct ones
   ```json
   {
     "query": "test",
     "buckets": []  // Empty = all buckets
   }
   ```

3. **Increase Token Budget:**
   ```json
   {
     "token_budget": 8192
   }
   ```

4. **Try Simpler Query:**
   ```json
   {
     "query": "test"  // Instead of "What is the test about?"
   }
   ```

---

### Slow Search

**Symptoms:** Search takes >5 seconds

**Causes:**
1. Max-recall mode enabled
2. Too many results requested
3. Low memory causing swapping
4. Large graph (100k+ atoms)

**Solutions:**

1. **Use Standard Mode:**
   ```json
   {
     "strategy": "standard"  // Instead of "max-recall"
   }
   ```

2. **Limit Results:**
   ```json
   {
     "max_chars": 4096,
     "max_results": 20
   }
   ```

3. **Increase Memory:**
   ```json
   {
     "adaptive_concurrency": {
       "environment": "high_memory"
     }
   }
   ```

4. **Use Exact Match for Keywords:**
   ```json
   {
     "strategy": "exact",
     "query": "OAuth setup"
   }
   ```

---

### Search Returns Irrelevant Results

**Symptoms:** Results don't match query intent

**Causes:**
1. Query too vague
2. Missing tags for filtering
3. Old data with high recency score

**Solutions:**

1. **Be More Specific:**
   ```json
   {
     "query": "GitHub OAuth client ID configuration"
     // Instead of just "OAuth"
   }
   ```

2. **Use Tag Filters:**
   ```json
   {
     "query": "OAuth",
     "tags": ["github", "authentication"]
   }
   ```

3. **Filter by Bucket:**
   ```json
   {
     "query": "OAuth",
     "buckets": ["inbox"]  // Only sovereign content
   }
   ```

---

## MCP Issues

### MCP Server Not Connecting

**Symptoms:** Claude/Cursor/Qwen Code can't connect

**Solutions:**

1. **Check MCP Server:**
   ```bash
   cd mcp-server
   pnpm build
   pnpm start
   ```

2. **Verify Config:**
   ```json
   {
     "mcpServers": {
       "anchor": {
         "command": "node",
         "args": ["/path/to/mcp-server/dist/index.js"],
         "env": {
           "ANCHOR_API_URL": "http://localhost:3160"
         }
       }
     }
   }
   ```

3. **Check Engine is Running:**
   ```bash
   curl http://localhost:3160/health
   ```

4. **Check Port Mismatch:**
   ```bash
   # What port is the engine running on?
   curl http://localhost:3160/health && echo "Port 3160 OK"
   curl http://localhost:3161/health && echo "Port 3161 OK"
   
   # What port is MCP configured to use?
   grep ANCHOR_API_URL ~/.qwen/mcp.json
   ```

---

### "Not Connected" Error

**Symptoms:** MCP tools return "Not connected" but engine is running

**Root Cause:** Port mismatch between MCP configuration and actual engine port.

**Fix:**

Ensure `ANCHOR_API_URL` in MCP config matches engine's actual port:

```json
{
  "mcpServers": {
    "anchor": {
      "env": {
        "ANCHOR_API_URL": "http://localhost:3160"  // Must match engine port!
      }
    }
  }
}
```

**Common Port Mismatches:**

| System | Typical Port | Config Location |
|--------|--------------|-----------------|
| Termux/Android | 3160 | `user_settings.json` → `server.port` |
| Desktop Linux | 3161 | `user_settings.json` → `server.port` |
| macOS | 3161 | `user_settings.json` → `server.port` |

---

### MCP Tools Not Showing

**Symptoms:** MCP server connects but tools don't appear

**Solutions:**

1. **Restart MCP Server:**
   ```bash
   pkill -f "mcp-server"
   cd mcp-server && pnpm start
   ```

2. **Rebuild MCP Server:**
   ```bash
   cd mcp-server
   rm -rf dist node_modules
   pnpm install
   pnpm build
   ```

3. **Check MCP Protocol Version:**
   ```json
   {
     "mcpServers": {
       "anchor": {
         "command": "node",
         "args": ["mcp-server/dist/index.js"]
       }
     }
   }
   ```

---

## Database Issues

### Understanding Ephemeral Database

**Key Principle:** The PGlite database is **ephemeral** - wiped and rebuilt on every startup.

**Source of Truth Hierarchy:**
1. `notebook/inbox/` - **Permanent** (your sovereign content)
2. `notebook/external-inbox/` - **Permanent** (external content)
3. `.anchor/mirrored_brain/` - Rebuildable cache
4. `engine/context_data/` - Ephemeral PGlite database

**Your data is safe in `notebook/inbox/` and `notebook/external-inbox/`.**

---

### Database Corruption

**Symptoms:**
- "Database not initialized" errors
- SQL errors in logs
- Ingestion hanging indefinitely
- WASM heap errors

**Root Cause:** PGlite (WASM PostgreSQL) can become corrupted from:
- Unclean shutdowns (SIGKILL, crashes, power loss)
- WASM heap corruption under memory pressure
- Silent write failures during heavy operations

**Solution:**

The engine automatically handles this with `wipe_on_startup: true` (default):

```bash
# 1. Force kill (if hanging)
pkill -9 -f "anchor-engine"

# 2. Restart (Auto-Wipe and Rebuild)
pnpm start

# 3. Watch the rebuild:
tail -f engine/logs/server.log
# Look for:
# [DB] Removing existing database directory...
# [DB] Clearing mirrored_brain directory...
# [Startup] Regenerating mirrored_brain/ from inbox/...
```

---

### "Missing Data" After Restart

**Symptoms:** Data that was ingested is no longer searchable after restart

**Common Causes:**

1. **Files placed in mirrored_brain/ instead of inbox/:**
   ```bash
   # WRONG - will be deleted on startup
   cp myfile.txt .anchor/mirrored_brain/
   
   # CORRECT - permanent storage
   cp myfile.txt notebook/inbox/
   pnpm restart
   ```

2. **wipe_on_startup set to false:**
   ```json
   // Check user_settings.json
   {
     "database": {
       "wipe_on_startup": true  // Must be true
     }
   }
   ```

3. **Ingestion failed silently:**
   - Check logs: `tail -f engine/logs/server.log`
   - Verify with: `curl http://localhost:3160/v1/stats`

---

### Manual Database Wipe (Emergency)

If automatic wipe fails:

```bash
# 1. Stop engine
pkill -9 -f "anchor-engine"

# 2. Backup inbox/ (source of truth)
cp -r notebook/inbox notebook/inbox.backup.$(date +%Y%m%d)
cp -r notebook/external-inbox notebook/external-inbox.backup.$(date +%Y%m%d)

# 3. Delete database and cache
rm -rf engine/context_data
rm -rf .anchor/mirrored_brain

# 4. Restart (will rebuild everything)
pnpm start
```

---

## Memory Issues

### Out of Memory (OOM)

**Symptoms:** Process killed, "JavaScript heap out of memory"

**Solutions:**

1. **Low Memory Mode:**
   ```json
   {
     "adaptive_concurrency": {
       "environment": "low_memory",
       "max_concurrency": 2
     }
   }
   ```

2. **Increase Node Memory:**
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" pnpm start
   ```

3. **Reduce Concurrent Operations:**
   ```json
   {
     "adaptive_concurrency": {
       "max_concurrency": 2
     }
   }
   ```

4. **Disable Synonyms (Temporarily):**
   ```json
   {
     "tagging": {
       "modulation_level": 0
     }
   }
   ```

---

### Memory Leak

**Symptoms:** Memory usage grows continuously

**Solutions:**

1. **Enable GC Logging:**
   ```bash
   node --expose-gc --trace-gc engine/dist/index.js
   ```

2. **Manual GC:**
   ```bash
   curl -X POST http://localhost:3160/v1/system/gc
   ```

3. **Restart Periodically:**
   ```bash
   # Cron job to restart daily
   0 3 * * * cd /path/to/anchor-engine && pnpm restart
   ```

---

## Web UI Issues

### Blank Page

**Symptoms:** Web UI shows blank page

**Solutions:**

1. **Check Build:**
   ```bash
   cd packages/anchor-ui
   pnpm build
   ```

2. **Clear Browser Cache:**
   - Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
   - Clear browser cache completely

3. **Check Console:**
   - Open DevTools (F12)
   - Check Console tab for errors
   - Look for failed resource loads

4. **Check Server Logs:**
   ```bash
   tail -f engine/logs/server.log
   ```

---

### Can't Add Paths

**Symptoms:** "Add Path" button doesn't work

**Solutions:**

1. **Check Permissions:**
   ```bash
   ls -la /path/you/want/to/add
   ```

2. **Use Absolute Paths:**
   - ✅ `/home/user/documents`
   - ❌ `~/documents`
   - ❌ `./documents`

3. **Check Engine Logs:**
   ```bash
   tail -f engine/logs/server.log
   ```

4. **Verify Watchdog is Running:**
   ```bash
   curl http://localhost:3160/v1/watchdog/status
   ```

---

## Docker Issues

### Container Won't Start

**Symptoms:** `docker-compose up` fails

**Solutions:**

1. **Check Logs:**
   ```bash
   docker-compose logs
   ```

2. **Rebuild:**
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

3. **Check Resources:**
   ```bash
   docker stats
   ```

4. **Verify Volume Mounts:**
   ```yaml
   volumes:
     - ./notebook:/app/notebook
     - ./backups:/app/backups
     - anchor-data:/app/engine/context_data
   ```

---

### Data Lost After Restart

**Symptoms:** Data disappears after container restart

**Cause:** Volumes not mounted correctly

**Solution:**

Check `docker-compose.yml`:
```yaml
volumes:
  - ./notebook/inbox:/app/notebook/inbox
  - ./notebook/external-inbox:/app/notebook/external-inbox
  - ./backups:/app/backups
  - anchor-data:/app/engine/context_data
```

**Verify volumes:**
```bash
docker-compose exec anchor-engine ls -la /app/notebook/inbox
```

---

## Performance Issues

### Slow Ingestion

**Symptoms:** Ingestion takes >1 minute per file

**Solutions:**

1. **Enable Parallel Processing:**
   ```json
   {
     "adaptive_concurrency": {
       "environment": "high_memory",
       "max_concurrency": 5
     }
   }
   ```

2. **Disable Synonyms (Temporarily):**
   ```json
   {
     "tagging": {
       "modulation_level": 0
     }
   }
   ```

3. **Use Streaming Ingest:**
   ```bash
   curl -X POST http://localhost:3160/v1/ingest/streaming \
     -F "file=@large-file.txt"
   ```

---

### High CPU Usage

**Symptoms:** CPU at 100% continuously

**Solutions:**

1. **Check Watchdog:**
   ```bash
   curl http://localhost:3160/v1/watchdog/status
   ```

2. **Reduce Concurrency:**
   ```json
   {
     "adaptive_concurrency": {
       "max_concurrency": 2
     }
   }
   ```

3. **Profile:**
   ```bash
   node --prof engine/dist/index.js
   node --prof-process isolate-*.log
   ```

---

## Getting Help

### Logs Location

| Log Type | Location |
|----------|----------|
| Server | `engine/logs/server.log` |
| MCP | `mcp-server/logs/` |
| UI | Browser DevTools Console |
| Build | `pnpm build` output |

### Debug Mode

Enable verbose logging:
```json
{
  "logging": {
    "level": "debug"
  }
}
```

### Health Check Commands

```bash
# Check engine health
curl http://localhost:3160/health

# Check stats
curl http://localhost:3160/v1/stats

# Check ingestion status
curl http://localhost:3160/v1/ingest/status

# Check watchdog
curl http://localhost:3160/v1/watchdog/status

# Check memory
curl http://localhost:3160/v1/system/status | jq .memory_mb
```

### Support Channels

- **GitHub Issues:** https://github.com/RSBalchII/anchor-engine-node/issues
- **Discussions:** https://github.com/RSBalchII/anchor-engine-node/discussions
- **Documentation:** [`docs/`](../../docs/)
- **Standards:** [`specs/current-standards/`](../../specs/current-standards/)

---

## Appendix: Quick Reference

### Common Commands

```bash
# Start engine
pnpm start

# Restart engine
pnpm restart

# Stop engine
pkill -f "anchor-engine"

# Check health
curl http://localhost:3160/health

# View stats
curl http://localhost:3160/v1/stats

# Watch logs
tail -f engine/logs/server.log

# Force kill
pkill -9 -f "anchor-engine"

# Clear build
rm -rf dist engine/dist node_modules

# Rebuild all
pnpm install && pnpm build:all
```

### Configuration Quick Reference

```json
{
  "server": {
    "port": 3160,
    "api_key": "your-api-key"
  },
  "database": {
    "wipe_on_startup": true
  },
  "adaptive_concurrency": {
    "environment": "low_memory",
    "max_concurrency": 2
  },
  "mcp": {
    "allow_write_operations": true,
    "default_bucket_for_writes": "external-inbox"
  },
  "watcher": {
    "exclude_patterns": ["**/*.log", "**/node_modules/**"]
  }
}
```
