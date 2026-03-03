# Standard 116: Phoenix Protocol

**Status:** ✅ Production Ready | **Version:** 1.0.0 | **Date:** February 22, 2026

---

## Overview

The Phoenix Protocol is a comprehensive backup and restore system for the Anchor Engine. It not only restores the database but also **rebuilds the inbox/external-inbox folder structure** from backup data, ensuring the source of truth (filesystem) matches the backup state.

---

## Why "Phoenix"?

Like the mythical bird rising from ashes, the Phoenix Protocol can resurrect your entire knowledge base from a single backup file—database **and** file structure alike.

---

## What Gets Backed Up

### MirroredBrain Files (v2 format)
- **mirrored_brain/** — cleaned copies of all ingested files (`compound_body`): noise, timestamps, PII, and LLM markers already stripped
- Smaller than inbox (cleaning removes boilerplate)
- Byte offsets align exactly to DB atoms

### Database Metadata
- **sources** - File provenance tracking
- **engrams** - System state and metadata

### Filesystem Structure (restored from mirrored_brain)
- **inbox/** - Internal/sovereign content
- **external-inbox/** - External content (web scrapes, news, etc.)

> **v1 legacy:** Old backups contain `"memory"` (raw atom records). These still restore correctly via the legacy path.

---

## Restore Process

When you restore from backup, the Phoenix Protocol:

1. **Validates Format** - Detects v2 (`"files"` key) or v1 legacy (`"memory"` key)
2. **Restores Metadata** - All sources and engrams
3. **Writes MirroredBrain** - Cleaned files to `mirrored_brain/`
4. **Rebuilds Folders** - Copies `@inbox/ → inbox/` and `@external-inbox/ → external-inbox/`
5. **DB Rebuilds on Startup** - Ephemeral index is rebuilt from `inbox/` automatically (Standard 110)

---

## Usage

### Via UI (Recommended)

1. Open http://localhost:3160
2. Navigate to **Search** column
3. Click **🔄 Restore Backup** button
4. Select a backup from the list
5. Click **🔄 Restore** on your chosen backup
6. Confirm the restore operation

### Via API

```bash
# List available backups
curl http://localhost:3160/v1/backups

# Get latest backup info
curl http://localhost:3160/v1/backup/latest

# Restore from backup
curl -X POST http://localhost:3160/v1/backup/restore \
  -H "Content-Type: application/json" \
  -d '{"filename": "backup_2026-02-21T02-18-00-164Z.json"}'
```

---

## Restore Stats

After a successful restore, you'll see stats like:

```json
{
  "success": true,
  "message": "Phoenix Protocol restore complete",
  "stats": {
    "memory_count": 280000,
    "source_count": 436,
    "engram_count": 15,
    "files_restored": 436,
    "inbox_restored": 400,
    "external_inbox_restored": 36
  }
}
```

---

## Backup File Location

Backups are stored in: `c:\Users\rsbiiw\Projects\anchor-engine-node\backups\`

---

## Important Notes

### Source of Truth
- **mirrored_brain/** is the backup source of truth (cleaned content)
- **inbox/** and **external-inbox/** are the runtime source of truth (restored from mirror)
- Database is a **disposable index** (Standard 110) — rebuilt on startup from inbox files
- Phoenix Protocol ensures all three are synchronized

### Restore Behavior
- Existing files in inbox/external-inbox will be **overwritten**
- Database is rebuilt on next startup (not during restore)
- Search results are cleared after restore

### Backup Creation
Create a backup via API:
```bash
curl -O http://localhost:3160/v1/backup
```

---

## Architecture

### Files
- `engine/src/services/backup/backup.ts` - Original backup service
- `engine/src/services/backup/backup-restore.ts` - Phoenix Protocol restore
- `engine/src/routes/api.ts` - API endpoints
- `packages/anchor-ui/src/components/features/SearchColumn.tsx` - UI button

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/backups` | GET | List all backups with validation status |
| `/v1/backup/latest` | GET | Get latest backup info |
| `/v1/backup/restore` | POST | Restore from backup (Phoenix Protocol) |
| `/v1/backup` | GET | Create and download new backup |

---

## Use Cases

### Scenario 1: Accidental Data Loss
1. Realize important content was deleted
2. Click **🔄 Restore Backup**
3. Select backup from before deletion
4. Restore complete - data resurrected!

### Scenario 2: Migration to New Machine
1. Copy backup file to new machine
2. Install Anchor Engine
3. Use Phoenix Protocol restore
4. Entire knowledge base restored with folder structure

### Scenario 3: Testing & Development
1. Create backup before major changes
2. Make experimental changes
3. If something breaks, restore from backup
4. Safe experimentation!

---

## Performance Benchmarks

| Metric | Value |
|--------|-------|
| **Backup Size** | 1,015.40 MB |
| **Atoms Restored** | 281,690 |
| **Sources Restored** | 17 |
| **Total Time** | 828.8s (13.8 min) |
| **Throughput** | 340 atoms/second |
| **Memory Peak** | <600 MB |

---

## Future Enhancements

- [ ] Incremental backups (delta-based)
- [ ] Selective restore (choose specific sources)
- [ ] Backup scheduling/automation
- [ ] Cloud storage integration
- [ ] Backup compression

---

## Related Standards

- **Standard 110** - Ephemeral Index Architecture
- **Standard 095** - Database Reset on Startup
- **Standard 059** - Reliable Ingestion Protocol

---

**Repository:** https://github.com/RSBalchII/anchor-engine-node
**Status:** ✅ Production Ready (February 22, 2026)
