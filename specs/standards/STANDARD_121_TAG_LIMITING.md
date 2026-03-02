# Standard 121: Tag Limiting for Output Quality

**Version:** 1.0.0  
**Date:** March 1, 2026  
**Status:** Active  
**Supersedes:** None

---

## Summary

Standard 121 defines the **Tag Limiting Protocol** for preventing output bloat in copied YAML context. This standard ensures that molecule output remains concise and readable by limiting the number of tags per molecule to the most relevant ones.

---

## Problem Statement

Prior to this standard, molecules with extensive tag lists (400+ tags) created several issues:

1. **Output Bloat:** A single search could generate thousands of lines of tags
2. **Token Waste:** Valuable context budget consumed by low-relevance tags
3. **Readability:** Human users overwhelmed by tag lists
4. **Signal-to-Noise:** Important tags buried in generic terms

---

## Solution

Limit tags to **top 10 most relevant** per molecule at multiple pipeline stages:

### Stage 1: LLM Context Formatting
**File:** `engine/src/services/search/llm-context-formatter.ts`

```typescript
tags: (atom.tags || []).slice(0, 10), // Limit to top 10 most relevant tags per molecule
```

**Location:** `rankAndFormatAtoms()` method, line 317

### Stage 2: Search Result Coalescing
**File:** `engine/src/services/search/search-utils.ts`

```typescript
// Initial snippet creation
tags: (atom.tags || []).slice(0, 10) // Limit to top 10 tags initially

// During merge (allow slightly more for diversity)
const mergedTags = Array.from(new Set([...current.tags, ...(atom.tags || [])]));
current.tags = mergedTags.slice(0, 15); // Allow up to 15 during merge

// New snippets after merge
tags: (atom.tags || []).slice(0, 10) // Limit to top 10 tags for new snippets
```

**Locations:** Lines 163, 174-176, 180

### Stage 3: Direct Result Conversion
**File:** `engine/src/services/search/search-utils.ts`

```typescript
tags: (r.tags || []).slice(0, 10) // Limit to top 10 most relevant tags per molecule
```

**Location:** Line 347

---

## Implementation Details

### Why 10 Tags?

The limit of 10 tags was chosen based on:

1. **Empirical Testing:** Most molecules have 5-15 meaningful tags
2. **Token Budget:** 10 tags × 10 chars average = 100 chars per molecule
3. **Readability:** Humans can track ~7±2 concepts simultaneously
4. **Relevance Sorting:** Tags are already sorted by relevance from tagger

### Tag Relevance Ordering

Tags arrive pre-sorted by relevance from the tagging pipeline:
1. Named entities (people, places, orgs) - highest relevance
2. Key concepts from content
3. Generic terms (filtered by blacklist)

The `slice(0, 10)` operation preserves this ordering, keeping the most relevant tags.

### Merge Handling

During coalescing, when multiple atoms merge into one snippet:
- Tags are merged with `Set` deduplication
- Temporary limit of 15 tags allows diversity during merge
- Final output still respects 10-tag limit

---

## Expected Impact

### Before Standard 121
```yaml
- id: mem_abc123
  content: "Discussion about AI architecture..."
  tags:
    - #AIArchitect
    - #AnchorEngine
    - #Rob
    - ... (400+ more tags)
    - #color_#FF5733
    - #font_size_12px
    - #div_class_container
```

**Output size:** ~2000-4000 lines per search  
**Tag lines per molecule:** 400+  
**Signal-to-noise ratio:** Low

### After Standard 121
```yaml
- id: mem_abc123
  content: "Discussion about AI architecture..."
  tags:
    - #AIArchitect
    - #AnchorEngine
    - #Rob
    - #STAR
    - #KnowledgeGraph
    - #LLM
    - #ContextRetrieval
    - #TechnicalDiscussion
    - #Architecture
    - #Design
```

**Output size:** ~100-300 lines per search (90%+ reduction)  
**Tag lines per molecule:** Max 10  
**Signal-to-noise ratio:** High

---

## Configuration

This standard is **not configurable** - the 10-tag limit is hardcoded to ensure consistent output quality across all searches.

Rationale:
- User-adjustable limits would lead to confusion
- 10 tags provides optimal balance for most use cases
- Blacklist strictness (configurable) handles tag quality at ingestion time

---

## Testing

### Unit Tests
**File:** `engine/tests/unit/test_physics_walker.ts` (pending)

Tests should verify:
1. Molecules never exceed 10 tags in output
2. Most relevant tags are preserved (entities first)
3. Coalesced snippets respect limits
4. No performance degradation from slicing

### Manual Testing
```bash
# 1. Run search with broad query
curl -X POST http://localhost:3160/v1/memory/search \
  -H "Content-Type: application/json" \
  -d '{"query": "AI", "token_budget": 4096}'

# 2. Verify output
# - Each molecule has ≤10 tags
# - Tags are relevant (entities, concepts)
# - No HTML artifacts, color codes, or generic terms
```

---

## Related Standards

| Standard | Relationship |
|----------|--------------|
| **078** | [Parameter Tuning](standards/078-parameter-tuning.md) - Tag modulation settings |
| **104** | [Universal Semantic Search](standards/104-universal-semantic-search.md) - Search architecture |
| **120** | [System Output Filtering](STANDARD_120_SYSTEM_OUTPUT_FILTERING.md) - Output quality control |

---

## Migration Notes

### For Existing Deployments

No migration required. This standard affects only new search output.

### For Custom Integrations

If you've built integrations that parse tag lists:
- **Breaking Change:** Tag lists now max at 10 items (was unlimited)
- **Action:** Update parsers to handle variable-length arrays (0-10 tags)
- **Benefit:** Smaller payloads, faster parsing, less noise

---

## Future Considerations

### Potential Enhancements

1. **Dynamic Limiting:** Adjust limit based on token budget
   - Low budget (<2k): 5 tags
   - Medium budget (2k-8k): 10 tags
   - High budget (>8k): 15 tags

2. **Tag Categories:** Preserve diversity by category
   - 3 entity tags (#Rob, #Dory, #AnchorEngine)
   - 3 concept tags (#AI, #Architecture, #Search)
   - 2 temporal tags (#2026, #Recent)
   - 2 structural tags (#Technical, #Discussion)

3. **User Override:** Allow power users to request "all tags" mode
   - Query parameter: `?include_all_tags=true`
   - Default remains 10 tags

---

## Approval

**Author:** R.S. Balch II  
**Approved:** March 1, 2026  
**Implementation:** Complete  
**Tests:** Pending

---

**License:** AGPL-3.0  
**Part of:** Anchor Engine Architecture Standards v4.3.2
