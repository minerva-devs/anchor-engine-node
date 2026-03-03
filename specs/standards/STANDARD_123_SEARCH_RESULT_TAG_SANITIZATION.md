# Standard 123: Search Result Tag Sanitization

**Version:** 1.0.0
**Date:** March 3, 2026
**Status:** Active
**Supersedes:** None

---

## Summary

Standard 123 defines the **Search Result Tag Sanitization** protocol for stripping inline hashtag tokens from molecule/atom content before that content is delivered to LLM consumers or the UI. Tags are valuable for graph traversal and ranking — they should not appear verbatim inside the text window where they add noise and confuse language models.

---

## Problem Statement

Source files (YAML, JSON chat logs) often serialize tag lists as part of molecule content during ingestion:

```yaml
# Example raw content as stored in molecules table:
"#TypeScript\" - \"#algorithm\" - \"#anchor\" - \"#api\" - \"#architecture\""

##19864Residential
##19864ResidentialSomething
##1Okay
```

This causes several problems in search results:

1. **LLM Confusion:** Escaped-quote patterns and `#Tag` tokens read as code/metadata, not natural language
2. **Token Waste:** Long tag lists consume context budget with zero semantic value
3. **Noise in Snippets:** Users see cryptic hashtag lists instead of readable content
4. **Double-Counting:** Tags are already stored in the `tags` column and used for graph traversal; repeating them in `content` adds no signal

This is **distinct** from Standard 120 (ingestion-time contamination filtering). Standard 120 prevents Anchor system metadata from being re-ingested. Standard 123 handles source-data noise that made it into `content` during legitimate ingestion.

---

## Solution

Strip inline tag tokens from `content` at the point where `SearchResult` objects are converted to `MemoryNode` objects — after retrieval, before delivery.

### Implementation

**File:** `engine/src/services/search/graph-context-serializer.ts`

**Location:** `stripInlineTags()` function (before `toMemoryNode()`), called in `toMemoryNode()`.

```typescript
function stripInlineTags(content: string): string {
  if (!content) return content;
  // Remove escaped-quote wrapped tags: \"#Word\" or "#Word"
  let s = content.replace(/\\?"#[^"\\]+\\?"/g, '');
  // Remove plain hashtags (one or two #) followed by word chars
  s = s.replace(/##?[A-Za-z0-9_]+/g, '');
  // Clean up orphaned separator sequences and excess whitespace
  s = s.replace(/(\s*-\s*)+/g, ' ').trim();
  return s;
}

function toMemoryNode(result: SearchResult, physics: PhysicsMetadata): MemoryNode {
  return {
    id: result.id,
    content: stripInlineTags(result.content || ''),
    // ...
  };
}
```

### Regex Patterns

| Pattern | Matches | Example |
|---------|---------|---------|
| `/\\?"#[^"\\]+\\?"/g` | Escaped/quoted tags | `\"#TypeScript\"`, `"#anchor"` |
| `/##?[A-Za-z0-9_]+/g` | Plain/double-hash tags | `#algorithm`, `##19864Residential` |
| `/(\s*-\s*)+/g` | Orphaned separators | ` - ` chains left after stripping |

---

## What Is and Is NOT Stripped

### Stripped ✅
```
"#TypeScript" - "#algorithm" - "#anchor"   →  (removed)
#Rob                                        →  (removed)
##19864Residential                          →  (removed)
```

### NOT Stripped ✅
```
"This is about TypeScript"                 →  unchanged (no # prefix)
Rob's project uses the anchor engine       →  unchanged (no hashtag syntax)
score: 500                                 →  handled by Standard 120
virtual_mem_abc123                         →  handled by Standard 120
```

### Tags Are Preserved

Tag data is **not lost** — the `result.tags` field is passed through unchanged. Tags continue to power graph traversal, synonym rings, and tag-based ranking. Only the inline text representation is removed from content.

---

## Pipeline Position

```
SearchResult (from DB / ContextInflator)
         ↓
[toMemoryNode()] — graph-context-serializer.ts
         ↓
[stripInlineTags()] — removes #Tag tokens from content
         ↓
MemoryNode.content = clean text
         ↓
[serializeForLLM()] / UI response
```

This position is deliberate:
- **Late binding:** Tags in content don't affect scoring or retrieval — they're already used upstream
- **Single choke point:** All results (anchors, walker results) pass through `toMemoryNode()`
- **Non-destructive:** DB content unchanged; stripping is view-only

---

## Relationship to Other Standards

| Standard | Relationship |
|----------|--------------|
| **Standard 120** | Ingestion-time filtering (complementary, different concern) |
| **Standard 121** | Tag limiting in LLM output (operates on `tags` field, not `content`) |
| **Standard 059** | Reliable ingestion pipeline (upstream source of embedded tags) |

---

## Future: Ingestion-Time Alternative

A more thorough fix would strip tags **at ingestion time** in the Atomizer before writing to the DB. This would:
- Reduce DB storage size
- Eliminate the need for runtime stripping
- Require a DB migration for existing data

This is deferred until a planned schema migration. Runtime stripping (this standard) is the interim solution.

---

## Testing

```typescript
test('stripInlineTags removes quoted tag lists', () => {
  const input = '"#TypeScript" - "#algorithm" - "#anchor"';
  expect(stripInlineTags(input)).toBe('');
});

test('stripInlineTags removes plain hashtags', () => {
  const input = 'Rob works on #anchor and #TypeScript projects';
  expect(stripInlineTags(input)).toBe('Rob works on and projects');
});

test('stripInlineTags preserves non-tag content', () => {
  const input = 'Discussed the job search pipeline with Rob';
  expect(stripInlineTags(input)).toBe('Discussed the job search pipeline with Rob');
});

test('stripInlineTags handles double-hash garbage tokens', () => {
  const input = '##19864Residential ##1Okay normal text';
  expect(stripInlineTags(input)).toBe('normal text');
});
```

---

## Implementation Files

- `engine/src/services/search/graph-context-serializer.ts` — `stripInlineTags()` + `toMemoryNode()` call

---

**Author:** R.S. Balch II
**Implemented:** March 3, 2026
**Status:** Active
