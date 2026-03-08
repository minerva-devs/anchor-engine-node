# Domain Standard: Search Protocol

**Status:** LIVING | **Domain:** Search & Retrieval
**Maintained By:** Anchor Engine Team
**Last Updated:** 2026-03-08 (Standard 128)

## 1. Overview
The **Universal Semantic Search** protocol unifies all retrieval operations under a single, permissive, and context-aware strategy. It prioritizes recall and relevance over exact keyword matching, using a "Semantic First" approach.

## 2. Universal Semantic Search (Standard 104)

### Core Philosophy
*   **Permissive Logic**: Defaults to Logical OR to handle typos and fuzzy recall.
*   **Intersection Boosting**: Bubbles up "AND" matches (all terms present) via scoring boosts rather than strict filtering.
*   **Context-Aware**: Inflates results with surrounding content ("Molecules") rather than just returning isolated keywords ("Atoms").

### Architecture
All user queries to `/v1/memory/search` route through `services/semantic/semantic-search.ts`.

#### The 70/30 Budget Split
To balance depth and breadth within a fixed token budget:
*   **70% Primary Budget (Deep Context)**:
    *   **Target**: Direct keyword matches.
    *   **Radius**: Adaptive (scales with budget, typically >500 bytes).
    *   **Goal**: Read full paragraphs/logs for exact matches.
*   **30% Associative Budget (Broad Context)**:
    *   **Target**: Related terms (synonyms, semantic neighbors).
    *   **Radius**: Fixed Small (150 bytes).
    *   **Goal**: Provide 3-5 distinct "breadth" snippets.

#### Smart Content Weighting
*   **Narrative Mode**: Penalizes `#Code`, `#Log`, `#JSON` (Score * 0.1) unless specifically requested.
*   **Protection**: Preserves content with `#Narrative`, `#Chat`, or conversational markers (`User:`, `Assistant:`).

## 3. Context Inflation (Standard 085)
Instead of storing massive text blobs in the DB, we store **Atomic Coordinates** (File Path + Byte Offset) and inflate content on demand.

*   **Lazy Molecule**: Content is read from disk only during query execution.
*   **Radial Inflation**: Expands from the match "Atom" outwards by `N` bytes.
*   **Empty Filtering**: Windows containing only whitespace or `...` are discarded.

## 4. Graph Associative Retrieval (Standard 065)
Search acts as an entry point to the Knowledge Graph:
1.  **Input**: Natural Language Query.
2.  **Atom Retrieval**: FTS finds initial Entry Nodes.
3.  **Graph Walk**: System traverses `simhash` and `tag` edges to find related content (The "30%" Budget).

## 5. Illuminate — BFS Graph Traversal (Standard 128)

**Illuminate** is a separate mode that returns the full connected subgraph from seed concepts rather than ranked results. It is exposed via `POST /v1/memory/explore`.

### When to use

| Mode | Question answered |
|---|---|
| Search (`/v1/memory/search`) | "What's the most relevant content for this query?" |
| Illuminate (`/v1/memory/explore`) | "What is everything connected to this concept?" |

Illuminate is suited for structural corpus exploration, topic mapping, and compressing large ingested corpora into navigable spines.

### Search Prefix System (UI)

The search input accepts prefixes to override the default routing:

| Prefix | Mode | Endpoint |
|---|---|---|
| *(none)* | Auto STAR search | `/v1/memory/search` |
| `illuminate:` | BFS graph traversal | `/v1/memory/explore` |
| `explore:` | BFS graph traversal (alias) | `/v1/memory/explore` |
| `deep:` | Max-recall multi-hop | `/v1/memory/search` with `deep: true` |
| `exact:` / `fast:` | FTS only | `/v1/memory/search` with strict FTS |

Prefix parsing is client-side in `engine/public/index.html` (`parseQuery()`). The prefix is stripped before the cleaned query is forwarded to the endpoint.

See [Standard 128](128-illuminate-bfs-traversal.md) for full BFS specification.

## HISTORY & DEPRECATIONS
*   **Standard 104 (2026-02-10)**: Introduced Universal Semantic Search, 70/30 Split, and Smart Weighting. Deprecated "Smart Search" (094) and "Tag Walker" (086).
*   **Standard 094**: "Smart Search" (Deprecated). Attempted a "Strict Phase" which proved too brittle.
*   **Standard 086**: "Tag Walker" (Deprecated). Early attempt at calibration.
