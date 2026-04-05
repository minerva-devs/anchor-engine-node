# Standard 123: Search Result Tag Sanitization

**Version:** 1.1.0
**Date:** March 3, 2026
**Status:** Active
**Supersedes:** None

---

## Summary

Standard 123 defines the **Search Result Tag Sanitization** protocol with two complementary functions:

1. **stripInlineTags()** — Removes inline hashtag tokens (`#Word`, `##19864Residential`) from content
2. **stripTagFooters()** — Removes trailing structural metadata footers from truncated snippets (e.g., YAML serialization artifacts)

Both operate at different points in the pipeline to ensure clean, readable content delivery to LLM consumers and the UI. Tags are valuable for graph traversal and ranking — they should not appear verbatim inside the text window where they add noise and confuse language models.

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

Strip inline tag tokens and structural metadata footers from content at the appropriate pipeline stages:
1. **stripInlineTags()** — Applied during `toMemoryNode()` conversion (graph-context-serializer.ts)
2. **stripTagFooters()** — Applied during snippet inflation from disk (search-utils.ts)

### Implementation: stripInlineTags()

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

### Regex Patterns: stripInlineTags()

| Pattern | Matches | Example |
|---------|---------|---------|
| `/\\?"#[^"\\]+\\?"/g` | Escaped/quoted tags | `\"#TypeScript\"`, `"#anchor"` |
| `/##?[A-Za-z0-9_]+/g` | Plain/double-hash tags | `#algorithm`, `##19864Residential` |
| `/(\s*-\s*)+/g` | Orphaned separators | ` - ` chains left after stripping |

### Implementation: stripTagFooters()

**File:** `engine/src/services/search/search-utils.ts`

**Location:** `stripTagFooters()` function, called in `inflateSnippetFromDisk()` after `snapToSentenceBoundaries()`.

**Problem Addressed:** When search results are truncated due to `MAX_SNIPPET_BYTES` (100KB), YAML structural metadata footers remain. These appear at the end of truncated session records:

```
...previous content...
##19864Residential
##1Okay
##3am
##ABQLo
```

These are serialization artifacts from YAML tag/category systems, not content.

**Solution:** Remove trailing lines matching the pattern `/^(##[A-Za-z0-9_]*\s*)+$/`

```typescript
function stripTagFooters(content: string): string {
  if (!content) return content;
  // Remove trailing lines matching YAML tag footer pattern: ##Token ##Token ##Token
  const lines = content.split('\n');
  while (lines.length > 0) {
    const lastLine = lines[lines.length - 1].trim();
    if (/^(##[A-Za-z0-9_]*\s*)*$/.test(lastLine) && lastLine.length > 0) {
      lines.pop();
    } else {
      break;
    }
  }
  return lines.join('\n');
}
```

**Why after snapToSentenceBoundaries():** This order preserves sentence coherence while still cleaning structural noise before final delivery.

---

## What Is and Is NOT Stripped

### Stripped by stripInlineTags() ✅
```
"#TypeScript" - "#algorithm" - "#anchor"   →  (removed)
#Rob                                        →  (removed)
Normal text with #tag embedded              →  Normal text with  embedded
```

### Stripped by stripTagFooters() ✅
```
...content...
##19864Residential
##1Okay
##3am                                       →  (footer lines removed)
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
[inflateSnippetFromDisk()]
         ↓
[snapToSentenceBoundaries()]
         ↓
[stripTagFooters()] — removes trailing ##Token lines
         ↓
[toMemoryNode()] — graph-context-serializer.ts
         ↓
[stripInlineTags()] — removes inline #Tag tokens from content
         ↓
MemoryNode.content = clean text
         ↓
[serializeForLLM()] / UI response
```

### Functional Separation

| Function | Location | Operates On | Removes |
|----------|----------|-------------|---------|
| **stripTagFooters()** | search-utils.ts (inflation pipeline) | Raw snippet content | Trailing ##Token lines (structural metadata) |
| **stripInlineTags()** | graph-context-serializer.ts (serialization) | Content field of SearchResult | Inline #Tag and ##Tag tokens scattered through text |

This two-layer approach handles both artifact sources:
- **stripTagFooters()** cleans structural noise from truncated YAML records
- **stripInlineTags()** cleans semantic noise from ingested tag lists

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

- `engine/src/services/search/search-utils.ts` — `stripTagFooters()` function + integration in `inflateSnippetFromDisk()`
- `engine/src/services/search/graph-context-serializer.ts` — `stripInlineTags()` + `toMemoryNode()` call

---

**Author:** R.S. Balch II
**Implemented:** March 3, 2026
**Status:** Active
