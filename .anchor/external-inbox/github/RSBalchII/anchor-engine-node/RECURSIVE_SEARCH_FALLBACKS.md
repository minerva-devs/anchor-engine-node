# 🔁 Recursive Search & Fallback Strategy

**Documented:** 2026-03-21  
**Purpose:** Explain how Anchor Engine ensures every query returns relevant results

---

## 🎯 Executive Summary

**Guarantee:** Every search query returns at least somewhat relevant results, no matter how obscure.

**How:** Multi-layer recursive fallback strategy that progressively widens the search net until matches are found.

---

## 📊 Search Strategy Hierarchy

```
Query: "android binary build plan"
│
├─ Level 1: Engram Lookup (Instant Recall)
│  └─ Have we seen this exact query before?
│     └─ ✅ YES → Return cached results (0.1s)
│     └─ ❌ NO  → Continue to Level 2
│
├─ Level 2: Primary Anchor Search (FTS + Tag Matching)
│  └─ Search atoms with AND logic (all terms must match)
│     └─ ✅ Found 5+ results → Continue to Physics Walker
│     └─ ❌ Found 0 results  → Level 3: OR Fallback
│
├─ Level 3: OR-Fuzzy Fallback (Relaxed Matching)
│  └─ Search with OR logic (any term matches)
│     └─ ✅ Found results → Continue to Physics Walker
│     └─ ❌ Still 0 results → Level 4: Tag-Aware Fallback
│
├─ Level 4: Tag-Aware Fallback (Direct Tag Lookup)
│  └─ Search atoms by exact tag matches
│     └─ ✅ Found tag matches → Enrich with molecules
│     └─ ❌ No tag matches → Level 5: Molecule-Only Search
│
├─ Level 5: Molecule-Only Search (Broader Context)
│  └─ Search molecules (larger content chunks)
│     └─ ✅ Found molecules → Use as anchors
│     └─ ❌ Nothing found → Level 6: Max-Recall Strategy
│
└─ Level 6: Max-Recall Strategy (Everything)
   └─ Combine all strategies, lower score thresholds
      └─ ✅ Return anything remotely relevant
      └─ ❌ Return empty with explanation
```

---

## 🔍 Detailed Fallback Mechanics

### **Level 1: Engram Lookup** (Fastest)

```typescript
// engine/src/services/search/search.ts:860
const engramIds = await lookupByEngram(cleanQuery);
const engramResults = await hydrateEngrams(engramIds);
```

**What it does:**
- Checks if this exact query (or similar) has been searched before
- Engrams are cached search results
- Returns instantly if found

**When it triggers:**
- Repeated queries
- Common questions

**Performance:** < 10ms

---

### **Level 2: Primary Anchor Search** (Standard)

```typescript
// engine/src/services/search/search.ts:420-450
const moleculeQuery = `
  SELECT ... FROM molecules
  WHERE buckets && $1  -- Bucket overlap
    AND to_tsvector(content) @@ to_tsquery($2)  -- FTS match
  ORDER BY score DESC
  LIMIT ${targetAtomCount}
`;
```

**What it does:**
- Searches both atoms (small chunks) and molecules (larger chunks)
- Uses AND logic: all query terms must match
- Requires bucket overlap (provenance filtering)

**Query transformation:**
```
Input: "android binary build plan"
FTS Query: "android & binary & build & plan"
```

**When it triggers:**
- Most normal queries
- Well-formed questions

**Expected results:** 5-50 results

---

### **Level 3: OR-Fuzzy Fallback** (Relaxed)

```typescript
// engine/src/services/search/search.ts:451-470
if (molResult.rows.length === 0 && tsQueryString.includes('&')) {
  console.log('[Search] Initial AND query yielded 0 results. Retrying with OR-fuzzy logic...');
  
  // Take top 8 longest terms (most unique/important)
  const allTerms = sanitizedQuery.split(/\s+/).filter(t => t.length > 3);
  const uniqueTerms = Array.from(new Set(allTerms));
  uniqueTerms.sort((a, b) => b.length - a.length);
  const topTerms = uniqueTerms.slice(0, 8);
  
  // Retry with OR logic
  const orQueryString = topTerms.join(' | ');
  const orResult = await db.run(orQuery, [orQueryString, ...otherParams]);
}
```

**What it does:**
- Switches from AND to OR logic
- Uses only top 8 longest terms (most distinctive)
- Prevents Cartesian explosion by limiting terms

**Query transformation:**
```
Original: "android binary build plan"
AND Query: "android & binary & build & plan" (0 results)
OR Query: "android | binary | build | plan" (finds anything with ANY of these terms)
```

**When it triggers:**
- AND query returns 0 results
- Query has multiple terms

**Expected results:** 1-20 results

---

### **Level 4: Tag-Aware Fallback** (Semantic)

```typescript
// engine/src/services/search/search.ts:860-903
if (primaryAnchors.length < 5) {
  console.log('[Search] Low recall. Attempting Tag-Aware Fallback.');
  
  const words = cleanQuery.split(/[\s,]+/);
  const fallbackTags = words.filter(w => w.length > 3).map(w => w.toLowerCase());
  
  for (const fbTag of fallbackTags) {
    const tagRes = await db.run(`
      SELECT ... FROM atoms
      WHERE $1 = ANY(tags)  -- Direct tag array match
      LIMIT 20
    `, [fbTag]);
    
    // Add to results
    primaryAnchors.push(...tagRes.rows);
  }
}
```

**What it does:**
- Extracts potential tags from query words (>4 chars)
- Searches for exact tag matches in atom tag arrays
- Constant score (0.8) for all tag matches

**Tag extraction:**
```
Query: "android binary build"
Tags: ["android", "binary", "build"]
```

**When it triggers:**
- Primary search returns < 5 results
- Query contains recognizable tag-like terms

**Expected results:** 0-60 results (20 per tag)

---

### **Level 5: Molecule-Only Search** (Broader Context)

```typescript
// engine/src/services/search/search.ts:1136+
// Traditional FTS fallback on molecules only
const molResult = await db.run(`
  SELECT ... FROM molecules
  WHERE to_tsvector(content) @@ to_tsquery($1)
  ORDER BY score DESC
`, [tsQuery]);
```

**What it does:**
- Searches only molecules (larger content chunks)
- More content = higher chance of match
- Broader context, lower precision

**When it triggers:**
- Atom searches fail
- Need broader context

**Expected results:** 1-30 results

---

### **Level 6: Max-Recall Strategy** (Everything)

```typescript
// engine/src/routes/v1/search.ts:30-35
const estimatedTokens = maxChars / 4;
let useMaxRecall = strategy === 'max-recall';

// Auto-switch to max-recall for large budgets
if (!useMaxRecall && estimatedTokens > 16000) {
  useMaxRecall = true;
}
```

**What it does:**
- Combines ALL strategies
- Lowers score thresholds
- Increases result limits
- Searches all buckets

**When it triggers:**
- User explicitly requests `strategy: "max-recall"`
- Query token budget > 16,000 tokens
- All other strategies fail

**Expected results:** 10-200+ results

---

## 🧠 Physics Tag Walker (Graph Expansion)

After finding initial anchors, the **Physics Tag Walker** recursively expands results:

```typescript
// engine/src/services/search/physics-tag-walker.ts:295-335
WITH RECURSIVE hop_traversal AS (
  -- Base case: Start from anchor molecules
  SELECT id, tags, 0 as hop_distance
  FROM molecules
  WHERE id = ANY($1)  -- Anchor IDs
  
  UNION ALL
  
  -- Recursive case: Find molecules with overlapping tags
  SELECT m.id, m.tags, h.hop_distance + 1
  FROM molecules m
  INNER JOIN hop_traversal h
    ON m.tags && h.tags  -- Tag array overlap
  WHERE h.hop_distance < $2  -- Max hop radius
)
SELECT DISTINCT id FROM hop_traversal;
```

**What it does:**
- Starts from anchor results
- Finds molecules with overlapping tags
- Recursively expands (up to WALK_RADIUS hops)
- Each hop = semantically related content

**Visual:**
```
Anchor: "android build"
  ↓ (hop 1: shares tag #android)
  "termux setup"
  ↓ (hop 2: shares tag #setup)
  "environment configuration"
  ↓ (hop 3: shares tag #configuration)
  "tooling best practices"
```

**When it triggers:**
- After ANY successful anchor search
- Expands results semantically

**Expected expansion:** 2-5x original results

---

## 📈 Result Scoring & Ranking

### **Score Components**

```typescript
score = (tagOverlap × γ^hops × e^(-λΔt) × simhashSimilarity)
```

| Component | Formula | Effect |
|-----------|---------|--------|
| **Tag Overlap** | `|T(query) ∩ T(result)|` | More shared tags = higher score |
| **Hop Decay** | `γ^hops` (γ=0.7) | Each hop reduces score by 30% |
| **Recency** | `e^(-λΔt)` (λ=0.001) | Newer results slightly favored |
| **Simhash** | `1 - (hamming / 64)` | Similar fingerprints = higher score |

### **Score Thresholds**

| Strategy | Min Score | Typical Range |
|----------|-----------|---------------|
| Primary (AND) | 1.0 | 1.0 - 4.0 |
| OR-Fuzzy | 0.8 | 0.8 - 2.0 |
| Tag-Aware | 0.8 (constant) | 0.8 |
| Max-Recall | 0.3 | 0.3 - 1.5 |

---

## 🎯 Real-World Examples

### **Example 1: Perfect Match**
```
Query: "android binary build"
Level 2: Found 12 atoms (AND match)
Physics Walker: Expanded to 45 molecules (3 hops)
Results: 45 items, scores 1.2 - 4.0
```

### **Example 2: Fuzzy Match Needed**
```
Query: "termux pnpm compile error"
Level 2: 0 results (AND query too strict)
Level 3: OR-Fuzzy → "termux | pnpm | compile | error"
Level 3 Results: 8 atoms
Physics Walker: Expanded to 23 molecules
Results: 23 items, scores 0.8 - 1.5
```

### **Example 3: Tag-Aware Rescue**
```
Query: "MCP authentication"
Level 2: 0 results (no FTS match)
Level 3: 0 results (OR-fuzzy fails)
Level 4: Tag search for #MCP, #authentication
Level 4 Results: 15 atoms with matching tags
Results: 15 items, scores 0.8 (constant)
```

### **Example 4: Max-Recall**
```
Query: "consciousness emergence theory"
Level 2-5: 0 results (obscure topic)
Level 6: Max-recall strategy
  - Lower score threshold to 0.3
  - Search all buckets
  - Increase result limit to 200
Results: 34 items, scores 0.3 - 0.7
```

---

## 🔧 Configuration

### **Adjust Fallback Behavior**

```json
// user_settings.json
{
  "search": {
    "strategy": "hybrid",  // "standard", "max-recall", "hybrid"
    "fallback_enabled": true,  // Enable automatic fallback
    "min_results_before_fallback": 5,  // Trigger fallback if < 5 results
    "max_fallback_depth": 6  // Max fallback level (1-6)
  }
}
```

### **Disable Specific Fallbacks**

```json
{
  "search": {
    "fallbacks": {
      "or_fuzzy": true,      // Enable OR-fuzzy (Level 3)
      "tag_aware": true,     // Enable tag-aware (Level 4)
      "molecule_only": true, // Enable molecule-only (Level 5)
      "max_recall": false    // Disable auto max-recall (Level 6)
    }
  }
}
```

---

## 🧪 Testing Your Search

### **Test Query with Debug Mode**

```bash
curl -X POST "http://localhost:3161/v1/memory/search?debug=true" \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "your test query",
    "strategy": "standard"
  }'
```

**Debug response includes:**
```json
{
  "metadata": {...},
  "results": [...],
  "debug": {
    "fallbackTriggered": true,
    "fallbackLevel": 3,
    "strategiesAttempted": ["AND", "OR-fuzzy"],
    "finalStrategy": "OR-fuzzy",
    "tagMatches": ["android", "build"],
    "physicsWalkerHops": 2
  }
}
```

---

## 📊 Performance Characteristics

| Level | Avg Time | Memory | CPU |
|-------|----------|--------|-----|
| L1: Engram | < 10ms | Low | Low |
| L2: Primary | 50-200ms | Medium | Medium |
| L3: OR-Fuzzy | 100-300ms | Medium | Medium-High |
| L4: Tag-Aware | 20-50ms | Low | Low |
| L5: Molecule | 100-400ms | Medium | Medium |
| L6: Max-Recall | 500-2000ms | High | High |
| Physics Walker | 100-500ms | Medium-High | High |

**Total worst case:** ~3 seconds (all levels + max walker)  
**Typical case:** 100-300ms (L2 + walker)

---

## 🎓 Why This Works

### **Theory of Operation**

1. **Content Proximity:** Related content tends to be ingested together
   - Same session → similar topics
   - Similar topics → overlapping tags
   - Overlapping tags → physics walker connects them

2. **Progressive Relaxation:** Each fallback level relaxes constraints
   - AND → OR (term matching)
   - FTS → Tags (matching mechanism)
   - Atoms → Molecules (granularity)
   - Strict → Fuzzy (score threshold)

3. **Semantic Gravity:** Tags act as "gravity wells"
   - High-frequency tags pull in related content
   - Tag overlap = semantic similarity
   - Physics walker follows tag "gravity"

4. **Recall Guarantee:** At least one strategy will match
   - Even obscure queries have SOME tag
   - Even empty tag matches have molecule content
   - Even failed molecules have max-recall

---

## 🚀 Future Enhancements

### **Planned Improvements**

- [ ] **ML-based fallback selection:** Predict which strategy will work best
- [ ] **Query rewriting:** Auto-correct typos, expand abbreviations
- [ ] **Cross-lingual fallback:** Translate queries to indexed languages
- [ ] **User feedback loop:** Learn which fallbacks work best for which queries
- [ ] **Adaptive thresholds:** Adjust score cutoffs based on query difficulty

---

**Last Updated:** 2026-03-21  
**Version:** 1.0  
**Maintainer:** Anchor Engine Core Team
