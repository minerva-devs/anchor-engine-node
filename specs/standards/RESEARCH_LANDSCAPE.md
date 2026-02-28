# Research Landscape: STAR Algorithm & Related Work

**Date:** February 23, 2026  
**Purpose:** Position STAR in research landscape, identify related work, cite appropriately

---

## Executive Summary

**STAR** (Semantic Temporal Associative Retrieval) is a novel graph-based retrieval algorithm that provides an alternative to dense vector RAG systems. This document analyzes the research landscape, identifies key related work, and provides citation guidance.

---

## Research Categories

### Primary: cs.IR (Information Retrieval)

STAR is fundamentally an **information retrieval** algorithm with:
- Graph-based indexing (bipartite tag graph)
- Sparse retrieval (tag-based, not dense vectors)
- Temporal decay (recency-weighted ranking)
- Explainable results (tag paths as provenance)

### Secondary: cs.AI (Artificial Intelligence)

STAR serves as **AI memory infrastructure** for:
- LLM context retrieval
- Personal knowledge management
- Long-term memory systems

### Tertiary: cs.SE (Software Engineering)

STAR implements **local-first architecture**:
- Browser paradigm (sharded loading)
- Disposable indices (rebuildable from source)
- CPU-only operation (no GPU required)

---

## Key Related Papers

### 1. Vector-Based RAG (Comparison Baseline)

**HNSW (Hierarchical Navigable Small World)**
- **Citation:** Malkov & Yashunin (2018) - `malkov2018efficient`
- **Contribution:** State-of-the-art for approximate nearest neighbor search
- **STAR Difference:** HNSW requires GPU + 4-8GB RAM; STAR runs on 4GB laptop CPU
- **Where to Cite:** Section 4 (Complexity Analysis), Related Work

**FAISS (Facebook AI Similarity Search)**
- **Citation:** Johnson et al. (2019) - `johnson2019billion`
- **Contribution:** Billion-scale similarity search with GPUs
- **STAR Difference:** FAISS is GPU-dependent; STAR is CPU-only
- **Where to Cite:** Related Work (Vector-Based RAG section)

---

### 2. Graph-Based Memory Systems (Direct Comparisons)

**T-Retriever (Tree-based Hierarchical RAG)**
- **Citation:** Wei et al. (2026) - `wei2026tretriever`
- **Contribution:** Tree-based hierarchical retrieval for textual graphs
- **STAR Difference:** T-Retriever lacks temporal decay; STAR includes it as fundamental component
- **Where to Cite:** Related Work (Graph-Based Memory section)

**PersonalAI (Knowledge Graph for Personalized LLMs)**
- **Citation:** Menschikov et al. (2025) - `menschikov2025personalai`
- **Contribution:** Knowledge graph framework with hyper-edges for personalized agents
- **STAR Difference:** PersonalAI is framework-focused; STAR has real production validation (25M tokens)
- **Where to Cite:** Related Work (Graph-Based Memory section)

**TOBUGraph (Graph-based Personal Memory Retrieval)**
- **Citation:** Kashmira et al. (2024) - `tobugraph2024`
- **Contribution:** Knowledge Graph-Based Retrieval for Enhanced LLM Performance Beyond RAG
- **STAR Difference:** TOBUGraph uses LLM-based graph extraction; STAR uses deterministic physics-based scoring with temporal decay
- **Where to Cite:** Related Work (Graph-Based Memory section)

**Mem0 (Scalable Long-Term Memory)**
- **Citation:** Chhikara et al. (2025) - `mem02025`
- **Contribution:** Building Production-Ready AI Agents with Scalable Long-Term Memory
- **STAR Difference:** Mem0 is LLM-based and runs as a cloud service; STAR is local-first, deterministic, explainable, and CPU-only
- **Where to Cite:** Related Work (Graph-Based Memory section)

---

### 3. Personal AI Memory Systems (Contemporary Work)

**Second Me (AI-native Memory 2.0)**
- **Citation:** Wei et al. (2025) - `wei2025second`
- **Contribution:** LLM-based memory parameterization for personal knowledge
- **STAR Difference:** Second Me requires significant compute; STAR is deterministic, explainable, CPU-only
- **Where to Cite:** Related Work (Personal AI Memory section)

**Cognitive AI Framework 2.0**
- **Citation:** Salas-Guerra (2025) - `salas2025cognitive`
- **Contribution:** Governed cognitive AI architecture with managed memory persistence
- **STAR Difference:** STAR emphasizes local-first deployment with zero cloud dependencies
- **Where to Cite:** Related Work (Personal AI Memory section)

---

### 4. Foundational Work (Historical Context)

**SimHash (Near-Duplicate Detection)**
- **Citation:** Charikar (2002) - `charikar2002similar`
- **Contribution:** 64-bit fingerprinting for similarity estimation
- **STAR Usage:** O(1) deduplication via Hamming distance
- **Where to Cite:** Section 2.2 (Structural Gravity)

**PageRank (Graph Traversal)**
- **Citation:** Brin & Page (1998) - `brin1998anatomy`
- **Contribution:** Graph-based ranking via link analysis
- **STAR Usage:** Bipartite graph structure inspiration
- **Where to Cite:** Section 2.1 (Bipartite Graph)

**Temporal Information Retrieval**
- **Citation:** Kanhabua & Nørvåg (2008) - `kanhabua2008surviving`
- **Contribution:** Time-aware ranking for web archives
- **STAR Difference:** STAR embeds temporal decay multiplicatively (not additively)
- **Where to Cite:** Related Work (Temporal Information Retrieval section)

**Local-First Software**
- **Citation:** Haque et al. (2023) - `haque2023local`
- **Contribution:** User data ownership and offline capability principles
- **STAR Alignment:** Browser paradigm extends local-first to AI memory
- **Where to Cite:** Related Work (Local-First section)

---

## STAR's Unique Contributions

### 1. Unified Field Equation

**Novelty:** Multiplicative combination of three factors:
```
W(q,a) = |T(q) ∩ T(a)| · γ^(d(q,a)) × e^(-λΔt) × (1 - H/64)
```

**vs. Additive Scoring:** Most RAG systems use additive (BM25 + vector similarity). STAR's multiplicative approach means any zero factor eliminates noise.

### 2. Browser Paradigm

**Novelty:** "Streaming vs. downloading" analogy for AI memory

**Impact:** Makes complex architecture accessible to broad audience

### 3. Production Validation

**Novelty:** Real-world benchmarks on 25M tokens (not synthetic)

**Metrics:**
- 91MB chat history ingested in <3 minutes
- 280,000 molecules indexed
- <200ms p95 search latency
- 510MB idle memory (4GB laptop tested)

### 4. Explainable Retrieval

**Novelty:** Tag paths provide deterministic provenance

**vs. Vector Search:** "Close in embedding space" vs. "via 3 shared tags (2-hop)"

---

## Citation Guide

### In Whitepaper (star-whitepaper.tex)

**Section 2.1 (Bipartite Graph):**
```latex
Our bipartite structure draws inspiration from PageRank's graph model
\cite{brin1998anatomy}, adapted for personal knowledge graphs.
```

**Section 2.2 (Structural Gravity):**
```latex
SimHash enables O(1) deduplication via 64-bit fingerprinting
\cite{charikar2002similar}.
```

**Related Work Section:**
```latex
% Vector-Based RAG
HNSW \cite{malkov2018efficient} and FAISS \cite{johnson2019billion}...

% Graph-Based Memory
T-Retriever \cite{wei2026tretriever}... PersonalAI \cite{menschikov2025personalai}... TOBUGraph \cite{tobugraph2024}... Mem0 \cite{mem02025}...

% Personal AI Memory
Second Me \cite{wei2025second}... Cognitive AI \cite{salas2025cognitive}...

% Temporal Retrieval
Temporal decay in web archives \cite{kanhabua2008surviving}...

% Local-First
Local-first software movement \cite{haque2023local}...
```

### In Project Documentation

**README.md:**
```markdown
## Related Work

- **Second Me** (Wei et al., 2025) - Personal AI memory
- **TOBUGraph** (Kashmira et al., 2024) - Graph-based memory retrieval
- **Mem0** (Chhikara et al., 2025) - Scalable long-term memory
```

**specs/spec.md:**
```markdown
See [RESEARCH_LANDSCAPE.md](../docs/RESEARCH_LANDSCAPE.md) for comprehensive related work analysis.
```

---

## Competitive Positioning

| Paper | Similarity | STAR's Advantage |
|-------|------------|------------------|
| **TOBUGraph** | Graph-based memory | Deterministic scoring, specific temporal decay |
| **Mem0** | AI Agents & Long-term memory | Local-first, CPU-only, explainable vs cloud-based |
| **Second Me** | Personal AI memory | Simpler, deterministic, explainable, CPU-only |
| **PersonalAI** | Knowledge graphs | Real production validation (25M tokens) |
| **T-Retriever** | Graph-based RAG | Includes temporal decay |
| **HNSW/FAISS** | Retrieval baseline | 4GB RAM vs. 4-8GB, explainable vs. opaque |

---

## Bibliography

**See:** `docs/BIBLIOGRAPHY.bib` for complete BibTeX entries

**Key Citations (17 total):**
1. Charikar 2002 - SimHash
2. Brin & Page 1998 - PageRank
3. Malkov & Yashunin 2018 - HNSW
4. Johnson et al. 2019 - FAISS
5. Wei et al. 2026 - T-Retriever
6. Menschikov et al. 2025 - PersonalAI
7. Wei et al. 2025 - Second Me
8. Salas-Guerra 2025 - Cognitive AI
9. Kanhabua & Nørvåg 2008 - Temporal Retrieval
10. Haque et al. 2023 - Local-First Software
11. Lewis et al. 2020 - RAG
12. Guu et al. 2020 - REALM
13. Borgeaud et al. 2022 - RETRO
14. Karpukhin et al. 2020 - DPR
15. Reimers & Gurevych 2019 - Sentence-BERT
16. Kashmira et al. 2024 - TOBUGraph
17. Chhikara et al. 2025 - Mem0

---

## arXiv Categories

**Primary:** cs.IR (Information Retrieval)  
**Secondary:** cs.AI (Artificial Intelligence)  
**Tertiary:** cs.SE (Software Engineering)

**Keywords:** Information Retrieval, Graph-Based Search, Local-First AI, SimHash, Personal Knowledge Management, Explainable AI

---

## Future Research Directions

### Ablation Studies
- Evaluate each factor independently (tags only, tags+temporal, full STAR)
- Measure: Precision@K, MRR, user relevance ratings

### Formal HNSW Comparison
- Run FAISS HNSW on same dataset
- Compare: Recall@K, latency, memory usage, index build time

### User Study
- 3-5 users with different corpus sizes
- Before/after: manual search vs. STAR
- Metrics: Task completion time, satisfaction ratings

### Theoretical Analysis
- Prove O(k·d̄) complexity formally
- Analyze space complexity: O(|E|) for edges + O(|A|) for atoms

---

## Related Standards

- **Standard 086:** Dual-Strategy Search (algorithm specification)
- **Standard 113:** Automatic Max-Recall (trigger mechanism)
- **Standard 116:** Phoenix Protocol (backup/restore)
- **Standard 117:** arXiv Submission Workflow

---

**Maintained by:** Anchor Engine Research Team  
**Last Updated:** February 23, 2026  
**Next Review:** After arXiv submission
