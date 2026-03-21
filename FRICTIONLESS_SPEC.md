# 🎯 Anchor Engine - Frictionless Experience Specification

**Version:** 1.0  
**Created:** 2026-03-21  
**Goal:** Every interaction should be as easy as "click a button or type a simple command"

---

## 📋 Executive Summary

**Current State:** 11+ hours of debugging, configuration hunting, silent failures  
**Target State:** Zero-conf installation, automatic discovery, transparent operations

**Design Principle:** If it requires documentation, it's too complex.

---

## 🎯 1. Zero‑Conf Installation & Startup

### **Current Pain Points**
- Settings file confusion (bolt-memory vs anchor-engine-node)
- Watchdog disabled by default
- Silent startup failures
- No confirmation it's working

### **Target Experience**

```bash
# One command install
npm install -g anchor-engine

# One command setup (optional - detects everything automatically)
anchor init

# One command start
anchor start
```

### **Implementation Requirements**

#### 1.1 Automatic Settings File Creation
```bash
# anchor init creates:
~/.anchor-engine/
├── user_settings.json    # Single source of truth
├── database/             # PGlite data directory
├── logs/                 # Rotated log files
└── .anchor.pid           # Process ID for management
```

#### 1.2 Watchdog Auto-Enable
**Rule:** If `watcher.extra_paths` is non-empty → Watchdog starts automatically

```typescript
// engine/src/services/watchdog-service.ts
async start() {
  const config = await this.loadConfig();
  
  // NEW: Auto-enable if paths configured
  if (config.watcher?.extra_paths?.length > 0) {
    this.enabled = true;
    this.logger.info('🔍 Watchdog auto-enabled: watching ' + 
      config.watcher.extra_paths.length + ' paths');
  }
  
  // ... rest of startup
}
```

#### 1.3 Startup Status Banner
```
⚓ Anchor Engine v4.8.2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Database: fresh (or: 30,922 atoms)
✅ Watchdog: active, watching 3 paths
   • ~/.qwen/projects/-data-data-com-termux-files-home/chats
   • ~/.config/Claude/chats
   • ~/projects/my-app/docs
✅ MCP server: ready on stdio
✅ API key: set (bolt-memory-secret)
✅ Health: http://localhost:3161/health
⏱️  Startup complete in 7.4s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 1.4 PID File Management
```bash
# On start
echo $PID > ~/.anchor-engine/.anchor.pid

# anchor stop reads PID file and kills process
anchor stop  # Graceful shutdown
anchor restart # Stop + start
```

---

## 🔄 2. Automatic Chat Discovery

### **Current Pain Points**
- Had to manually find Qwen chat directory
- No examples for common agents
- Path configuration unclear

### **Target Experience**

```bash
# Auto-detect on first run
anchor init

# Output:
🔍 Scanning for agent chat directories...
✅ Found Qwen Code: ~/.qwen/projects/.../chats (19 sessions)
✅ Found Claude Desktop: ~/.config/Claude/chats (5 sessions)
❓ Add these to watcher? [Y/n] y
✅ Watcher configured with 2 paths
```

### **Implementation Requirements**

#### 2.1 Built-in Agent Heuristics

```typescript
// engine/src/utils/agent-discovery.ts

const KNOWN_AGENTS = {
  qwen: {
    name: 'Qwen Code',
    paths: [
      '~/.qwen/projects/*/chats/*.jsonl',
      '/data/data/com.termux/files/home/.qwen/projects/*/chats/*.jsonl'
    ]
  },
  claude: {
    name: 'Claude Desktop',
    paths: [
      '~/Library/Application Support/Claude/chats/*.jsonl',  // macOS
      '~/.config/Claude/chats/*.jsonl'  // Linux
    ]
  },
  cursor: {
    name: 'Cursor',
    paths: ['~/.cursor/chats/*.jsonl']
  },
  continue: {
    name: 'Continue.dev',
    paths: ['~/.continue/chats/*.jsonl']
  }
};

async function discoverAgents(): Promise<DiscoveredAgent[]> {
  const found: DiscoveredAgent[] = [];
  
  for (const [key, agent] of Object.entries(KNOWN_AGENTS)) {
    for (const pattern of agent.paths) {
      const matches = await glob(pattern);
      if (matches.length > 0) {
        found.push({
          id: key,
          name: agent.name,
          chatDir: dirname(matches[0]),
          sessionCount: matches.length
        });
        break;
      }
    }
  }
  
  return found;
}
```

#### 2.2 Agent Registration API

```bash
# Any agent can register itself
curl -X POST http://localhost:3161/v1/agent/register \
  -H "Authorization: Bearer $ANCHOR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "qwen",
    "chat_path": "/path/to/chats",
    "auto_start": true
  }'

# Response:
{
  "status": "success",
  "message": "Registered qwen at /path/to/chats",
  "watcher_restarted": true
}
```

#### 2.3 CLI Commands

```bash
# List discovered agents
anchor agents discover

# Add specific agent
anchor agents add qwen

# List configured agents
anchor agents list

# Remove agent
anchor agents remove claude
```

---

## 📡 3. Transparent Ingestion & Error Reporting

### **Current Pain Points**
- "Ingested 5 files" but 0 atoms (silent failure)
- No progress feedback
- Database corruption undetected

### **Target Experience**

```bash
# Watch ingestion in real-time
anchor ingest --watch

# Output:
📁 Ingesting Qwen chats...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1/19] session-abc.jsonl
   ✅ 3,421 atoms created
   ✅ 89 tags extracted
   ⏱️  2.3s

[2/19] session-def.jsonl
   ✅ 2,891 atoms created
   ✅ 67 tags extracted
   ⏱️  1.8s

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Complete: 30,922 atoms from 19 sessions in 42s
📊 Database: 30,922 atoms, 62 tags, 35,013 molecules
```

### **Implementation Requirements**

#### 3.1 Per-File Ingestion Stats

```typescript
interface IngestionStats {
  file: string;
  atomsCreated: number;
  tagsExtracted: number;
  moleculesCreated: number;
  errors: string[];
  durationMs: number;
}

async function ingestFile(path: string): Promise<IngestionStats> {
  const start = Date.now();
  const stats: IngestionStats = {
    file: path,
    atomsCreated: 0,
    tagsExtracted: 0,
    moleculesCreated: 0,
    errors: [],
    durationMs: 0
  };
  
  try {
    // ... ingestion logic
    
    // Track each success
    stats.atomsCreated = result.atoms.length;
    stats.tagsExtracted = result.tags.length;
    
  } catch (error) {
    stats.errors.push(error.message);
    // Auto-retry with backoff
    if (error.code === 'SQLITE_LOCKED') {
      await retryWithBackoff(() => ingestFile(path));
    }
  }
  
  stats.durationMs = Date.now() - start;
  return stats;
}
```

#### 3.2 Status Endpoint

```bash
GET /v1/ingest/status

Response:
{
  "active": true,
  "currentFile": "session-abc.jsonl",
  "processed": 3,
  "total": 19,
  "atomsCreated": 8934,
  "tagsExtracted": 234,
  "errors": [],
  "estimatedTimeRemaining": "35s"
}
```

#### 3.3 Database Integrity Check

```typescript
// On engine startup
async function checkDatabaseIntegrity(): Promise<boolean> {
  try {
    await db.query('SELECT COUNT(*) FROM atoms');
    return true;
  } catch (error) {
    if (error.message.includes('invalid response')) {
      logger.warn('⚠️  Database corruption detected');
      logger.info('🔄 Auto-recovery: backing up and rebuilding...');
      
      // Backup old DB
      await fs.rename(DB_DIR, DB_DIR + '.corrupt.' + Date.now());
      
      // Rebuild from inbox
      await rebuildFromInbox();
      
      return false;
    }
    throw error;
  }
}
```

---

## 🔍 4. Search That Returns Content + Debuggability

### **Current Pain Points**
- 0 results despite 30K atoms
- Response only metadata, no content
- No way to diagnose why search fails

### **Target Experience**

```bash
# Normal search (returns content)
anchor search "android binary build"

# Output:
📊 Found 12 results (0.15s)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1] Score: 0.94 | session-6a85a0d4 | 2026-03-07
    "The Android binary build plan includes 5 phases:
     1. Fix GitHub authentication
     2. Build native modules for arm64-android
     3. Create MCP binary with pkg
     ..."

[2] Score: 0.87 | session-236d683f | 2026-03-10
    "pnpm build typescript compile engine mcp..."

...

# Debug mode (shows why)
anchor search "android" --debug

# Additional output:
🔍 Debug Info:
   Query tags: ["android", "termux", "build"]
   FTS matches: 45 atoms
   Graph matches: 12 molecules
   Rejected by score: 33 atoms (score < 0.5)
   Total atoms in DB: 30,922
   Tags in DB matching: ["android", "termux", "binary", "build"]
```

### **Implementation Requirements**

#### 4.1 Include Content in Results

```typescript
// Current response (broken)
{
  "type": "metadata",
  "totalResults": 0
}

// New response (fixed)
{
  "metadata": {
    "totalResults": 12,
    "durationMs": 150,
    "strategy": "split_merge"
  },
  "results": [
    {
      "uuid": "abc-123",
      "content": "The actual text content...",
      "source": "qwen-session-uuid",
      "timestamp": "2026-03-07T15:54:07Z",
      "score": 0.94,
      "tags": ["android", "binary", "build"],
      "receipt": {
        "tagMatches": 3,
        "graphHops": 2,
        "recencyBonus": 0.1
      }
    }
  ]
}
```

#### 4.2 Debug Endpoint

```bash
POST /v1/memory/search?debug=true

Response includes debug object:
{
  "results": [...],
  "debug": {
    "queryTags": ["android", "termux"],
    "ftsMatches": 45,
    "graphMatches": 12,
    "rejectedByScore": [
      {"uuid": "xyz", "score": 0.3, "reason": "no tag overlap"}
    ],
    "atomsInDb": 30922,
    "tagsInDb": ["android", "termux", "qwen", ...],
    "indexStatus": "healthy",
    "tagDerivationStatus": "success"
  }
}
```

#### 4.3 Non-Streaming Mode

```bash
# Add query param for single JSON response
curl -X POST "http://localhost:3161/v1/memory/search?stream=false" \
  -H "Content-Type: application/json" \
  -d '{"query": "android"}'
```

---

## 🧩 5. MCP Server That Just Works

### **Current Pain Points**
- Auth required but not obvious
- "MCP server disabled" confusion
- Manual env var configuration

### **Target Experience**

```bash
# No manual config needed
anchor mcp start

# Output:
🔌 MCP Server starting...
✅ API key: loaded from settings (bolt-memory-secret)
✅ Engine URL: http://localhost:3161
✅ Rate limit: 120 req/min
✅ Ready on stdio
```

### **Implementation Requirements**

#### 5.1 Read Settings from Shared Config

```typescript
// mcp-server/src/config.ts

// Instead of requiring env vars:
const apiKey = process.env.ANCHOR_API_KEY;  // ❌ Manual

// Read from settings file:
const settingsPath = path.join(os.homedir(), '.anchor-engine', 'user_settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
const apiKey = settings.server.api_key;  // ✅ Automatic
```

#### 5.2 Clear Error Messages

```typescript
if (!apiKey) {
  console.error(`
🔑 No API key found

Fix:
1. Run: anchor init (generates new key)
2. Or add to user_settings.json:
   {
     "server": {
       "api_key": "your-secret-key"
     }
   }
`);
  process.exit(1);
}
```

#### 5.3 Default Key Generation

```bash
# anchor init generates and saves key
anchor init

# Output:
✨ Anchor Engine initialized
📁 Config: ~/.anchor-engine/user_settings.json
🔑 API key generated: anchor_sk_abc123...
   (saved to config, never shown again)
```

---

## 🧰 6. CLI Commands for Common Tasks

### **Current Pain Points**
- Remembering curl commands
- Unclear API endpoints
- No terminal-friendly interface

### **Target Experience**

```bash
# Check system status
anchor status

# Output:
⚓ Anchor Engine v4.8.2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: ✅ Healthy
Database: 30,922 atoms, 62 tags, 35,013 molecules
Watchdog: ✅ Active (watching 2 paths)
MCP Server: ✅ Running
Uptime: 2h 34m
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Add watch path
anchor watch add ~/.cursor/chats

# List watched paths
anchor watch list

# Trigger manual ingestion
anchor ingest ~/.qwen/projects/.../chats

# Quick search
anchor search "android build plan"

# View logs
anchor logs --tail 50

# Health check
anchor health

# Output:
✅ HTTP: http://localhost:3161/health (200 OK)
✅ Database: responsive (44ms)
✅ Watchdog: running
✅ MCP: connected
```

### **Implementation Requirements**

#### 6.1 CLI Wrapper Script

```typescript
#!/usr/bin/env node
// bin/anchor

import { Command } from 'commander';

const program = new Command();

program
  .name('anchor')
  .description('Anchor Engine CLI')
  .version('4.8.2');

program
  .command('start')
  .description('Start Anchor Engine')
  .action(() => {
    // Start engine with banner
  });

program
  .command('status')
  .description('Show system status')
  .action(async () => {
    const stats = await fetch('/v1/stats');
    const health = await fetch('/health');
    // Display formatted output
  });

program
  .command('search <query>')
  .description('Search memory')
  .option('--debug', 'Show debug info')
  .action(async (query, options) => {
    const results = await post('/v1/memory/search', { query });
    displayResults(results, options.debug);
  });

// ... more commands

program.parse();
```

---

## 📚 7. Documentation Structure

### **Current Pain Points**
- No agent-specific guides
- Assumed too much knowledge
- No troubleshooting mirror of pain points

### **Target Experience**

```
docs/
├── README.md                 # 5-minute quick start
├── INSTALL.md                # Detailed install guide
├── AGENTS/
│   ├── qwen-code.md          # Qwen-specific setup
│   ├── claude-desktop.md     # Claude Desktop setup
│   ├── cursor.md             # Cursor IDE setup
│   └── continue.md           # Continue.dev setup
├── CLI.md                    # All CLI commands
├── API.md                    # API reference
├── TROUBLESHOOTING.md        # Mirrors pain points doc
└── VIDEO_GUIDES/
    ├── install-demo.gif
    └── first-search-demo.gif
```

### **README.md Structure**

```markdown
# Anchor Engine

**Persistent memory for AI agents**

## 30-Second Quick Start

```bash
npm install -g anchor-engine
anchor init
anchor start
```

That's it. Your agent now has memory.

## Agent-Specific Setup

### Qwen Code
```bash
anchor agents add qwen
```

### Claude Desktop
```bash
anchor agents add claude
```

### Custom Agent
```bash
anchor watch add /path/to/your/chats
```

## Verify It Works

```bash
anchor status
anchor search "test query"
```

## Need Help?

- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
- [Full Documentation](docs/README.md)
- [Pain Points & Fixes](docs/PAIN_POINTS_DOCUMENTATION.md)
```

---

## 🔁 8. Agent Self-Registration Protocol

### **Vision:** Agents onboard themselves with zero human intervention

### **Implementation**

#### 8.1 Discovery Endpoint

```bash
GET /v1/discovery/agents

Response:
{
  "detected": [
    {
      "id": "qwen",
      "name": "Qwen Code",
      "chatDir": "~/.qwen/projects/.../chats",
      "sessions": 19,
      "registered": true
    },
    {
      "id": "claude",
      "name": "Claude Desktop",
      "chatDir": "~/.config/Claude/chats",
      "sessions": 5,
      "registered": false  # ← Agent can register
    }
  ]
}
```

#### 8.2 Agent Registration Flow

```typescript
// When agent first connects
async function onAgentConnect(agentId: string) {
  // 1. Check if already registered
  const config = await loadConfig();
  const isRegistered = config.watcher.extra_paths.some(
    path => path.includes(agentId)
  );
  
  if (isRegistered) {
    return { status: 'already_registered' };
  }
  
  // 2. Auto-detect chat directory
  const discovered = await discoverAgents();
  const agent = discovered.find(a => a.id === agentId);
  
  if (!agent) {
    return { 
      status: 'not_found',
      message: `Unknown agent: ${agentId}. Please specify chat_path.`
    };
  }
  
  // 3. Auto-register
  config.watcher.extra_paths.push(agent.chatDir);
  await saveConfig(config);
  await restartWatcher();
  
  return {
    status: 'registered',
    chatDir: agent.chatDir,
    sessions: agent.sessionCount
  };
}
```

#### 8.3 Agent SDK (Future)

```typescript
// agents/my-agent/src/memory.ts
import { AnchorClient } from '@anchor-engine/client';

const memory = new AnchorClient({
  agentId: 'my-agent',
  autoRegister: true  // ← One line, zero config
});

// Now memory works
const results = await memory.search('previous conversation');
```

---

## ✅ Implementation Priority Matrix

| Feature | Effort | Impact | Priority |
|---------|--------|--------|----------|
| Watchdog auto-enable | Low | High | 🔴 P0 |
| Startup banner | Low | High | 🔴 P0 |
| Search returns content | Medium | Critical | 🔴 P0 |
| MCP reads settings | Low | High | 🔴 P0 |
| CLI commands | Medium | High | 🟠 P1 |
| Agent discovery | Medium | Medium | 🟠 P1 |
| Ingestion progress | Medium | Medium | 🟠 P1 |
| Debug endpoint | Medium | High | 🟠 P1 |
| Auto-registration API | High | Medium | 🟡 P2 |
| Agent SDK | High | Medium | 🟡 P2 |

---

## 🎯 Success Metrics

**After implementation:**

- [ ] Install to first search: < 5 minutes
- [ ] Zero documentation needed for common agents
- [ ] All errors have clear fix instructions
- [ ] No silent failures (all errors logged visibly)
- [ ] CLI works for all common tasks
- [ ] Agents can self-register

**Test:** Hand this spec to a new agent developer. If they need to ask questions, we failed.

---

**Last Updated:** 2026-03-21  
**Next Review:** After P0 items complete
