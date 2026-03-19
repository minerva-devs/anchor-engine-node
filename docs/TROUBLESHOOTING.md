# Anchor Engine - Troubleshooting Guide

**Version:** 4.8.0 | **Last Updated:** March 18, 2026

---

## Quick Fixes

### Engine Won't Start
```bash
# Check if port 3160 is in use
lsof -i :3160

# Kill existing process
kill -9 <PID>

# Restart
pnpm start
```

### Out of Memory
Edit `user_settings.json`:
```json
{
  "adaptive_concurrency": {
    "environment": "low_memory"
  }
}
```

### Can't Find My Data
1. Check ingestion logs: `engine/logs/server.log`
2. Verify paths in "Manage Paths" (Web UI)
3. Try manual ingest via "Paste & Ingest"

---

## Installation Issues

### PNPM Not Found
```bash
# Install globally
npm install -g pnpm

# Or use corepack (Node.js 16+)
corepack enable pnpm
```

### Build Fails
```bash
# Clean and rebuild
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

### Port Already in Use
```bash
# Find what's using port 3160
lsof -i :3160
netstat -tulpn | grep 3160

# Kill the process
kill -9 <PID>

# Or change port in user_settings.json
{
  "server": {
    "port": 3161
  }
}
```

---

## Ingestion Issues

### Files Not Ingesting

**Symptoms:** Files added to watched paths don't appear in search

**Causes:**
1. Watchdog not running
2. File in exclude pattern
3. File too large

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
         "**/.git/**"
       ]
     }
   }
   ```

3. **Manual Ingest:**
   - Use Web UI → "Paste & Ingest"
   - Or API: `POST /v1/ingest`

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
   ```

3. **Increase Memory:**
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" pnpm start
   ```

---

## Search Issues

### No Results Found

**Symptoms:** Query returns empty results

**Causes:**
1. No data ingested
2. Wrong bucket selected
3. Token budget too low

**Solutions:**

1. **Verify Data Exists:**
   ```bash
   curl http://localhost:3160/v1/stats
   ```

2. **Check Bucket Filters:**
   - Web UI: Ensure correct buckets selected
   - API: Remove `buckets` filter or add correct ones

3. **Increase Token Budget:**
   ```json
   {
     "token_budget": 8192
   }
   ```

### Slow Search

**Symptoms:** Search takes >5 seconds

**Causes:**
1. Max-recall mode enabled
2. Too many results
3. Low memory

**Solutions:**

1. **Use Standard Mode:**
   ```json
   {
     "strategy": "standard"
   }
   ```

2. **Limit Results:**
   ```json
   {
     "max_chars": 4096
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

---

## MCP Issues

### MCP Server Not Connecting

**Symptoms:** Claude/Cursor/Qwen Code can't connect

**Solutions:**

1. **Check MCP Server:**
   ```bash
   cd mcp-server
   npm run build
   npm start
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

### Write Operations Disabled

**Symptoms:** `anchor_ingest_text` returns "Write operations disabled"

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

---

## Database Issues

### Database Corruption

**Symptoms:** "Database not initialized" or SQL errors

**Solution:**

1. **Stop Engine:**
   ```bash
   pnpm stop
   ```

2. **Backup Data:**
   ```bash
   cp -r engine/context_data engine/context_data.backup
   ```

3. **Delete Database:**
   ```bash
   rm -rf engine/context_data
   ```

4. **Restart (Auto-Rebuild):**
   ```bash
   pnpm start
   ```

**Note:** Data is preserved in `mirrored_brain/` - database rebuilds from it.

### Slow Database

**Symptoms:** All operations slow

**Solutions:**

1. **Enable WAL Mode:**
   ```sql
   PRAGMA journal_mode=WAL;
   ```

2. **Increase Cache:**
   ```sql
   PRAGMA cache_size=-20000;  -- 20MB cache
   ```

3. **Vacuum:**
   ```bash
   curl -X POST http://localhost:3160/v1/system/vacuum
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
       "environment": "low_memory"
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
   0 3 * * * cd /path/to/anchor-engine-node && pnpm restart
   ```

---

## Web UI Issues

### Blank Page

**Symptoms:** Web UI shows blank page

**Solutions:**

1. **Check Build:**
   ```bash
   cd packages/anchor-ui
   npm run build
   ```

2. **Clear Cache:**
   - Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
   - Clear browser cache

3. **Check Console:**
   - Open DevTools (F12)
   - Check Console tab for errors

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

3. **Check Engine Logs:**
   ```bash
   tail -f engine/logs/server.log
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

### Data Lost After Restart

**Symptoms:** Data disappears after container restart

**Cause:** Volumes not mounted correctly

**Solution:**

Check `docker-compose.yml`:
```yaml
volumes:
  - ./mirrored_brain:/app/mirrored_brain
  - ./backups:/app/backups
  - anchor-data:/app/engine/context_data
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

### Debug Mode

Enable verbose logging:
```json
{
  "logging": {
    "level": "debug"
  }
}
```

### Support Channels

- **GitHub Issues:** https://github.com/RSBalchII/anchor-engine-node/issues
- **Discussions:** https://github.com/RSBalchII/anchor-engine-node/discussions
- **Documentation:** [`docs/`](./)
