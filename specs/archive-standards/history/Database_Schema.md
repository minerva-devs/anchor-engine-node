# Domain Standard: Database Schema & ERD

**Status:** LIVING | **Domain:** Database (PGlite)
**Maintained By:** Anchor Engine Team
**Last Updated:** 2026-03-08 (v4.5.2 — full ERD, three-tier atoms model)

---

## 1. Overview

Anchor uses **PGlite** (PostgreSQL compiled to WASM, running in-process) for local, serverless storage. The schema implements a multi-resolution content hierarchy: full documents → paragraph chunks → semantic tags, connected by a graph of edges.

**Database file:** `engine/context_data/anchor.db` (PGlite directory)  
**Reset policy:** Standard 095 (Tabula Rasa — DB is a cache; filesystem is source of truth)

---

## 2. Entity Relationship Diagram

```
┌─────────────────┐         ┌──────────────────────────────────────────┐
│   github_repos  │         │                  atoms                    │
│─────────────────│         │──────────────────────────────────────────│
│ id PK           │         │ id TEXT PK  ← THREE TIERS (see §3)       │
│ owner           │         │ content TEXT                              │
│ repo            │         │ source_path TEXT  ← 'atom_source' = stub │
│ branch          │         │ compound_id TEXT  → compounds.id          │
│ bucket          │         │ timestamp REAL                            │
│ github_url      │         │ simhash TEXT                              │
│ last_synced_at  │         │ embedding TEXT                            │
│ total_files     │         │ vector_id BIGINT                          │
│ total_atoms     │         │ provenance TEXT                           │
│ total_size_bytes│         │ buckets TEXT[]                            │
└─────────────────┘         │ tags JSONB   ← tag label array            │
                            │ entities JSONB                            │
┌─────────────────┐         │ start_byte INTEGER                        │
│    sources      │         │ end_byte INTEGER                          │
│─────────────────│         │ molecular_signature TEXT                  │
│ path TEXT PK    │         │ sequence INTEGER                          │
│ hash TEXT       │         │ type TEXT                                 │
│ total_atoms INT │         │ numeric_value REAL                        │
│ last_ingest REAL│         │ numeric_unit TEXT                         │
└─────────────────┘         │ payload JSONB                             │
                            └──────────┬───────────────────────────────┘
                                       │ compound_id
                                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            compounds                                │
│─────────────────────────────────────────────────────────────────────│
│ id TEXT PK           ← mem_xxxx (SHA hash of path+content)          │
│ compound_body TEXT   ← full document text                           │
│ path TEXT            ← source file path                             │
│ timestamp REAL                                                       │
│ provenance TEXT      ← 'internal' | 'external' | 'quarantine'      │
│ molecular_signature TEXT                                             │
│ atoms TEXT           ← JSON array of atom_xxx IDs (tag atoms)       │
│ molecules TEXT       ← JSON array of mol_xxx IDs                    │
│ embedding TEXT                                                       │
└──────────┬──────────────────────────────────────────────────────────┘
           │ compound_id
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                          molecules                               │
│──────────────────────────────────────────────────────────────────│
│ id TEXT PK        ← mol_xxxx (hash)                              │
│ content TEXT      ← paragraph/chunk level text                   │
│ compound_id TEXT  → compounds.id                                 │
│ sequence INTEGER  ← position within compound                     │
│ start_byte INTEGER                                               │
│ end_byte INTEGER                                                 │
│ type TEXT         ← 'text' | 'code' | 'header' etc.             │
│ numeric_value REAL                                               │
│ numeric_unit TEXT                                                │
│ molecular_signature TEXT                                         │
│ embedding TEXT                                                   │
│ timestamp REAL                                                   │
│ tags JSONB        ← tag label array                              │
│ entities JSONB                                                   │
└──────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                              edges                                         │
│────────────────────────────────────────────────────────────────────────────│
│ source_id TEXT   → compounds.id (mem_xxx)  ← always a compound            │
│ target_id TEXT   → atoms.id    (atom_xxx)  ← always a tag stub atom       │
│ relation TEXT    ← always 'has_tag' (currently)                           │
│ weight REAL      ← always 1.0 (currently)                                 │
│ PK (source_id, target_id, relation)                                        │
└────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                             tags                                  │
│───────────────────────────────────────────────────────────────────│
│ atom_id TEXT   → atoms.id  ← ONLY tag stub atoms (atom_xxx)       │
│ tag TEXT       ← the tag label string e.g. '#Python'              │
│ bucket TEXT    ← search bucket e.g. 'code', 'doc'                 │
│ PK (atom_id, tag, bucket)                                          │
└───────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                          atom_positions                              │
│──────────────────────────────────────────────────────────────────────│
│ compound_id TEXT  → compounds.id                                     │
│ atom_label TEXT   ← tag label e.g. '#Python' (not an ID)            │
│ byte_offset INT   ← where this tag appears in the compound body      │
│ PK (compound_id, atom_label, byte_offset)                            │
└──────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────┐   ┌────────────────────────────────────┐
│           synonyms             │   │          summary_nodes             │
│────────────────────────────────│   │────────────────────────────────────│
│ term TEXT PK                   │   │ id TEXT PK                         │
│ synonyms TEXT  ← JSON ring     │   │ type TEXT                          │
│ created_at TIMESTAMP           │   │ content TEXT                       │
└────────────────────────────────┘   │ span_start REAL                    │
                                     │ span_end REAL                      │
┌────────────────────────────────┐   │ embedding TEXT                     │
│            engrams             │   └────────────────────────────────────┘
│────────────────────────────────│
│ key TEXT PK  ← lexical sidecar │
│ value TEXT                     │
└────────────────────────────────┘
```

---

## 3. The Three-Tier Atoms Model ⚠️

The `atoms` table stores **three structurally different entity types** under one table, distinguished only by `id` prefix and `source_path`. This is critical to understand for any query.

| Tier | ID prefix | source_path | content | compound_id | Purpose |
|---|---|---|---|---|---|
| **Tag Stub** | `atom_xxx` | `'atom_source'` | `'#TagLabel'` | NULL | Tag vocabulary nodes; graph hubs in `edges` |
| **Molecule Atom** | `mol_xxx` | real file path | paragraph/chunk | `mem_xxx` | Primary content unit for search and illuminate |
| **Compound Body** | `mem_xxx` | real file path | full document | `mem_xxx` (self) | Full document body; very large, ~10KB–50KB |

**Query patterns:**
```sql
-- Get only content atoms (exclude stubs and full-document bodies):
SELECT * FROM atoms
WHERE source_path != 'atom_source'
  AND id NOT LIKE 'mem_%';

-- Get tag stubs only:
SELECT * FROM atoms WHERE source_path = 'atom_source';

-- Get all content for a compound (molecule atoms only):
SELECT * FROM atoms
WHERE compound_id = 'mem_xxx'
  AND source_path != 'atom_source'
  AND id NOT LIKE 'mem_%'
ORDER BY start_byte;
```

---

## 4. The Tags Table — Important Caveat ⚠️

The `tags` table only indexes **tag stub atoms** (tier 1 above). It does NOT contain content atom tag relationships.

| What it stores | Example row |
|---|---|
| Tag stub self-index | `(atom_id='atom_75df0c0a8d64', tag='#Python', bucket='code')` |

Content atom tags are stored as a **JSONB array** in `atoms.tags` and `molecules.tags`. To find content atoms by tag, query the JSONB column:

```sql
SELECT id FROM atoms
WHERE source_path != 'atom_source'
  AND id NOT LIKE 'mem_%'
  AND tags::jsonb ? '#Python';
```

---

## 5. The Edges Table — Graph Structure

Edges encode **compound → tag_atom** relationships only (relation `'has_tag'`):

```
mem_ccab18a24584 ──has_tag──► atom_75df0c0a8d64 (#Python)
mem_ccab18a24584 ──has_tag──► atom_7a262302cc9d (#anchor)
mem_ccab18a24584 ──has_tag──► atom_33bd9e9444e5 (#memory)
```

This means:
- **Weighted degree centrality** on `edges` reveals the most cross-referenced compounds
- **BFS via edges** from a mem_ hub reaches tag atoms, NOT content atoms
- To get content from a hub, join via `atoms.compound_id`

---

## 6. Content Resolution Path

```
User query: "illuminate:"
    │
    ▼
globalTopNodes()                    ← edges GROUP BY source_id (mem_)
    │ top N mem_ IDs
    ▼
atoms WHERE compound_id IN (hubs)   ← molecule atoms (mol_xxx)
  AND source_path != 'atom_source'
  AND id NOT LIKE 'mem_%'
    │ content atom IDs
    ▼
fetchNodes()                        ← atoms WHERE id IN (...)
    │ {id, content, source, tags}
    ▼
Budget trim → return passages
```

---

## 7. FTS Index

```sql
CREATE INDEX idx_atoms_content_gin
ON atoms USING GIN(to_tsvector('simple', content));
```

Used by `resolveSeedsByQuery()` in explore and by the main search engine. Falls back to `ILIKE` if FTS syntax errors.

---

## 8. Key Indexes

| Index | Table | Column | Purpose |
|---|---|---|---|
| `idx_atoms_compound_id` | atoms | compound_id | Physics Walker lookup |
| `idx_atoms_content_gin` | atoms | content (FTS) | Full-text search |
| `idx_tags_tag` | tags | tag | Tag lookup |
| `idx_tags_atom_id` | tags | atom_id | Reverse tag lookup |
| `idx_tags_bucket` | tags | bucket | Bucket filtering |
| `idx_molecules_compound` | molecules | compound_id | Molecule lookup |
| `idx_atom_positions_label` | atom_positions | atom_label | Radial inflation |
| `idx_github_repos_owner_repo` | github_repos | owner, repo | Repo dedup |

---

## 9. Related Standards

- **Standard 095:** Tabula Rasa — DB reset on startup
- **Standard 100:** PGlite type handling (TEXT vs TEXT[] vs JSONB)
- **Standard 099:** SQL injection prevention
- **Standard 119:** PGlite-first architecture
- **Standard 127:** PGlite memory optimization
- **Standard 128:** Illuminate/Explore — BFS traversal using this schema

---

**Last Updated:** 2026-03-08 (v4.5.2)  
**Owner:** Anchor Engine Team

