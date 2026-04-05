# Domain Standard: Search Protocol

**Status:** LIVING | **Domain:** Search & Retrieval
**Maintained By:** Anchor Engine Team
**Last Updated:** 2026-03-08 (Standard 128 v2.0 — Explore/Illuminate semantic split)

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

## 5. Explore & Illuminate — Corpus Traversal Modes (Standard 128)

**Explore** and **Illuminate** are two complementary modes on `POST /v1/memory/explore` that together give an LLM (or user) full situational awareness of the corpus.

### Semantic Split

| Mode | UI Prefix | Seed | Returns | Primary Use |
|---|---|---|---|---|
| **Explore** | `explore: <query>` | FTS query / atom IDs | Tag-hub concept map | Discover topics; orient LLM to data shape |
| **Illuminate** | `illuminate:` (empty) | Global top-degree hubs | Ranked content atoms | Read representative passages; corpus narrative |

**Explore** reveals the *skeleton* — which concepts exist and how they cluster. An LLM receiving explore output understands the vocabulary of the corpus without reading content.

**Illuminate** reads the *substance* — the most thematically central actual passages. Operates via three phases:
1. **Top hubs** — weighted degree centrality on the edges graph (most cross-referenced compounds)
2. **Concept spine** — BFS from hubs reaches the dominant tag atoms
3. **Content pull** — finds all content atoms sharing those top tags, ranked by how many they share

With `auto_budget`, output is proportional to corpus size (default 1000:1 compression). A 350M-char corpus → ~350K chars of the most representative real passages.

### When to use each

| Question | Mode |
|---|---|
| "What topics can I search for?" | `explore:` |
| "Orient me to this dataset" | `explore:` then pass output to LLM |
| "Show me the most important passages" | `illuminate:` |
| "Compress this corpus for an LLM prompt" | `illuminate:` with `auto_budget` |
| "What's connected to rust?" | `illuminate: rust` |

### Search Prefix System (UI)

| Prefix | Mode | Endpoint |
|---|---|---|
| *(none)* | Auto STAR search | `/v1/memory/search` |
| `illuminate:` | Illuminate global (content atoms) | `/v1/memory/explore` with `global: true` |
| `illuminate: <topic>` | Explore BFS from topic | `/v1/memory/explore` with query |
| `explore: <topic>` | Explore BFS from topic | `/v1/memory/explore` with query |
| `deep:` | Max-recall multi-hop | `/v1/memory/search` with `deep: true` |
| `exact:` / `fast:` | FTS only | `/v1/memory/search` with strict FTS |

See [Standard 128](128-illuminate-bfs-traversal.md) for full specification.

## HISTORY & DEPRECATIONS
*   **Standard 104 (2026-02-10)**: Introduced Universal Semantic Search, 70/30 Split, and Smart Weighting. Deprecated "Smart Search" (094) and "Tag Walker" (086).
*   **Standard 094**: "Smart Search" (Deprecated). Attempted a "Strict Phase" which proved too brittle.
*   **Standard 086**: "Tag Walker" (Deprecated). Early attempt at calibration.
