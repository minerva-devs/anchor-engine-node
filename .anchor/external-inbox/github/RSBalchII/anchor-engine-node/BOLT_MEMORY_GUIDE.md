# Bolt Memory - Qwen Code Agent Memory System

**Version:** 1.0.0  
**Created:** 2026-03-20  
**Purpose:** Persistent memory for Qwen Code agent using Anchor Engine

---

## 🎯 Overview

Bolt Memory is a dedicated Anchor Engine instance running on port **3161** that serves as persistent memory for the Qwen Code agent. It ingests chat history, creates checkpoint distillations, and enables semantic search across all past conversations.

**Key Features:**
- ✅ Persistent database (survives restarts)
- ✅ JSONL chat file ingestion
- ✅ Checkpoint distillation
- ✅ Semantic search with provenance tracking
- ✅ Configurable ingestion settings

---

## 📁 Directory Structure

```
/data/data/com.termux/files/home/projects/bolt-memory/
├── engine/                    # Anchor Engine source
├── local-data/               # All user data
│   ├── inbox/               # Files to ingest
│   │   ├── qwen-*.jsonl     # Qwen chat sessions
│   │   └── distilled/       # Distillation outputs
│   ├── external-inbox/      # External content
│   └── mirrored_brain/      # Cleaned mirrors
├── user_settings.json        # Configuration
└── ingest-chats.js          # Chat ingestion script
```

---

## 🚀 Quick Start

### 1. Start the Engine

```bash
cd /data/data/com.termux/files/home/projects/bolt-memory
pnpm start
```

Wait for: `Anchor Context Engine running on 0.0.0.0:3161`

### 2. Check Health

```bash
curl -s http://localhost:3161/health
```

Expected: `{"status":"healthy",...}`

### 3. Ingest Chat History

```bash
# Copy chat files to inbox
node ingest-chats.js

# Trigger ingestion
curl -X POST http://localhost:3161/v1/watchdog/ingest \
  -H "Authorization: Bearer bolt-memory-secret"
```

### 4. Create Distillation

```bash
curl -X POST http://localhost:3161/v1/memory/distill \
  -H "Authorization: Bearer bolt-memory-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "seed": {"query": "Qwen Code agent development"},
    "radius": 2,
    "output_format": "json"
  }'
```

### 5. Search Memory

```bash
curl -X POST http://localhost:3161/v1/memory/search \
  -H "Authorization: Bearer bolt-memory-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "agent checkpoint distillation",
    "token_budget": 2000
  }'
```

---

## 📊 Current Status

### Database Stats (as of 2026-03-20)
- **Compounds:** 5
- **Sources:** 5
- **Atoms:** 1,611
- **Molecules:** 1,580

### Ingested Sessions
1. `236d683f-ce42-4085-accc-b05bff7fdf62.jsonl` - 2 messages (0.00MB)
2. `66d17907-70b4-4450-abda-30e8f2d15433.jsonl` - 2 messages (0.00MB)
3. `6a85a0d4-b01a-4bb2-a08a-315a37245fc3.jsonl` - 70 messages (0.09MB)

### Available API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/v1/stats` | GET | Database statistics |
| `/v1/memory/search` | POST | Semantic search |
| `/v1/memory/distill` | POST | Radial distillation |
| `/v1/watchdog/ingest` | POST | Trigger file ingestion |
| `/v1/system/ingest-status` | GET | Ingestion progress |
| `/v1/config/ingestion` | GET/POST | Ingestion settings |

---

## 🔧 Configuration

### user_settings.json Key Settings

```json
{
    "server": {
        "port": 3161,
        "api_key": "bolt-memory-secret"
    },
    "database": {
        "wipe_on_startup": true  // Default: database is ephemeral, data persists in inbox/
    },
    "ingestion": {
        "concept_density": "high",
        "tag_threshold": 0.7,
        "dedup_strength": "aggressive",
        "token_budget_default": 2000,
        "ingestion_profile": "chat"
    }
}
```

### Critical Settings

- **`wipe_on_startup: true`** - Default: database is ephemeral (data persists in `inbox/`)
- **`port: 3161`** - Different from main engine (3160)
- **`ingestion_profile: "chat"`** - Optimized for chat logs

**Note:** The database is wiped and rebuilt on every startup. Your data is safe in `local-data/inbox/` (source of truth). See [Standard 020](specs/current-standards/020-ephemeral-database.md).

---

## 📝 Reliable Agent Flow

### Workflow Steps

```
1. Qwen Chat Session
   ↓
2. Export to JSONL (automatic in .qwen/projects/)
   ↓
3. Copy to bolt-memory inbox
   ↓
4. Trigger watchdog ingestion
   ↓
5. Wait for completion
   ↓
6. Run distillation (checkpoint)
   ↓
7. Search/Query in future sessions
```

### Example Script

```javascript
// ingest-one.js - Ingest smallest files first
import fs from 'fs';
import path from 'path';

const CHAT_DIR = '/data/data/com.termux/files/home/.qwen/projects/-data-data-com-termux-files-home/chats';
const OUTPUT_DIR = './local-data/inbox';

// Get files sorted by size (smallest first)
const chatFiles = fs.readdirSync(CHAT_DIR)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => ({ name: f, size: fs.statSync(path.join(CHAT_DIR, f)).size }))
    .sort((a, b) => a.size - b.size);

// Copy smallest 3 files
for (const file of chatFiles.slice(0, 3)) {
    fs.copyFileSync(
        path.join(CHAT_DIR, file.name),
        path.join(OUTPUT_DIR, `qwen-${file.name}`)
    );
}

console.log('✅ Ready for ingestion!');
```

---

## ⚠️ Important Notes

### File Size Limits

- **Small files (< 1MB):** Ingest immediately
- **Medium files (1-10MB):** Ingest one at a time
- **Large files (> 10MB):** May cause timeout, ingest separately

### Database Persistence

Anchor Engine uses an **ephemeral database** architecture:

| Setting | Behavior | Data Persistence |
|---------|----------|------------------|
| **`wipe_on_startup: true`** (default) | Database wiped on startup | ✅ Data persists in `inbox/` - rebuilt automatically |
| **`wipe_on_startup: false`** | Database retained | ⚠️ Risks corruption - not recommended |

**Key Principle:** The database is a disposable cache. The `inbox/` directory is the source of truth and is never deleted.

### Watchdog Configuration

The watchdog now supports `.jsonl` files (added in v4.8.2):

```typescript
// engine/src/services/ingest/watchdog.ts:291
if (!filePath.endsWith('.jsonl')) return; // Now accepts JSONL
```

---

## 🧪 Testing

### Verify Ingestion

```bash
# Check database counts
node -e "import('./engine/dist/core/db.js').then(async ({ db }) => {
  await db.init();
  const c = await db.run('SELECT COUNT(*) as count FROM compounds');
  console.log('Compounds:', c.rows[0].count);
})"
```

### Test Search

```bash
curl -X POST http://localhost:3161/v1/memory/search \
  -H "Authorization: Bearer bolt-memory-secret" \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "token_budget": 1000}'
```

### Test Distillation

```bash
curl -X POST http://localhost:3161/v1/memory/distill \
  -H "Authorization: Bearer bolt-memory-secret" \
  -H "Content-Type: application/json" \
  -d '{"seed": {"query": "test"}, "radius": 2}'
```

---

## 📈 Future Enhancements

### Planned Features

- [ ] Automatic checkpoint triggering (every N messages)
- [ ] Multi-session distillation (weekly summaries)
- [ ] Agent configuration profiles
- [ ] Real-time ingestion progress (SSE)
- [ ] Versioned distillation outputs

### Known Limitations

- Large files (> 20MB) may timeout during ingestion
- No automatic chat export (manual copy required)
- Single-user only (no RBAC)

---

## 🔍 Troubleshooting

### Engine Won't Start

```bash
# Check if port is in use
lsof -i :3161

# Kill existing process
pkill -f "node.*engine/dist/index.js"

# Restart
pnpm start
```

### Data Not Persisting

1. **Verify files are in `local-data/inbox/`** (source of truth)
2. **Check engine logs** for rebuild progress: `tail -f engine/logs/server.log`
3. **Trigger manual ingestion:** `curl -X POST http://localhost:3161/v1/watchdog/ingest`
4. **If ingestion hangs:** Force kill and restart (database will auto-wipe and rebuild):
   ```bash
   pkill -9 -f "anchor-engine"
   pnpm start
   ```

**Note:** With `wipe_on_startup: true` (default), the database rebuilds from `inbox/` on every startup. This is expected behavior.

### Search Returns No Results

1. Verify data exists: Check database stats
2. Try broader query
3. Increase `token_budget`

---

## 📚 Related Documentation

- [AGENT_CONTROLLED_ENGINE.md](../../docs/AGENT_CONTROLLED_ENGINE.md) - MCP tools reference
- [CHANGELOG.md](../../CHANGELOG.md) - v4.8.2 release notes
- [API.md](../../docs/API.md) - Full API reference

---

**Last Updated:** 2026-03-20  
**Maintained By:** Qwen Code Agent
