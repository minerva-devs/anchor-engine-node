# Anchor Engine - Project State Assessment

**Date:** 2026-03-17  
**Version:** v4.7.0 (main), v4.8.0 (tagged)  
**Commit:** 24bb733 - "docs: Add core philosophy throughout documentation"

---

## Executive Summary

Anchor Engine is a **production-ready deterministic semantic memory layer** for LLMs. It replaces fuzzy vector search with graph traversal, runs entirely offline in <1GB RAM, and provides explainable retrieval with full provenance tracking.

**Current Status:** ✅ **Ready for public launch** (Reddit/HN scheduled for 9am EST tomorrow)

---

## Core Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Database** | PGlite (WASM PostgreSQL) | Zero-compilation, cross-platform SQL + FTS |
| **Runtime** | Node.js 18+ (ESM) | Server and CLI |
| **NLP** | Wink NLP (lightweight) | Entity extraction, POS tagging |
| **WASM Modules** | @rbalchii/* packages | Atomization, fingerprinting, tag walking |
| **UI** | Solid.js + TypeScript | Reactive web interface |
| **MCP** | @modelcontextprotocol/sdk | AI assistant integration |

### Data Model

```
Compound (source file)
  └─ Molecule (semantic chunk with byte offsets)
      └─ Atom (tags/concepts, not content)
```

**Key Design:** Content lives in `mirrored_brain/` filesystem. Database stores only pointers (byte offsets + metadata). This makes the index **disposable and rebuildable**.

---

## Key Features (v4.6-v4.7)

### 1. **STAR Algorithm** (Semantic Temporal Associative Retrieval)
- Deterministic graph traversal (not cosine similarity)
- Two-phase search: anchors + neighbors
- Temporal decay weighting
- Physics-inspired scoring (hub ranking, simhash distance)

### 2. **Streaming Search** (Standard 136)
- Server-Sent Events (SSE) endpoint
- Batch processing (20 results/batch)
- 60% lower peak memory
- Prevents OOM on large corpora

### 3. **Radial Distillation** (Standards 008, 010)
- Compresses corpus into deduplicated YAML
- Decision Records v2.0 output (extracts *why* behind decisions)
- Tested: 2336 → 1268 lines (1.84:1 compression)
- 5 minutes on Pixel 7 (mobile-optimized)

### 4. **Illuminate** (Standard 009)
- BFS graph traversal from seed concepts
- Hub-ranked scores + timestamps
- Global spine mode (empty seed = corpus overview)
- Token-budgeted output

### 5. **MCP Server** (v4.7.0)
- Tools: `anchor_query`, `anchor_distill`, `anchor_illuminate`, `anchor_read_file`, `anchor_list_compounds`
- Write operations: `anchor_ingest_text`, `anchor_ingest_file` (toggleable)
- Zod validation on all inputs
- Rate limiting + API key support

### 6. **Adaptive Concurrency** (Standard 005)
- Auto-switches between sequential (mobile) and parallel (desktop)
- Detects RAM/CPU to optimize thread count
- Prevents OOM on Termux/Android

### 7. **Memory Management** (Standards 127/134/135)
- User-configurable thresholds in `user_settings.json`
- Throttle start: 1.5GB
- Throttle max: 2.5GB  
- Emergency stop: 3.5GB
- Two-pass scoring (lightweight → expensive)

---

## Performance Benchmarks

| Metric | Value | Notes |
|--------|-------|-------|
| **Search Latency** | <200ms (p95) | 28M token corpus |
| **Memory Usage** | <1GB RAM | Peak during search |
| **Ingestion Speed** | ~25M tokens in 5min | 8-15ms per chunk |
| **Backup Restore** | 13.8min for 281K atoms | 340 atoms/sec |
| **Distillation** | 5min on Pixel 7 | 1.84:1 compression |
| **Streaming** | 60% memory reduction | vs. bulk loading |

### v4.5.4 Optimizations
- **Bulk Insert:** 17x faster (14.4s → 847ms for 5000 atoms)
- **TagAuditor:** 11x faster (500ms → 45ms for 100 atoms)
- **Master Tags:** Instant reads with in-memory cache

---

## Standards Compliance

**Active Standards (10 current):**

| # | Title | Purpose |
|---|-------|---------|
| 001 | Memory-Safe Ingestion | File size limits (10MB), molecule caps (10K) |
| 002 | Reproducible Benchmarking | Standardized performance testing |
| 003 | MCP Tool Interface | Tool schemas for AI integration |
| 004 | Streaming Search | SSE protocol, batch processing |
| 005 | Adaptive Concurrency | Mobile vs. desktop optimization |
| 006 | Mobile Search Optimization | OOM prevention on phones |
| 007 | PGlite Memory Optimization | WASM memory management |
| 008 | Radial Distillation | Corpus compression |
| 009 | Illuminate BFS Traversal | Graph exploration |
| 010 | Radial Distillation v2 | Decision Records output |

**Historical Standards:** 136+ standards archived in `specs/archive-standards/history/`

---

## Project Structure

```
anchor-engine-node/
├── engine/                 # Core engine (TypeScript)
│   ├── src/
│   │   ├── core/          # Database, PGlite wrapper
│   │   ├── routes/        # REST API (v1, enhanced-api)
│   │   ├── services/      # Search, ingest, distillation
│   │   ├── commands/      # CLI commands (distill, illuminate)
│   │   ├── utils/         # Adaptive concurrency, timers
│   │   └── config/        # Schema, settings
│   ├── tests/             # Integration tests
│   └── package.json       # v4.6.0
├── mcp-server/            # MCP integration
│   ├── index.ts           # Server implementation
│   └── package.json       # v4.7.0
├── packages/anchor-ui/    # Solid.js frontend
├── demo/                  # GitHub Pages demo (static HTML)
├── specs/
│   ├── current-standards/ # 10 active standards
│   └── archive-standards/ # Historical standards
├── docs/                  # Whitepaper, architecture diagrams
├── scripts/               # Build, sync, utilities
└── benchmarks/            # Performance testing
```

### Recent Cleanup (Latest Commit)
- ✅ **Removed `cpp/` directory** (337K lines deleted)
  - C++ native modules replaced by WASM packages
  - No longer needed after v4.3.0 PGlite migration
- ✅ **Reorganized standards** into `current-standards/` and `archive-standards/history/`
- ✅ **Added governance docs:** CODE_OF_CONDUCT.md, CONTRIBUTING.md

---

## Demo Status

**Live Demo:** https://rsbalchii.github.io/anchor-engine-node/demo/index.html

**Features:**
- Project Gutenberg integration (24 classic books)
- Client-side STAR algorithm (ES5 compatible for Edge)
- CORS proxy: `corsproxy.io` (fixed in latest gh-pages)
- Live stats: atoms, tags, edges, search time
- Tag receipts showing WHY each result matched

**Demo Flow:**
1. Select book from Gutenberg API
2. Ingest via CORS proxy
3. Atomize + build graph (2-5 seconds)
4. Search with sub-millisecond latency
5. View results with tag receipts

**Tested Queries:**
- "capehorner" in Moby Dick → 12 results (anchor + neighbors)
- "monster" in Frankenstein → creation scenes
- "whale" in Moby Dick → cetology + hunting

---

## Launch Readiness

### ✅ **Ready Components**

| Component | Status | Notes |
|-----------|--------|-------|
| **Main Branch** | ✅ Clean | 24bb733, synced with origin/main |
| **Demo** | ✅ Live | gh-pages e62823e, CORS fixed |
| **Tags** | ✅ v4.6.0, v4.7.0, v4.8.0 | All pushed |
| **Documentation** | ✅ Complete | README, whitepaper, standards |
| **MCP Server** | ✅ v4.7.0 | Write operations added |
| **Tests** | ✅ Passing | Integration + unit suites |
| **Benchmarks** | ✅ Documented | 28M tokens, <200ms p95 |

### 📝 **Launch Plan**

**Reddit Posts (9am EST = 14:00 UTC):**
1. **r/LocalLLaMA** (180K members)
   - Title: "Built a deterministic semantic memory layer for LLMs – no vectors, <1GB RAM"
   - Demo link in first paragraph
   - Social proof: "30+ GitHub stars"
   
2. **Hacker News** (Show HN)
   - Title: "Show HN: Anchor Engine – deterministic semantic memory for LLMs, <1GB RAM"
   - First comment with demo link

**Key Messaging:**
- Deterministic (same query = same result)
- Inspectable (tag receipts show WHY)
- Lightweight (<1GB RAM, runs on phone)
- No vectors, no cloud, no embedding drift

---

## Technical Debt / Known Issues

### Low Priority
1. **Benchmark updates needed** - Some benchmarks still reference v4.5.4, need v4.7.0 numbers
2. **Android app** - Mentioned in roadmap, not yet released
3. **LangChain/LlamaIndex integration** - Requested by users, not implemented

### Medium Priority
1. **Conflict resolution UI** - Currently stores both contradictory facts with timestamps; needs explicit superseding edges
2. **Confidence scoring** - Planned feature for atomized facts
3. **Multi-book search in demo** - Currently single-book only

### High Priority
- **None** - Core functionality is stable and production-ready

---

## Competitive Advantages

| Feature | Anchor Engine | Vector RAG |
|---------|--------------|------------|
| **Deterministic** | ✅ Yes | ❌ No (embedding drift) |
| **Inspectable** | ✅ Tag receipts | ❌ Black box |
| **Setup** | ✅ Zero (demo in browser) | ❌ Requires embeddings |
| **Speed** | ✅ <1ms (400 atoms) | ~50-200ms |
| **Hardware** | ✅ Any browser / <1GB RAM | ❌ GPU preferred |
| **Offline** | ✅ Full support | ❌ Often cloud-dependent |
| **Explainable** | ✅ Provenance tracking | ❌ Cosine similarity scores |

---

## Next Development Priorities (Post-Launch)

### Week 1-2 (Based on Community Feedback)
1. **Integration plugins** - LangChain, LlamaIndex, Cozo
2. **Multi-book demo** - Search across multiple books simultaneously
3. **Export formats** - YAML, JSON, Markdown for search results

### Month 1
1. **Android app** - Termux packaging + UI
2. **Conflict resolution UI** - Visual timeline for contradictory facts
3. **Confidence scoring** - Per-atom reliability metrics

### Quarter 1
1. **JOSS publication** - Submit revised paper (v4.7.0 architecture)
2. **Research partnerships** - Collaborate with academic institutions
3. **Enterprise features** - Multi-user access control, audit logs

---

## Community Metrics (As of 2026-03-17)

- **GitHub Stars:** 30+ (growing)
- **Last Launch:** r/AI_Application - 45 upvotes, 27 comments, 36K views
- **Production Use:** 28M tokens ingested (8 months of chat history)
- **Demo Visitors:** TBD (post-launch metric)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Launch underperforms** | Medium | Low | Content is evergreen, can re-post |
| **Technical criticism** | Low | Low | Benchmarks documented, code open for audit |
| **Server overload** | Low | Medium | Demo is static (GitHub Pages), no backend |
| **License concerns** | Low | Low | AGPL-3.0 is clear, dual licensing available |
| **Vector advocacy pushback** | Medium | Low | Acknowledge vectors have their place (large-scale, fuzzy OK) |

---

## Conclusion

**Anchor Engine is launch-ready.** The codebase is clean, documented, and production-tested. The demo works flawlessly with CORS fixed. The narrative is clear: deterministic, inspectable, lightweight memory for local LLMs.

**Tomorrow's launch will validate:**
1. Market fit (does this resonate with r/LocalLLaMA?)
2. Technical credibility (will benchmarks hold up to scrutiny?)
3. Community interest (will developers try the demo?)

**Success metrics:**
- 100+ upvotes on Reddit
- 50+ new GitHub stars
- 200+ demo visitors
- 10+ meaningful technical discussions

**Post-launch:** Iterate based on feedback, pursue JOSS publication, explore research partnerships.

---

*This assessment is based on commit 24bb733 and reflects the project state as of 2026-03-17.*
