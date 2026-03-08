# Standard 128: Illuminate — BFS Graph Traversal

**Status:** ✅ Active | **Version:** 1.0 | **Date:** 2026-03-08  
**Introduced:** v4.5.1

---

## 1. Purpose

Define the **Illuminate** traversal mode: a breadth-first search (BFS) of the STAR co-occurrence graph from one or more seed concepts. Returns the full connected subgraph reachable within a depth limit — the "spine" of meaning for a topic across the entire ingested corpus.

This is distinct from search: search finds the *best-matching* atoms. Illuminate finds *everything connected* to a concept, enabling structural corpus compression.

---

## 2. Core Concept: Structural Corpus Compression

When a large corpus (e.g., 1GB+ of chat history) is ingested:

1. **Atomization** — content is split into molecules with tags.
2. **SimHash deduplication** — near-identical ideas across sessions collapse into high-weight edges.
3. **Co-occurrence graph** — shared tags create `edges` table entries (source_id, target_id, weight).

The resulting graph is structurally compressed: 500M tokens of input become ~250K atoms where the most recurring concepts have the highest edge weights.

**Illuminate extracts the spine:** BFS traversal from a seed query returns the molecules that survived deduplication and have the most connections — i.e., the ideas that appeared most consistently across all sessions.

**Properties:**
- **Lossless structural**: original atoms are still in the DB; only redundancy is removed
- **Deterministic**: same query returns the same subgraph
- **Explainable**: every node and edge is a real molecule from the corpus, not generated text

---

## 3. API Contract

### Endpoint

`POST /v1/memory/explore`

### Request

```json
{
  "seed": {
    "query": "physics walker STAR algorithm",
    "atom_ids": ["atom_abc123"],
    "limit_seeds": 5
  },
  "max_depth": 2,
  "min_weight": 0.1,
  "max_nodes": 50,
  "format": "flat"
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `seed.query` | string | — | FTS query to find seed atoms |
| `seed.atom_ids` | string[] | [] | Explicit seed IDs (takes precedence) |
| `seed.limit_seeds` | number | 5 | Max seeds from query |
| `max_depth` | number | 2 | BFS hops (max 4) |
| `min_weight` | number | 0.1 | Min edge weight to follow |
| `max_nodes` | number | 50 | Result cap (max 200) |
| `format` | `flat\|graph` | `flat` | flat = atom list; graph = nodes + edges |

At least one of `seed.query` or `seed.atom_ids` is required.

### Response (flat)

```json
{
  "results": [
    { "id": "atom_...", "content": "...", "source": "file.md", "tags": ["#STAR"], "score": 1 }
  ],
  "nodes": [...],
  "stats": {
    "nodes_count": 30,
    "seed_nodes": 5,
    "max_depth_achieved": 2,
    "strategy": "edge-bfs"
  },
  "duration_ms": 19
}
```

### Response (graph)

```json
{
  "nodes": [...],
  "edges": [
    { "source": "atom_abc", "target": "atom_xyz", "weight": 0.85 }
  ],
  "stats": { "nodes_count": 30, "edges_count": 40, "seed_nodes": 5, ... }
}
```

---

## 4. Implementation

### Files

| File | Role |
|---|---|
| `engine/src/services/search/explore.ts` | BFS service — seed resolution, traversal, node fetch |
| `engine/src/routes/v1/memory.ts` | Route handler for `POST /v1/memory/explore` |
| `engine/src/routes/api.ts` | Registers `setupMemoryRoutes()` |

### Traversal Strategy

**Primary: edge-BFS** — used when `edges` table has data:

```sql
SELECT source_id, target_id, weight FROM edges
WHERE (source_id IN ($frontier) OR target_id IN ($frontier))
  AND weight >= $min_weight
```

Applied iteratively per depth level. Visited set prevents cycles.

**Fallback: tag-BFS** — used when edges table is empty (fresh DB):

```sql
SELECT DISTINCT t2.atom_id
FROM tags t1
JOIN tags t2 ON t1.tag = t2.tag AND t1.atom_id != t2.atom_id
WHERE t1.atom_id IN ($frontier)
```

### Seed Resolution

```
FTS: SELECT id FROM atoms
     WHERE to_tsvector('simple', content) @@ to_tsquery('simple', $terms)
     LIMIT $limit_seeds
```

Falls back to `ILIKE` if FTS returns nothing.

---

## 5. UI Integration: Search Prefix System

The UI search box supports prefixes that route to different algorithms:

| Prefix | Algorithm | Endpoint |
|---|---|---|
| `illuminate:` | BFS graph traversal | `/v1/memory/explore` |
| `explore:` | BFS graph traversal (alias) | `/v1/memory/explore` |
| `deep:` | Max-recall multi-hop search | `/v1/memory/search` + `deep: true` |
| `exact:` | FTS only, no physics walker | `/v1/memory/search` |
| *(none)* | Auto STAR search | `/v1/memory/search` |

Prefix parsing is client-side in `engine/public/index.html` — the `parseQuery()` function strips the prefix before forwarding the cleaned query.

A `?` tooltip next to the search input lists available prefixes.

---

## 6. MCP Integration

The `anchor-mcp` server exposes `anchor_explore` tool:

```json
{
  "name": "anchor_explore",
  "description": "BFS illuminate: returns connected subgraph from seed concepts",
  "inputSchema": {
    "query": "seed query string",
    "max_depth": 2,
    "min_weight": 0.1,
    "max_nodes": 50,
    "format": "flat | graph"
  }
}
```

The tool auto-falls back to deep search if the engine returns 404 (e.g., older engine version).

---

## 7. Performance

| Corpus size | Seeds | Depth | Nodes returned | Duration |
|---|---|---|---|---|
| 37K molecules (code only) | 5 | 2 | 20 | ~19ms |
| 235K molecules (code + 438 chat files) | 5 | 3 | 50 | ~50ms (estimated) |

Performance scales with edge density, not corpus size. `max_nodes` cap prevents explosion.

---

## 8. Related Standards

- **Standard 065:** Graph Associative Retrieval (Tag-Walker) — also graph-based, but scoring-focused
- **Standard 086:** Dual-Strategy Search — search routing this standard extends
- **Standard 104:** Universal Semantic Search — the default (no-prefix) algorithm
- **Standard 115:** GitHub Repository Ingestion — primary corpus source

---

**Introduced:** v4.5.1  
**Owner:** Anchor Engine Team
