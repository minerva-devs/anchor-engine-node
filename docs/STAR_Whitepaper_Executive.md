# STAR: Semantic Temporal Associative Retrieval
## Executive Summary

**A Browser‑Inspired Paradigm for Local‑First AI Memory**

**Version:** (VERSION) | **Date:** March 18, 2026 | **Author:** Robert S. Balch II

---

## Abstract

Modern AI memory relies on massive vector indices, GPU‑heavy infrastructure, and opaque similarity metrics. This creates artificial scarcity and locks users into cloud ecosystems.

**STAR** (Semantic Temporal Associative Retrieval) introduces a **local‑first, deterministic, explainable** retrieval algorithm inspired by how web browsers load only the shards needed for the current view. STAR enables any device—from a $200 laptop to a workstation—to navigate massive datasets using a sparse graph of atoms and tags, with retrieval complexity **O(k·d̄)** instead of **O(n log n)**.

**Production validated:** 91MB chat history, 280K molecules, 151K atoms, <200ms search latency, <1GB RAM.

---

## 1. The Problem: AI Memory Is Broken

Today's RAG systems:
- ❌ Load entire vector indices into RAM (4-8GB minimum)
- ❌ Require GPUs for acceptable performance
- ❌ Produce opaque, non‑deterministic results
- ❌ Depend on cloud infrastructure or expensive hardware
- ❌ Can't explain *why* something was retrieved

This is unsustainable for personal, local‑first AI. It's expensive, unprivate, and inaccessible to most users.

---

## 2. The Solution: STAR

STAR models memory as a **bipartite graph**:

| Component | Description |
|-----------|-------------|
| **Atoms** | Pointers to content (file + byte range) — NOT the content itself |
| **Tags** | Semantic concepts extracted from content |
| **Edges** | Relationships between atoms and tags |

Retrieval is governed by a **unified field equation**:

```
W(q,a) = |T(q) ∩ T(a)| · γ^d(q,a)  ×  e^(−λΔt)  ×  (1 − H(h_q, h_a)/64)
         ↑ Semantic Gravity         ↑ Temporal Decay   ↑ Structural Gravity
```

| Component | What It Does | Default |
|-----------|--------------|---------|
| **Semantic Gravity** | Shared tags × hop‑distance damping | γ = 0.85 |
| **Temporal Decay** | Recent memories weighted higher | λ = 0.0001 s⁻¹ |
| **Structural Gravity** | SimHash proximity (64-bit fingerprints) | Hamming distance |

**Multiplicative scoring** eliminates noise: any zero factor removes the candidate.

---

## 3. Architecture: The Browser Paradigm

Just as a browser loads only the HTML, CSS, and JS needed for the current view, STAR loads only the atoms relevant to a query.

```
┌─────────────────────────────────────────────────────────────┐
│              ⚡ ANCHOR ENGINE                                │
│         (Deterministic Memory Layer)                        │
│                                                              │
│  - Graph traversal (STAR algorithm)                         │
│  - Pointer-only index (<1GB RAM)                            │
│  - Deterministic retrieval (same query = same result)       │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
         ▼           ▼           ▼
┌──────────────┐ ┌──────────┐ ┌─────────────┐
│ PGlite       │ │ mirrored │ │ MCP Clients │
│ (WASM DB)    │ │ _brain/  │ │ (Claude,    │
│              │ │ (Content)│ │  Cursor)    │
└──────────────┘ └──────────┘ └─────────────┘
```

**Key Design Decisions:**

1. **Content on disk** — `mirrored_brain/` filesystem is the source of truth
2. **Pointers in database** — PGlite stores only file paths + byte offsets
3. **Disposable index** — Wipe the database and rebuild in minutes from filesystem
4. **Lazy loading** — Load content only when needed for context assembly

This yields:
- ✅ **<1GB RAM** usage even for 100MB+ datasets
- ✅ **O(k·d̄)** retrieval — linear in graph degree, not total size
- ✅ **Deterministic, explainable results** — every atom includes provenance

---

## 4. Retrieval Protocol

### Phase 1: Anchor Discovery
Find high‑precision seeds via:
- Full‑text search (PGlite `tsvector`/`tsquery`)
- Tag matches
- Engram cache (frequently accessed atoms)

**Output:** 20–200 anchor atoms

### Phase 2: Radial Inflation
Graph traversal with:
- Hop‑distance damping (γ^d)
- Temporal decay (e^−λΔt)
- Structural similarity (SimHash)

**Output:** 40–500 associated atoms, ranked by gravity score

### Phase 3: Elastic Context Assembly
- Merge atoms within proximity
- Snap to sentence boundaries
- Respect token budgets

**Output:** 8–12 coherent paragraphs (4K–618K chars)

---

## 5. Benchmarks (Real Production Data)

**Hardware:** AMD Ryzen / Intel i7, 16GB RAM, NVMe SSD, no GPU

**Dataset:** 91MB chat history (~25M tokens)

| Metric | Value |
|--------|-------|
| **Molecules** | 280,000 |
| **Atoms** | 151,876 |
| **Files** | 436 |
| **Ingestion Time** | 178 seconds |
| **Search Latency (p95)** | <200ms |
| **Memory (idle)** | ~600MB |
| **Memory (peak)** | ~1.6GB |
| **Restore Speed** | 281,690 atoms in 13.8 min |

**Comparison: STAR vs. Vector RAG**

| Feature | STAR | Vector RAG |
|---------|------|------------|
| **Hardware** | CPU‑only | GPU preferred |
| **RAM** | <1GB | 4–8GB |
| **Explainability** | Native (tags, hops, decay) | None (black box) |
| **Deterministic** | ✅ Yes | ❌ No |
| **Cloud Required** | ❌ No | Often |
| **Retrieval Complexity** | O(k·d̄) | O(n log n) |

---

## 6. What's New in v5.0.0

### MCP Write Operations
- **`anchor_ingest_text`** — Ingest raw text directly
- **`anchor_ingest_file`** — Ingest files from filesystem
- Security toggle (opt-in via `user_settings.json`)
- Bucket selection (`inbox` vs `external-inbox`)

### Session Index
- **`anchor_search_index`** — Fast chat session lookup
- **`anchor_fetch_session`** — Targeted session retrieval
- Two-tier memory retrieval (index → targeted fetch)

### Web UI Improvements
- **Paste & Ingest** tab — Quick text ingestion
- Bucket selector with guidance
- Version badge (v5.0.0)

### Philosophy Documentation
- Core principles embedded throughout docs
- "AI memory should work like your brain" narrative
- 5 new documentation files

---

## 7. Conclusion

STAR proves that AI memory can be:
- ✅ **Local** — no cloud, no API keys
- ✅ **Explainable** — every result has a receipt
- ✅ **Deterministic** — same query, same answer
- ✅ **Efficient** — runs on commodity hardware
- ✅ **Hardware‑agnostic** — from Raspberry Pi to server

This architecture democratizes AI memory and returns control to users.

---

## Quick Start

```bash
git clone https://github.com/RSBalchII/anchor-engine-node.git
cd anchor-engine-node
pnpm install
pnpm build
pnpm start
```

Open http://localhost:3160

---

## Full Documentation

- **[Full Whitepaper](whitepaper.md)** — Complete mathematical derivation
- **[System Spec](../specs/spec.md)** — Architecture diagrams
- **[API Reference](API.md)** — All endpoints
- **[Standards](../specs/current-standards/)** — Active architecture decisions

---

*— Robert S. Balch II, March 18, 2026*
