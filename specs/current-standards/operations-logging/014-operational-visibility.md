# Standard 014: Operational Visibility

**Status:** Active
**Date:** 2026-03-22
**Supersedes:** N/A

## Context
Anchor Engine runs as a background service. Operators need visibility into startup status, health, and ongoing operations for debugging and monitoring.

## Pain Points Fixed
- Commit `dc072f9`: No startup confirmation made it unclear if engine started
- Commit `7ef1bd1`: No health endpoint for Docker health checks
- Commit `bbc7d04`: No ingestion progress tracking
- Commit `bbc7d04`: No agent discovery for multi-agent setups

## Requirements

### OPS-001: Startup Banner
Every service must print a startup banner showing:
- Version
- Database status (atom count)
- Watchdog status (paths being watched)
- API key status
- Health endpoint URL
- Startup time

```
⚓ Anchor Engine v4.9.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Database: 30,922 atoms
✅ Watchdog: active, watching 3 paths
✅ API key: set
✅ Health: http://localhost:3161/health
⏱️  Startup complete in 7.4s
```

### OPS-002: Health Endpoint
1. `GET /health` must return 200 healthy or 503 unhealthy
2. Verify database connectivity
3. Check critical directories exist
4. Docker health check compatible

```json
// Response
{
  "status": "healthy",
  "timestamp": "2026-03-22T05:32:31.839Z",
  "message": "Anchor Context Engine is running and database is responsive"
}
```

### OPS-003: Progress Tracking
1. Long operations must report progress
2. `GET /v1/ingest/status` returns current operation
3. Include files processed/total
4. Include estimated time remaining for large operations

```json
// Response
{
  "active": true,
  "state": "ingesting",
  "currentFile": "large-file.jsonl",
  "processed": 45,
  "total": 100,
  "atomsCreated": 1234,
  "startedAt": "2026-03-22T05:30:00.000Z",
  "queueDepth": 5
}
```

### OPS-004: Agent Discovery
1. `GET /v1/agent/discover` returns detected AI agents
2. Auto-detect common agent chat directories
3. Show watch status for each agent
4. Enable easy multi-agent setup

```json
// Response
{
  "status": "success",
  "count": 2,
  "agents": [
    {
      "id": "qwen",
      "name": "Qwen Code",
      "path": "/home/user/.qwen/chats",
      "sessionCount": 18,
      "isWatched": true
    },
    {
      "id": "claude",
      "name": "Claude",
      "path": "/home/user/.claude/chats",
      "sessionCount": 5,
      "isWatched": false
    }
  ]
}
```

### OPS-005: Background Startup Scripts (v5.2.0+)

**Purpose**: Agent-friendly background startup and shutdown for reliable Windows 11 execution.

**Scripts** (choose platform-native approach):

#### PowerShell Scripts (Windows, Recommended)

1. **`start-engine-bg.ps1`** - Background startup
   - Starts engine via `pnpm start`, captures output to `engine-start.log`
   - Detects port 3160 conflicts before starting
   - Polls `GET /health` until ready (~10s)
   - Exits immediately after confirming health check passes

2. **`stop-engine-bg.ps1`** - Graceful shutdown
   - Finds engine by port (netstat)
   - Sends SIGTERM first, force kills after 15s if unresponsive

**PowerShell Usage** (Windows):
```powershell
# Start the engine (agent continues immediately)
.\start-engine-bg.ps1

# Output:
# Starting Anchor Engine in background...
# Log file: C:\...\anchor-engine-node\engine-start.log
# Waiting for engine to become healthy (max 30s)...
# Engine is healthy on http://localhost:3160/ (took 9.7s)
# Log file: C:\...\anchor-engine-node\engine-start.log
# To stop: .\stop-engine-bg.ps1

# Stop the engine (agent continues immediately)
.\stop-engine-bg.ps1
```

**Benefits for Agents**:
- No blocking console output
- Windows-native process management
- Automatic build verification
- Port conflict resolution
- Persistent logging to `engine-start.log`

#### Node.js Scripts (Cross-platform)

1. **`scripts/start-engine-bg.mjs`** - Agent-friendly background startup
   - Verifies `engine/dist/index.js` exists before starting
   - Detects port 3160 conflicts, finds available port automatically
   - Logs all output to `.anchor/logs/start-{timestamp}.log`
   - Exits immediately after server is ready (agents can continue)
   - Waits for health check before confirming success

2. **`scripts/stop-engine-bg.mjs`** - Graceful shutdown by process
   - Finds engine by listening to port 3160 (cross-platform PID detection)
   - Graceful SIGTERM shutdown first, force kill if needed
   - Logs all operations to `.anchor/logs/stop-{timestamp}.log`

**Node.js Usage** (Cross-platform):
```bash
# Start the engine (agent continues immediately)
node scripts/start-engine-bg.mjs

// Output:
// ========================================
// [2026-06-03T...] Checking build status...
// ✅ Engine already built
// [2026-06-03T...] Checking port availability...
// ✅ Port 3160 is available
// [2026-06-03T...] Starting engine process...
// [2026-06-03T...] Waiting for server to be ready...
// ========================================
// ✅ Anchor Engine started successfully!
// Server: http://localhost:3160
// Health: http://localhost:3160/health
// Logs: .anchor/logs/
// ========================================
// 👋 Exiting - engine running in background

# Stop the engine (agent continues immediately)
node scripts/stop-engine-bg.mjs
```

## Implementation Notes
- Startup banner in `engine/src/utils/startup-banner.ts`
- Health endpoint in `engine/src/routes/health.ts`
- Ingestion status in `engine/src/routes/v1/ingest.ts`
- Agent discovery in `engine/src/routes/v1/agent.ts`
- PowerShell background scripts: `start-engine-bg.ps1`, `stop-engine-bg.ps1`
- Node.js background scripts: `scripts/start-engine-bg.mjs`, `scripts/stop-engine-bg.mjs`