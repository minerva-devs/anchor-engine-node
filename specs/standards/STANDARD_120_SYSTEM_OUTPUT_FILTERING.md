# Standard 120: System Output Filtering

**Status:** ✅ Production Ready | **Version:** 1.0.0 | **Date:** February 28, 2026

**Pain Point:** Self-contamination of knowledge graph from Anchor/MCP system output

---

## Overview

Standard 120 defines the **System Output Filtering** protocol for preventing recursive self-contamination of the Anchor Engine knowledge graph.

When chat logs or documents containing Anchor search results, MCP agent output, or other system-generated metadata are ingested, they must be **cleaned of system metadata** to prevent pollution of the knowledge graph with synthetic scores, IDs, and formatting.

---

## Problem Statement

### The Contamination Risk

Without filtering, ingesting chat logs containing Anchor output creates recursive pollution:

```yaml
# Example contaminated content:
- id: "virtual_mem_abc123"
  source: "inbox/Personal/chats-combined_context.yaml"
  score: 500
  content: "..."
  tags: ["#Rob", "#Dory"]
```

If ingested without cleaning:
- ❌ **Synthetic scores** (500) pollute relevance ranking
- ❌ **System IDs** (virtual_mem_...) create false associations
- ❌ **YAML formatting** clutters content
- ❌ **System tags** (#virtual_, #score_) pollute tag space
- ❌ **Recursive degradation** - each ingestion cycle adds more noise

---

## Solution: Multi-Layer Filtering

### Layer 1: Content Sanitization (Regex-Based)

**Location:** `engine/src/services/ingest/atomizer-service.ts` → `sanitize()`

**Removed Patterns:**

```typescript
// Score markers
clean = clean.replace(/score:\s*\d+(?:\.\d+)?/g, '');

// Virtual molecule IDs
clean = clean.replace(/virtual_mem_[a-f0-9_]+/g, '');

// System memory IDs
clean = clean.replace(/\bid:\s*["']?mem_[a-f0-9_]+["']?\s*,?/g, '');

// Source/provenance markers
clean = clean.replace(/source:\s*["']?inbox\/[^"'\n]+["']?\s*,?/g, '');
clean = clean.replace(/provenance:\s*["']?(internal|external|quarantine)["']?\s*,?/g, '');

// System arrays
clean = clean.replace(/buckets:\s*\[[\s\w,"']*\]\s*,?/g, '');
clean = clean.replace(/epochs?:\s*['"]?[^,\n"']+['"]?\s*,?/g, '');

// Byte ranges
clean = clean.replace(/start_byte:\s*\d+\s*,?/g, '');
clean = clean.replace(/end_byte:\s*\d+\s*,?/g, '');

// YAML formatting
clean = clean.replace(/^\s*-\s*(id|source|score|content|tags):\s*/gm, '');
clean = clean.replace(/^\s*\|\s*$/gm, '');
clean = clean.replace(/```yaml\s*/g, '');
clean = clean.replace(/```\s*$/gm, '');

// Emoji markers
clean = clean.replace(/🔍\s*|🤖\s*|⚙️\s*|✅\s*|❌\s*/g, '');
```

**Performance:** ~2.7s for 92MB file (chunked processing)

---

### Layer 2: Tag Blacklist (Prevention)

**Location:** `engine/src/utils/tag-modulation.ts` → `STRICT_BLACKLIST`

**Blocked Tag Patterns:**

```typescript
const STRICT_BLACKLIST = [
  // System-generated tags (prevent self-contamination)
  /^#virtual_/,           // Virtual molecule markers
  /^#mem_[a-f0-9_]+/,    // System memory IDs
  /^#score_/,            // Score-based tags
  /^#inbox_/,            // Source path tags
  /^#provenance_/,       // Provenance tags
  /^#bucket_/,           // Bucket tags
  /^#epoch_/,            // Epoch tags
  /^#compound_/,         // Compound ID tags
  /^#molecule_/,         // Molecule ID tags
  /^#atom_/,             // Atom ID tags
  /^#simhash_/,          // Simhash tags
  /^#ts_rank/,           // Search ranking tags
  /^#fts_/,              // Full-text search tags
  /^#anchor_/,           // Anchor system tags
  /^#mcp_/,              // MCP protocol tags
];
```

**Impact:** Even if system output slips through sanitization, these tags are **never generated**.

---

### Layer 3: Deduplication (Safety Net)

**Location:** `engine/src/services/search/search.ts` → Range merging

**Mechanism:**
- Identical content → merged via byte range overlap
- Near-duplicate content → SimHash distance < 5
- System output that passes Layers 1-2 → deduplicated as redundant

---

## Implementation Details

### Ingestion Flow

```
Chat Log with Anchor Output
         ↓
[isTransientData] → Pass (not error logs)
         ↓
[sanitize] → Remove scores, IDs, YAML, emojis
         ↓
[applyTagModulation] → Filter system tags via STRICT_BLACKLIST
         ↓
[Database] → Clean content stored
         ↓
[Deduplication] → Duplicates handled
```

### What Gets Stored

**Database contains:**
```json
{
  "id": "atom_123",
  "content": "Discussion about Rob's job search with Dory...",
  "tags": ["#Rob", "#Dory", "#JobSearch"],
  "source": "inbox/Personal/chats-combined_context.yaml",
  "timestamp": 1234567890
}
```

**NOT stored:**
- ❌ `score: 500`
- ❌ `virtual_mem_abc123`
- ❌ YAML list formatting
- ❌ System tags like `#virtual_`, `#score_`

---

## Backup Behavior

**Backups contain CLEANED data only:**

```json
{
  "memory": [
    {
      "id": "atom_123",
      "content": "...",  // ← Already sanitized
      "tags": ["#Rob"]   // ← Already filtered
    }
  ]
}
```

**Rationale:**
- Backups export database content AS-IS
- Database already contains cleaned data
- No need for backup-time filtering
- Smaller, cleaner backups

---

## Trade-off Analysis

| Approach | Pros | Cons |
|----------|------|------|
| **Skip ingestion** | No contamination | Loses legitimate content |
| **Regex sanitization** | Keeps content, removes metadata | Requires pattern maintenance |
| **Tag blacklist** | Prevents tag pollution | Doesn't clean content |
| **Deduplication** | Catches remaining duplicates | Post-hoc, not preventive |

**Selected:** Regex sanitization + Tag blacklist + Deduplication (defense in depth)

---

## Performance Impact

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| **Sanitization time** | 2.62s | 2.72s | +0.1s |
| **Tag generation** | 18.48s | 18.50s | +0.02s |
| **Total ingestion** | 30.58s | 30.70s | +0.12s |
| **Contamination rate** | ~15% | ~0% | -15% |

**Verdict:** Negligible performance cost for massive contamination prevention.

---

## Testing

### Test Case 1: Chat Log with Search Results

**Input:**
```yaml
User: "Search for Rob's job applications"
Assistant: "🔍 Found 3 results:
- id: "mem_abc"
  score: 6.5
  content: "Rob applied to NextTier..."
  tags: ["#Rob", "#JobApplication"]"
```

**Expected:**
- ✅ Content ingested: "Rob applied to NextTier..."
- ✅ Tags: `#Rob`, `#JobApplication`
- ✅ Removed: `score: 6.5`, `- id:`, emoji, YAML formatting

### Test Case 2: MCP Agent Output

**Input:**
```yaml
🤖 MCP Agent Response:
- id: "virtual_mem_xyz"
  score: 500
  source: "inbox/test.yaml"
  content: "..."
```

**Expected:**
- ✅ Content ingested: "..."
- ✅ Removed: `virtual_mem_xyz`, `score: 500`, `source:`, emoji
- ✅ Tags: Filtered (no `#virtual_`, `#score_`)

---

## Related Standards

- **Standard 059** - Reliable Ingestion Pipeline
- **Standard 086** - Dual-Strategy Search (produces system output)
- **Standard 116** - Phoenix Protocol Backup/Restore

---

## Future Enhancements

- [ ] Configurable filtering strictness via `user_settings.json`
- [ ] Whitelist mode for trusted system output
- [ ] Audit log of filtered content
- [ ] Machine learning-based system output detection

---

## Implementation Files

- `engine/src/services/ingest/atomizer-service.ts` - Sanitization logic
- `engine/src/utils/tag-modulation.ts` - Tag blacklist
- `engine/src/services/search/search.ts` - Deduplication

---

**Repository:** https://github.com/RSBalchII/anchor-engine-node
**Status:** ✅ Production Ready (February 28, 2026)
