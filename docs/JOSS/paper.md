---
title: 'STAR: Semantic Temporal Associative Retrieval - A Local-First Graph-Based Context Engine'
tags:
  - information retrieval
  - graph algorithms
  - local-first AI
  - personal knowledge management
  - sparse retrieval
authors:
  - name: R.S. Balch II
    affiliation: '1'
    orcid: 0000-0000-0000-0000
affiliations:
  - name: Independent Researcher, New Mexico Tech Affiliated
    index: 1
date: 23 February 2026
bibliography: paper.bib
---

# Summary

STAR (Semantic Temporal Associative Retrieval) is a local-first, graph-based information retrieval system designed to enable resource-constrained devices to navigate large-scale personal knowledge corpora. Unlike traditional dense vector retrieval systems that require loading complete indices into RAM, STAR implements a sparse bipartite graph approach that retrieves only relevant "atoms" of information required for a given query.

The system uses a physics-inspired scoring model combining three factors multiplicatively: semantic co-occurrence (shared tags), temporal decay (recent memories weighted higher), and structural similarity (SimHash fingerprint proximity). This multiplicative approach ensures any zero factor eliminates irrelevant results, providing precise, explainable retrieval.

STAR has been production-validated on a 28-million-token corpus of chat history and personal documents, achieving sub-200ms query latency on 4GB RAM consumer hardware without GPU acceleration. The browser paradigm architecture—treating AI memory like web browsers treat the internet—enables universal deployment from $200 laptops to supercomputers.

# Statement of Need

## The Problem

Current Retrieval-Augmented Generation (RAG) systems for AI memory face a critical accessibility problem: they require high-specification servers with GPUs and substantial RAM. This creates artificial scarcity, locking personal AI memory behind cloud subscriptions and enterprise infrastructure.

The author encountered this problem directly when accumulating 40 chat sessions (~18M tokens) with large language models. When forced to start new sessions due to context limits, summaries proved insufficient—the models needed access to the full conversational history, shared context, and developed methodologies. Existing solutions required either:
- Cloud dependencies (privacy concerns, recurring costs)
- Local vector databases requiring 4-8GB RAM just for the index
- Enterprise hardware inaccessible to individual researchers

## Research Purpose

STAR addresses this gap by implementing sparse graph retrieval that:
1. **Runs on consumer hardware** (4GB RAM, CPU-only)
2. **Operates locally** (no cloud dependencies, data sovereignty)
3. **Provides explainable results** (tag paths show why each result was retrieved)
4. **Scales linearly** (O(k·d̄) complexity vs. O(n) for dense vectors)

Target users include:
- Researchers managing large literature corpora
- Developers maintaining long-term AI-assisted projects
- Privacy-conscious users avoiding cloud services
- Resource-constrained environments (edge devices, developing regions)

# State of the Field

## Dense Vector RAG (HNSW, FAISS)

Systems like HNSW [@malkov2018efficient] and FAISS [@johnson2019billion] represent state-of-the-art approximate nearest neighbor search. However, they require loading complete vector indices into RAM (4-8GB for modest corpora), restricting deployment to high-specification servers. Vector similarity also provides limited explainability—results match because embeddings are "close," but specific reasoning remains opaque.

| Method | Time Complexity | Space Complexity | Explainability | Hardware |
|--------|----------------|------------------|----------------|----------|
| **Dense Vector ANN (HNSW)** | $O(n \log n)$ or $O(n)$ | $O(n \cdot d)$ | Opaque (black box) | GPU preferred |
| **STAR (Sparse Graph)** | **$O(k \cdot \bar{d})$** | **$O(|E|)$** | **Native (tag paths)** | **CPU-only** |

Where:
- $n$ = total atoms
- $k$ = query tags (typically 5–20)
- $\bar{d}$ = average tag degree (typically 10–100)
- $d$ = vector dimension (typically 768–1536)
- $|E|$ = sparse edges (typically $10 \cdot n$)

For personal knowledge graphs, $k \cdot \bar{d} \ll n$, making STAR asymptotically faster than dense retrieval.

## Graph-Based Memory Systems

Recent work explores graph structures as alternatives to dense vectors. T-Retriever [@wei2026tretriever] introduces tree-based hierarchical retrieval using semantic-structural entropy. While effective for hierarchical document structures, T-Retriever does not incorporate temporal decay—a key requirement for personal memory systems where recency matters. PersonalAI [@menschikov2025personalai] proposes a knowledge graph framework with hyper-edges for personalized LLM agents. However, PersonalAI focuses on framework design rather than production implementation.

STAR contributes a complete, deployed system with validated performance on 28M tokens of real-world data. The bipartite graph approach (Atoms × Tags) enforces strict separation between content and metadata, enabling O(1) deduplication via SimHash [@charikar2002similar] and disposable index architectures.

## Personal AI Memory

Second Me [@wei2025second] proposes LLM-based memory parameterization. While powerful, this requires significant computational resources and offers limited explainability. STAR achieves similar associative retrieval goals through deterministic physics-based scoring, enabling deployment on minimal hardware.

## Build vs. Contribute

Existing sparse retrieval libraries (Lucene, Terrier) focus on traditional keyword search without:
- Temporal decay modeling
- Graph-based associative traversal
- SimHash deduplication
- Byte-offset lazy loading

STAR's unified field equation combining semantic, temporal, and structural factors in a multiplicative scoring model represents a novel scholarly contribution not present in existing packages.

# Software Design

## Architecture: The Browser Paradigm

STAR implements the "Browser Paradigm" for AI memory: just as browsers render websites by loading only necessary shards (HTML, CSS, JS) rather than the entire internet, STAR retrieves only relevant atoms required for the current query. This enables universal deployment across hardware capabilities.

| Component | Browser Equivalent | Anchor Engine Implementation |
|-----------|-------------------|------------------------------|
| **HTML/CSS/JS shards** | Web page components | Atoms (tags + byte offsets) |
| **DOM tree** | Document structure | Tag graph $G = (A, T, E)$ |
| **Lazy loading** | On-demand resource fetch | Radial inflation from disk |
| **Cache** | Browser cache | Ephemeral PGlite index |

The hybrid architecture uses:
- **Node.js** as the "Browser Shell" (UI, networking, OS integration)
- **C++ N-API modules** as the "Rendering Engine" (text processing, SimHash fingerprinting)
- **PGlite** (PostgreSQL-compatible) for sparse graph storage
- **Filesystem pointers** for content (disposable, rebuildable indices)

## Data Model: Compound → Molecule → Atom

| Level | Role | Content Stored | Example |
|-------|------|----------------|---------|
| **Compound** | Document reference | Full text (temporary) | `ChatSessions.yaml` (91.88MB) |
| **Molecule** | Semantic chunk | Chunk text + byte offsets | Bytes 1024–2048 |
| **Atom** | Tag/concept | **Metadata only** | `#authentication`, `#session` |

Content lives in the filesystem; the database stores only pointers (byte offsets + tags). This separation enables:
- O(1) deduplication via 64-bit SimHash fingerprints
- Ephemeral indices (database wiped on shutdown, rebuilt from source)
- Lazy loading (content read from disk only when needed)

## The Unified Field Equation

The gravity score for query $q$ and candidate atom $a$ is:

$$W(q, a) = |T(q) \cap T(a)| \cdot \gamma^{d(q,a)} \times e^{-\lambda \Delta t} \times \left(1 - \frac{H(h_q, h_a)}{64}\right)$$

Where:
- $|T(q) \cap T(a)|$: Shared tag count (semantic co-occurrence)
- $\gamma^{d(q,a)}$: Damping factor raised to hop distance (default $\gamma = 0.85$)
- $e^{-\lambda \Delta t}$: Temporal decay ($\lambda = 0.0001$ s⁻¹, ~115 min half-life)
- $1 - H(h_q, h_a)/64$: SimHash similarity (0-63 Hamming distance normalized)

**Design rationale:** Multiplicative scoring ensures any zero factor eliminates noise. Additive approaches accumulate weak signals; multiplicative approaches require all factors to contribute.

## Retrieval Protocol: Planets and Moons

STAR implements a three-phase retrieval protocol:

### Phase 1 — Anchor Discovery (Planets)
High-precision seed set via direct matching using:
- Full-text search (BM25-style) via PostgreSQL FTS
- Radial inflation from atom positions
- Engram cache for O(1) frequent entity lookup

**Output:** 20–200 anchor atoms with $d(q,a) = 0$

### Phase 2 — Radial Inflation (Moons)
High-recall expansion via recursive tag-walker graph traversal:

```python
def radial_inflation(anchors, radius=1, max_per_hop=50):
    current_hop = anchors
    all_results = set(anchors)
    
    for hop in range(radius):
        candidates = get_connected_nodes(current_hop)
        weighted = apply_unified_field_equation(candidates, anchors)
        top_k = select_by_gravity(weighted, max_per_hop)
        all_results.update(top_k)
        current_hop = top_k
    
    return all_results
```

**Output:** 40–500 associated atoms ranked by gravity score

### Phase 3 — Elastic Context Assembly
Token-budget compliance with maximal coherence:
- Merge atoms within 500-byte proximity from same source
- Snap to sentence boundaries for narrative flow
- Progressive inflation (top 10% get 2× radius, etc.)

**Result:** 40–100 atoms → 8–12 coherent paragraphs

## SQL-Native Implementation

The equation executes as a single recursive SQL CTE in PGlite:

```sql
WITH RECURSIVE hop_traversal AS (
  -- Anchors at hop 0
  SELECT anchor_id, 0 as hop_distance FROM anchors
  
  UNION ALL
  
  -- Recursive expansion
  SELECT t2.atom_id, ht.hop_distance + 1
  FROM hop_traversal ht
  JOIN tags t1 ON ht.atom_id = t1.atom_id
  JOIN tags t2 ON t1.tag = t2.tag
  WHERE ht.hop_distance < max_radius
)
SELECT atom_id,
  ((shared_tags / 10.0) * POWER(0.85, hop_distance)) *
  EXP(-0.0001 * time_delta) * simhash_similarity as gravity_score
FROM candidates
ORDER BY gravity_score DESC;
```

**Trade-off:** Recursive CTEs add query complexity but enable precise hop-distance tracking for proper damping application. The O(k·d̄·r) complexity remains tractable for personal-scale corpora.

# Research Impact Statement

## Production Validation

STAR has been production-validated since February 2026 on a corpus of:
- **28 million tokens** (~100MB)
- **151,876 atoms** (tag/concept units)
- **280,000 molecules** (semantic chunks)
- **436 files** (compounds)

### Ingestion Performance

| Dataset | Size | Molecules | Atoms | Time | Throughput |
|---------|------|-----------|-------|------|------------|
| **Chat Sessions** (monolith) | 91.88MB | 214,000 | 776 | 177.8s | 1,203 mol/s |
| **GitHub Archive** | 2.66MB | 36,793 | 497 | 22.4s | 1,642 mol/s |
| **Code Repository** | 0.94MB | 20,916 | 199 | 25.0s | 836 mol/s |
| **Total System** | ~100MB | **280,000** | **1,500** | **~4 min** | **1,200 mol/s** |

### Search Performance

| Search Type | Budget | Results | Latency (p95) | Use Case |
|-------------|--------|---------|---------------|----------|
| **Standard** (70/30) | 16k tokens | 40–100 atoms | **150ms** | Daily queries |
| **Max Recall** (3-hop) | 65k+ tokens | 200–500 atoms | **690ms** | Research |
| **Keyword** (direct FTS) | 4k tokens | 20–50 atoms | **100ms** | High precision |

### Memory Management

| Phase | RSS Memory | Notes |
|-------|------------|-------|
| **Peak (ingestion)** | 1,657MB | During 91MB file processing |
| **Idle (post-cleanup)** | 510MB | After 5min idle |
| **Reduction** | **-69%** | 1,147MB saved via GC |

**Key Achievement:** Sub-200ms query latency on 4GB RAM consumer hardware without GPU acceleration.

## External Use and Integrations

The system is designed as agent-harness agnostic, providing stateless context retrieval via HTTP API for integration with:
- OpenCLAW framework (primary target)
- Custom agent frameworks
- Direct API integrations
- CLI automation

## Reproducibility

All benchmarks are reproducible using the included `benchmarks/` directory:
- `ingestion-benchmark.ts`: Measures molecule processing rates
- `search-benchmark.ts`: Measures query latency distributions
- `comparison-framework.ts`: Framework for cross-system evaluation

## Community Readiness

- **License:** AGPL-3.0 (open source, copyleft)
- **Version:** 4.2.0 (stable production release)
- **Documentation:** Comprehensive specs, standards (77 architecture standards), and API documentation
- **Containerization:** Docker and docker-compose support for easy deployment
- **Repository:** https://github.com/RSBalchII/anchor-engine-node

## Reproducibility and Deployment

STAR includes comprehensive containerization support ensuring reproducible deployment:

```bash
# One-command deployment
docker-compose up -d

# Health check
curl http://localhost:3160/health
```

**Docker Features:**
- Single-stage build based on Node.js 20 LTS
- Persistent volumes for database and user data
- Health checks with automatic restart
- Resource limits (2 CPU, 2GB RAM) matching tested constraints

This containerization enables researchers to reproduce all benchmarks with identical environments, addressing a key concern in software evaluation.

# AI Usage Disclosure

Generative AI tools were extensively used in the development of this software and paper. The following details the specific tools, their applications, and human oversight:

## Tool Identification

### Code Development and Architecture
- **GitHub Copilot** (VS Code extension): Used for TypeScript boilerplate, SQL query patterns, and API scaffolding
- **Gemini 2.5 Pro** (Google AI): Used for algorithm design discussions, optimization suggestions, and code review
- **Gemini 3 Pro** (Google AI): Used for complex SQL query generation and recursive CTE refinement
- **Qwen Coder**: Used for native module integration patterns and performance optimization suggestions
- **Kimi AI**: Used for documentation generation and README drafting
- **Deepseek Coder**: Used for debugging assistance and test case generation

### Paper Authoring and Documentation
- **Gemini 2.5 Pro / 3 Pro**: Used for paper structure suggestions, citation formatting, and LaTeX/Markdown syntax
- **Kimi AI**: Used for grammar checking, style consistency, and readability improvements

### Mathematical and Conceptual Work
- **Gemini 3.1 Pro**: Used for temporal decay calculations, complexity analysis verification, and equation formatting
- **Deepseek**: Used for symbolic algebra verification and benchmark calculation checking

## Scope of Assistance

### What AI Tools Provided
- **Code scaffolding**: Boilerplate TypeScript classes, function signatures, and module structures
- **SQL query patterns**: Initial CTE structures, JOIN optimizations, and index recommendations
- **Algorithm discussion**: Suggestions for hop-distance tracking and damping factor calculations
- **Debugging**: Error diagnosis and fix suggestions for native module integration
- **Documentation**: Draft README sections, API documentation templates, and inline code comments
- **Paper structure**: Suggested section ordering, transition paragraphs, and formatting compliance
- **Grammar and style**: Sentence restructuring, citation formatting, and technical writing improvements

### What AI Tools Did NOT Provide
- **Core algorithm design**: The Unified Field Equation, browser paradigm concept, and sparse graph architecture were conceived and validated by the human author
- **Mathematical derivations**: All temporal decay calculations, complexity proofs, and SimHash integration logic were designed and verified by the human author
- **Research direction**: All scientific claims, design trade-offs, and architectural decisions were made by the human author
- **Benchmark methodology**: All performance testing approaches and metric selection were determined by the human author
- **Production validation**: All real-world testing on 28M tokens was conducted by the human author

## Human Verification and Oversight

The human author (R.S. Balch II):

1. **Reviewed all AI-generated code**: Every line of TypeScript, SQL, and Python was read, understood, and validated for correctness before inclusion
2. **Modified AI suggestions**: Boilerplate code was adapted to fit the specific architecture; SQL queries were optimized for PGlite compatibility; algorithmic suggestions were tested against production data
3. **Made all architectural decisions**: The browser paradigm, three-tier data hierarchy (Compound→Molecule→Atom), and physics-inspired scoring model were human-designed concepts
4. **Verified mathematical correctness**: All temporal decay calculations were independently verified using Python/SymPy; complexity analysis was manually derived
5. **Conducted all benchmarks**: The 28M token production validation, latency measurements, and memory profiling were performed by the human author on actual hardware
6. **Edited all documentation**: AI-generated README sections and paper drafts were substantially rewritten to ensure technical accuracy and consistent voice

**Specific Examples of Human Oversight:**
- The recursive CTE for hop-distance tracking was initially suggested by AI but completely restructured by the author to handle cycle prevention and proper damping application
- The SimHash integration pattern was AI-suggested but required human debugging to handle 64-bit BigInt operations correctly in PostgreSQL
- The paper's complexity analysis table was AI-formatted but populated with human-calculated values
- The Docker containerization was AI-suggested but configured by the author to match tested resource constraints (2GB RAM, 2 CPU)

## Original Human Contributions

The following represent the primary scholarly and creative contributions of the human author, conceived without AI assistance:

- **Browser Paradigm Metaphor**: The central conceptual framework treating AI memory like web browsers
- **Unified Field Equation**: The multiplicative scoring model combining semantic, temporal, and structural factors
- **Planets and Moons Protocol**: The three-phase retrieval architecture
- **Ephemeral Index Design**: The disposable database pattern with filesystem source-of-truth
- **Production Benchmarking**: Real-world validation on 28M tokens of chat history
- **Open Source Strategy**: AGPL-3.0 licensing and community-focused development approach

## Author Accountability

The submitting author (R.S. Balch II) bears complete responsibility for:

- **Accuracy**: All technical claims, benchmarks, and mathematical derivations have been verified by the author
- **Originality**: The core contributions (browser paradigm, unified field equation) represent original research
- **Licensing Compliance**: All code is original or properly licensed; AGPL-3.0 terms are correctly applied
- **Ethical Standards**: No deceptive practices; all AI assistance is fully disclosed
- **Reproducibility**: The software functions as described; benchmarks are reproducible using included Docker configuration

**Verification of Claims:**
- All performance benchmarks (1,203 mol/s ingestion, 150ms query latency, 510MB idle memory) were measured by the author on production hardware Omen 17 laptop with RTX 4090 16GB VRAM, 64GB RAM, and Intel i9-13980HX CPU
- All mathematical claims (O(k·d̄) complexity, 115-minute half-life) were independently calculated and verified
- All software functionality (v4.2.0) is available for inspection at https://github.com/RSBalchII/anchor-engine-node

**No AI tools were used for:**
- Peer review simulation
- Editor/reviewer communication (beyond translation support, which was not needed)
- Plagiarism or circumvention of academic standards
- Generating fake data or benchmarks

# Acknowledgments

This research was conducted as independent work without external funding.

The STAR algorithm builds upon foundational work in similarity estimation (Charikar's SimHash), graph-based search (PageRank), and information retrieval (sparse vector models). The implementation uses PGlite by ElectricSQL and open-source tools from the Node.js ecosystem.

# References
