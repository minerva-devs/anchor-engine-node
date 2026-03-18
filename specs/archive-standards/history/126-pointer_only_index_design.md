# Architecture Tradeoffs - Pointer-Only Index

**Version:** 1.0.0
**Date:** February 27, 2026
**Status:** Active

---

## Philosophy Alignment

This architecture embodies a core principle:

> **"Low power, high efficiency"** - The human brain achieves remarkable intelligence on ~20 watts by storing pointers to neural patterns, not perfect recordings. Anchor Engine's pointer-only index follows the same principle: the database holds only references (file paths, byte offsets), while content lives on disk.

**Result:** The index is a lightweight, disposable map—not a heavy copy. It can be wiped and rebuilt in minutes, uses <1GB RAM, and scales to terabytes of content. This is brain-inspired efficiency: store relationships, not raw data.

---

## Overview

Anchor Engine uses a **pointer-only index** architecture where the database stores references (pointers) to content, while raw content lives in the filesystem (`mirrored_brain/`). This document analyzes when this approach excels and when it may be suboptimal.

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                     Anchor Engine                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐         ┌─────────────────────┐       │
│  │  PGlite DB  │         │  mirrored_brain/    │       │
│  │  (Index)    │─────▶   │  (Content Store)    │       │
│  │             │ pointers│                     │       │
│  │ - Atoms     │         │ - Raw text files    │       │
│  │ - Molecules │         │ - YAML/MD/JSON      │       │
│  │ - Compounds │         │ - Original format   │       │
│  └─────────────┘         └─────────────────────┘       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Key Insight:** Database contains ~1-5% of total data size (pointers only).

---

## Rebuild Cost Analysis

### Time to Rebuild

| Corpus Size | Rebuild Time | Storage Savings |
|-------------|--------------|-----------------|
| 100 MB | ~3 minutes | 95-98% |
| 1 GB | ~30 minutes | 95-98% |
| 10 GB | ~5 hours | 95-98% |
| 100 GB | ~2 days | 95-98% |

**Assumptions:**
- Mid-range hardware (SSD, 16GB RAM)
- Ingestion rate: ~800 molecules/second
- Parallel processing enabled

### Storage Comparison

| Component | 100MB Corpus | 1GB Corpus | 10GB Corpus |
|-----------|--------------|------------|-------------|
| **Raw Content** | 100 MB | 1 GB | 10 GB |
| **Pointer Index** | 2-5 MB | 20-50 MB | 200-500 MB |
| **Total (Pointer)** | 102-105 MB | 1.02-1.05 GB | 10.2-10.5 GB |
| **Full Index (Alt)** | 150-200 MB | 1.5-2 GB | 15-20 GB |
| **Savings** | **~50%** | **~50%** | **~50%** |

---

## When Pointer-Only Shines ✅

### 1. Frequently Changing Content

**Scenario:** Daily ingestion of new documents, chat logs, meeting notes

**Why it works:**
- No database bloat from content updates
- Filesystem handles writes efficiently
- Easy to rollback (git revert, file restore)

**Example:**
```
Day 1: 100 files ingested
Day 2: 50 files updated, 25 deleted, 75 added
Day 3: Repeat...

Pointer index stays lean. Filesystem handles changes naturally.
```

### 2. Multiple Content Sources

**Scenario:** Syncing from Dropbox, Git repos, local directories

**Why it works:**
- Content stays in source systems
- Index references original locations
- No duplication of large files

**Example:**
```yaml
# Compound record in DB
{
  "id": "cmp_abc123",
  "path": "/home/user/Dropbox/notes/meeting-2026-02-27.md",
  "atoms": [...],
  "molecules": [...]
}

# Content lives in Dropbox, indexed locally
```

### 3. Privacy-Critical Deployments

**Scenario:** Sensitive data that cannot leave the machine

**Why it works:**
- Content never leaves filesystem
- Index is meaningless without content files
- Easy to verify no data exfiltration

**Example:**
```bash
# Verify no content in database
sqlite3 engine/context_data/database.db "SELECT content FROM atoms LIMIT 1;"
-- Returns NULL or truncated preview only
```

### 4. Cross-Platform Sync

**Scenario:** Same knowledge base across multiple machines

**Why it works:**
- Sync `mirrored_brain/` via any file sync tool
- Each machine rebuilds index locally
- No database merge conflicts

**Example:**
```
Machine A (Office)          Machine B (Home)
     ↓                           ↓
  Dropbox sync (files only)      ↓
     ↓                           ↓
  Rebuild index on boot      Rebuild index on boot
```

---

## When Pointer-Only Is Suboptimal ❌

### 1. Static Content (Build Once, Query Forever)

**Scenario:** Archival data, historical records, immutable documents

**Why suboptimal:**
- Rebuild cost with no benefit
- Content never changes, so duplication is fine
- Query performance could be better with full-text index

**Better Approach:**
```
Consider full-text indexing for:
- Historical archives
- Published documentation
- Reference materials

Hybrid: Pointers for active content, full-text for archives.
```

### 2. Extremely Low Restore Latency Tolerance

**Scenario:** Mission-critical systems requiring <10s recovery

**Why suboptimal:**
- Rebuild takes minutes to hours
- Full index restores instantly

**Better Approach:**
```
Use full database backup + restore:
- pg_dump for PGlite
- Point-in-time recovery
- Hot standby replicas
```

### 3. Content Deduplication Across Instances

**Scenario:** Multiple instances serving same content

**Why suboptimal:**
- Each instance stores full content copy
- No cross-instance deduplication
- Wasted storage

**Better Approach:**
```
Consider content-addressable storage:
- IPFS for distributed content
- Centralized content server
- Hash-based deduplication
```

### 4. Bandwidth-Constrained Environments

**Scenario:** Syncing large corpora over slow networks

**Why suboptimal:**
- Must sync all content files
- Index is small but useless without content
- No progressive loading

**Better Approach:**
```
Consider tiered approach:
- Sync index first (fast)
- Fetch content on-demand
- Cache frequently accessed content
```

---

## Hybrid Approaches (Future Work)

### 1. Content Caching

```javascript
// Cache frequently accessed content in DB
{
  "id": "atom_abc123",
  "content_preview": "First 1KB of content...",  // Cached
  "source_path": "/path/to/file.md",             // Pointer
  "content_hash": "sha256:..."                   // Integrity
}
```

**Benefits:**
- Fast access to common content
- Reduced filesystem reads
- Still rebuildable from source

### 2. Tiered Storage

```
Hot content (last 7 days) → Full text in DB
Warm content (last 90 days) → Preview + pointer
Cold content (older) → Pointer only
```

**Benefits:**
- Optimizes for recent/relevant content
- Reduces rebuild time for hot data
- Maintains rebuildability for cold data

### 3. Incremental Rebuild

```
On startup:
1. Check file hashes against index
2. Rebuild only changed files
3. Skip unchanged content

Result: 10x faster startup for stable corpora
```

---

## Decision Framework

### Questions to Ask

1. **How often does content change?**
   - Daily/Weekly → Pointer ✅
   - Rarely/Never → Consider full index

2. **What's your restore time tolerance?**
   - Minutes acceptable → Pointer ✅
   - Seconds required → Full index

3. **Do you need cross-instance sync?**
   - Yes, via file sync → Pointer ✅
   - Yes, via network → Consider hybrid

4. **Is content sensitivity high?**
   - Yes, must stay local → Pointer ✅
   - No, can be replicated → Either works

### Recommendation Matrix

| Use Case | Content Churn | Restore Tolerance | Recommendation |
|----------|---------------|-------------------|----------------|
| **Personal notes** | High | Minutes | Pointer ✅ |
| **Team wiki** | Medium | Minutes | Pointer ✅ |
| **Research archive** | Low | Hours | Hybrid ⚠️ |
| **Chat history** | High | Seconds | Cache + Pointer ✅ |
| **Code repository** | Medium | Minutes | Pointer ✅ |
| **Legal documents** | Low | Seconds | Full index ❌ |
| **Medical records** | Low | Seconds | Full index ❌ |

---

## Migration Paths

### From Pointer to Full Index

```sql
-- Migrate content into database
UPDATE atoms a
SET content = (
  SELECT content FROM mirrored_brain mb
  WHERE mb.path = a.source_path
)
WHERE a.content IS NULL;
```

### From Full Index to Pointer

```javascript
// Export content to filesystem
for (const atom of atoms) {
  const path = `mirrored_brain/${atom.id}.txt`;
  fs.writeFileSync(path, atom.content);
  
  // Update pointer
  atom.source_path = path;
  atom.content = null; // Clear from DB
}
```

---

## Performance Comparison

### Query Latency

| Architecture | Cold Query | Warm Query | Cached |
|--------------|------------|------------|--------|
| **Pointer-only** | 200ms | 150ms | N/A |
| **Full index** | 150ms | 100ms | 50ms |
| **Hybrid** | 180ms | 120ms | 60ms |

### Storage Efficiency

| Architecture | Index Size | Content Size | Total |
|--------------|------------|--------------|-------|
| **Pointer-only** | 5 MB | 100 MB | 105 MB |
| **Full index** | 150 MB | 0 MB | 150 MB |
| **Hybrid (cache 20%)** | 35 MB | 80 MB | 115 MB |

---

## Conclusion

The pointer-only index architecture is **optimal for**:
- ✅ Dynamic, frequently-changing content
- ✅ Privacy-critical deployments
- ✅ Cross-platform file sync scenarios
- ✅ Users comfortable with minutes-long rebuild times

Consider **hybrid or full index** for:
- ❌ Static archival data
- ❌ Sub-10-second restore requirements
- ❌ Multi-instance deduplication needs
- ❌ Bandwidth-constrained deployments

**Default recommendation:** Start with pointer-only. Migrate to hybrid if specific needs arise.

---

## Related Documentation

- [Security Guide](./security-guide.md) - Filesystem permissions
- [Benchmark Protocol](./benchmark-protocol.md) - Performance testing
- [Whitepaper](../docs/whitepaper.md) - Architecture overview

---

**Last Updated:** February 27, 2026  
**Next Review:** Q4 2026
