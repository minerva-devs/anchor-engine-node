# Standard 116: Phoenix Protocol - Transactional Backup & Restore

**Status:** ✅ IMPLEMENTED | **Date:** February 22, 2026 | **Last Updated:** 2026-03 | **Priority:** CRITICAL

---

## Problem Statement

Prior to Phoenix Protocol, backup/restore operations were incomplete:
- Database could be restored but filesystem remained empty
- `inbox/`, `external-inbox/`, and `mirrored_brain/` had no files after restore
- Mirror Protocol ran on startup before files existed
- No timing or performance metrics for restore operations

**v2 correction (2026-03):** The original v1 backup stored raw DB atom records (`"memory"` section). `mirrored_brain/` stored verbatim raw copies of inbox files. Byte offsets in atoms pointed into cleaned DB content but the mirror held uncleaned content — they did not align. Backup restore reconstructed files by concatenating atom content fragments (imperfect).

## Solution

Phoenix Protocol implements **transactional backup/restore** that:
1. Restores all database tables (sources, engrams)
2. Rebuilds filesystem structure from `mirrored_brain/` (clean files)
3. Writes cleaned content to both `mirrored_brain/` AND `inbox/` / `external-inbox/`
4. Provides detailed timing and performance metrics

**MirroredBrain is now the backup source of truth.** `mirrored_brain/` holds cleaned `compound_body` content (sanitized: noise, timestamps, PII, LLM markers stripped). Backups are a file archive of `mirrored_brain/` — smaller than inbox and perfectly aligned with DB byte offsets.

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│  UI: SearchColumn.tsx                                   │
│  - Restore button with inline confirmation              │
│  - Progress display with stats                          │
├─────────────────────────────────────────────────────────┤
│  API: /v1/backup/restore                                │
│  - Validates backup file                                │
│  - Tracks timing metrics                                │
│  - Returns performance stats                            │
├─────────────────────────────────────────────────────────┤
│  Service: backup.ts                                     │
│  - restoreBackup() - Database restore                   │
│  - rebuildFilesystemFromSources() - Filesystem restore  │
│  - toPgArray() - PostgreSQL array conversion            │
└─────────────────────────────────────────────────────────┘
```

### Restore Flow (v2 — files format)

```
1. User initiates restore via UI
2. API validates backup file (accepts "files" key OR legacy "memory" key)
3. Stream-parse backup JSON (1000-item batches)
4. Insert sources, engrams into PGlite
5. Write "files" entries to mirrored_brain/
6. Copy @inbox/ → inbox/  and  @external-inbox/ → external-inbox/
7. Report completion with metrics
```

### Restore Flow (v1 legacy — "memory" format, backward compat)

```
1-4. Same as above
5. Query sources table for file paths
6. For each source:
   a. Aggregate atom content into file
   b. Write to inbox/ or external-inbox/
   c. Write to mirrored_brain/@inbox/ or @external-inbox/
7. Report completion
```

---

## Performance Benchmarks

### Production Test (February 22, 2026)

| Metric | Value |
|--------|-------|
| **Backup Size** | 1,015.40 MB |
| **Atoms Restored** | 281,690 |
| **Sources Restored** | 17 |
| **Total Time** | 828.8 seconds (13.8 minutes) |
| **Throughput** | 340 atoms/second |
| **Batch Size** | 1,000 items |
| **Memory Usage** | <600 MB peak |

### Optimization History

| Version | Batch Size | Speed | Notes |
|---------|------------|-------|-------|
| v1 | 100 | ~50 atoms/s | Too slow, excessive logging |
| v2 | 1000 | ~340 atoms/s | 10x faster, reduced logging |
| v3 | 1000 + filesystem | ~340 atoms/s | Added filesystem rebuild (atom aggregation) |
| v4 | files from mirrored_brain | N/A | Clean files; no atom aggregation needed |

---

## Implementation Details

### PostgreSQL Array Format

PGlite requires PostgreSQL array format for TEXT[] columns:
```typescript
function toPgArray(arr: any[]): string {
    if (!arr || !Array.isArray(arr)) return '{}';
    return '{' + arr.map(v => {
        if (v === null || v === undefined) return 'NULL';
        const str = String(v);
        if (str.includes(',') || str.includes('{') || str.includes('}') || str.includes('"')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }).join(',') + '}';
}
```

### Backup Format v2 (current)

```json
{
  "source": "anchor-engine",
  "timestamp": "...",
  "engrams": [...],
  "files": [
    { "path": "@inbox/myfile.txt", "content": "<cleaned compound_body>" },
    { "path": "@external-inbox/article.txt", "content": "..." }
  ]
}
```

`files` entries are read directly from `mirrored_brain/`. Paths use `@inbox/` and `@external-inbox/` prefixes to preserve source classification.

### Backup Format v1 (legacy, read-only)

```json
{
  "source": "anchor-engine",
  "timestamp": "...",
  "memory": [...],
  "engrams": [...]
}
```

v1 backups stored raw DB atom records. Still accepted by `restoreBackup()` and `validateBackup()` — routed to `rebuildFilesystemFromSources()` legacy path.

### Filesystem Rebuild Strategy (v1 legacy)

```typescript
async function rebuildFilesystemFromSources(): Promise<void> {
    // 1. Query all sources from database
    const sources = await db.run('SELECT path, hash, total_atoms FROM sources');
    
    // 2. For each source, aggregate atom content
    for (const source of sources) {
        const atoms = await db.run(
            `SELECT content FROM atoms WHERE source_path = $1 ORDER BY sequence, timestamp`,
            [source.path]
        );
        
        const content = atoms.rows.map(r => r.content).join('\n');
        
        // 3. Write to BOTH locations
        fs.writeFileSync(inboxPath, content, 'utf-8');
        fs.writeFileSync(mirroredBrainPath, content, 'utf-8');
    }
}
```

### Streaming Parser

Uses readline for memory-efficient streaming:
```typescript
const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity
});

for await (const line of rl) {
    // Parse JSON objects character-by-character
    // Handle multi-line embedding arrays
    // Batch 1000 items before flushing to DB
}
```

---

## API Response Format

```json
{
  "success": true,
  "message": "Backup restore complete",
  "stats": {
    "memory_count": 281690,
    "source_count": 17,
    "engram_count": 0,
    "timestamp": "2026-02-22T10:52:28.475Z"
  },
  "totalTime": "828.8",
  "atomsPerSec": 340
}
```

---

## UI Integration

### Restore Button Flow

```
1. User clicks "🔄 Restore Backup"
2. Panel shows list of available backups
3. User clicks "🔄 Restore" on specific backup
4. Inline confirmation appears (✅ Confirm / ❌ Cancel)
5. User confirms
6. Progress displayed every 10 seconds
7. Final stats shown with timing metrics
```

### Status Display

```
✅ Restore complete!

📊 Stats:
• Atoms: 281,690
• Sources: 17
• Engrams: 0
⚡ Speed: 340 atoms/second
⏱️ Time: 828.8s
```

---

## Error Handling

### Validation Errors
- Backup file not found
- Invalid JSON structure
- Missing required fields (timestamp, memory)

### Database Errors
- Array format conversion failures (logged, skipped)
- Constraint violations (ON CONFLICT handles)
- Connection timeouts (retry logic)

### Filesystem Errors
- Directory creation failures (logged, continue)
- File write permissions (logged, continue)
- Disk space exhaustion (fatal error)

---

## Testing Checklist

- [x] Database restore (atoms, sources, engrams)
- [x] Filesystem rebuild (inbox, external-inbox)
- [x] Mirrored brain rebuild (@inbox, @external-inbox)
- [x] Large file handling (1GB+ backups)
- [x] Memory efficiency (<600MB peak)
- [x] Performance metrics (timing, speed)
- [x] UI integration (confirmation, progress)
- [x] Error handling (validation, DB, filesystem)

---

## Related Standards

- **Standard 110** - Ephemeral Index Architecture
- **Standard 095** - Database Reset on Startup
- **Standard 059** - Reliable Ingestion Protocol

---

## Future Enhancements

| Priority | Feature | Benefit |
|----------|---------|---------|
| High | Incremental backups | Reduce backup size/time |
| Medium | Selective restore | Restore specific sources only |
| Medium | Backup compression | Reduce storage requirements |
| Low | Cloud sync integration | Offsite backup storage |
| Low | Scheduled backups | Automated backup creation |

---

**Implementation Date:** February 22, 2026  
**Tested In Production:** ✅ Yes (281,690 atoms restored)  
**Performance Verified:** ✅ 340 atoms/second
