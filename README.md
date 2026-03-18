# Anchor Engine ⚓

**Deterministic semantic memory for LLMs – local-first, graph traversal, <1GB RAM**

[![GitHub release](https://img.shields.io/github/v/release/RSBalchII/anchor-engine-node)](https://github.com/RSBalchII/anchor-engine-node/releases)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.18841399.svg)](https://doi.org/10.5281/zenodo.18841399)

---

## The Problem

LLMs forget everything between conversations. Context windows help, but they're ephemeral and expensive. Vector search is fuzzy, opaque, and often requires GPUs or cloud APIs. Fine-tuning causes catastrophic forgetting. Graph RAG turns into spaghetti.

The result? Your agents, assistants, and copilots start every conversation with amnesia.

## The Solution: Anchor Engine

Anchor Engine is a **deterministic memory layer** that lives **outside** your LLM. It gives any model persistent, queryable state across sessions—without cloud dependencies, without embedding drift, and without black‑box similarity scores.

Instead of vectors, we use **graph traversal**. Instead of guessing, we give you **receipts**. Instead of sending your data to the cloud, we keep it **local**.

---

## Our Philosophy: AI Memory Should Work Like Your Brain

Human memory is remarkably efficient. It runs on ~20 watts, forgets irrelevant details, and over time clarifies core truths rather than drowning in noise. It doesn't store raw experiences—it stores *patterns*, *relationships*, and *meaning*. When you remember a conversation, you don't replay every word; you recall the gist, the emotional tone, the key decisions. The details fade, but the signal strengthens.

Most AI memory systems do the opposite: they hoard data, brute‑force compute similarity, and require massive infrastructure. They simulate understanding through volume, not structure.

**Anchor Engine was built on a different premise: AI memory should work like the human mind—lightweight, connected, and self‑clarifying.**

### Five Core Principles

| Principle | What It Means | How Anchor Implements It |
|-----------|---------------|--------------------------|
| **🧠 Forgetting is a feature** | The brain forgets constantly, leaving only what matters | `distill:` command removes redundancy; temporal decay lets noise fade |
| **🔗 Meaning lives in relationships** | We store how concepts connect, not isolated facts | Graph model with typed edges; STAR algorithm walks relationships |
| **⚡ Low power, high efficiency** | The brain achieves its magic on ~20 watts | Pointer‑only database; content stays on disk; <1GB RAM |
| **💎 Clarity through distillation** | Memory builds higher‑level abstractions over time | Decision Records v2.0 extract the *why* behind decisions |
| **🔍 Explainability builds trust** | You know *why* a memory came to mind | Provenance tracking; receipts show source files and timestamps |

### Why This Matters

Most AI memory systems are built for **scale**, not for **sense**. They assume that more data + more compute = better memory. But that's not how intelligence works. The brain doesn't scale by adding neurons; it scales by refining connections.

Anchor Engine is designed for **sense‑making**. It's for agents that need to remember not just *what* happened, but *why*, and to get *clearer* over time. It's for running on your phone, in your pocket, alongside your life.

**This philosophy isn't an afterthought—it's the foundation.** Every line of code, every standard, every design decision flows from it.

---

## Why Anchor Engine?

| Feature | What it means for you |
|--------|------------------------|
| **Deterministic** | Same query → same result, every time. No embedding drift, no probabilistic surprises. |
| **Inspectable** | You can trace exactly why something was retrieved. Every edge in the graph has a reason. |
| **Local‑first** | Runs entirely offline on your hardware. No API calls, no data leaving your machine. |
| **Model‑agnostic** | Works with any LLM – local models, cloud APIs, or anything in between. |
| **Lightweight** | <1GB RAM, runs on a Raspberry Pi or a $200 mini PC. |
| **Streaming** | Memory-efficient result streaming prevents OOM on large searches. Results arrive progressively. |
| **Cross-Platform** | Built on PGlite (WASM PostgreSQL), it requires zero native compilation. Identical behavior on ARM64, x64, Linux, and macOS. |
| **Open source** | AGPL‑3.0 – no lock‑in, no license tracking, no proprietary binaries. |
| **Recursive** | Used to build itself – if it's good enough for its own development, it's good enough for yours. |

---

## How It Works

### 1. Atomization

We break your text into a lightweight graph of concepts and relationships. This is **not** exhaustive extraction like Kanon 2 – it's just enough structure to make retrieval useful and portable.

For example:  
`"Apple announced M3 chips with 15% faster GPU performance"`  
→ Nodes: `[Apple, M3, GPU]`  
→ Edges: `[announced, has-performance]`

### 2. STAR Algorithm (Semantic Traversal And Associative Retrieval)

When you query, we don't compute cosine similarity – we **walk the graph** deterministically. The result is a set of context blocks that are guaranteed to be connected to your query, with no fuzzy matching.

### 3. Illuminate (Graph Exploration)

Need to see the "spine" of your corpus? Use `illuminate:` to perform a breadth‑first traversal from any seed concept. Results include hub‑ranked scores and timestamps, so you can reconstruct the narrative.

---

## Technical Overview

### Data Model: Compound → Molecule → Atom

To maintain speed and reduce database bloat, we designed our data model around pointers, not blobs:

- **Compound:** A source file (e.g., a chat export, document, or code file).
- **Molecule:** A semantic chunk of that file with byte‑offset pointers.
- **Atom:** A tag or concept, NOT the actual content itself.

**Key Insight:** Content lives in the `mirrored_brain/` filesystem. The database only stores pointers (byte offsets + metadata). This makes the database a **disposable, rebuildable index** that can be wiped and re-hydrated quickly.

### Zero-Compilation Deployment

We chose **PGlite (WASM-based PostgreSQL)** because it eliminates native compilation headaches and runs everywhere Node.js does. You get the power of PostgreSQL’s `tsvector`/`tsquery` full-text search and structured data without managing a standalone database server.

---

## Performance Numbers

We built Anchor Engine to handle real-world scale without needing a server rack.

### v4.5.4 Improvements

**Backup Restore:** 17x faster with bulk insert (14.4s → 847ms for 5000 atoms)

**TagAuditor:** 11x faster with N+1 query resolution (500ms → 45ms for 100 atoms)

**Master Tags:** Instant reads with in-memory cache + file watcher invalidation

### Production Benchmarks

- **Dataset Size:** Tested on ~25M tokens (~100MB chat history corpus)
- **Restore Speed:** Restored 281,690 atoms in 13.8 minutes (340 atoms/second)
- **Search Latency:** <200ms for typical queries (p95)
- **Memory Usage:** <1GB RAM peak, <600MB typical
- **Ingestion Speed:** 8-15ms per chunk cleaning time, ~25M tokens in under 5 minutes

Benchmarks against vector search are available in the [whitepaper](docs/STAR_Whitepaper.md).

---

## The Dogfooding Story

Anchor Engine wasn't built in a vacuum. The entire codebase was developed **using Anchor Engine as its own memory layer**. Every decision, every bug fix, every refactor was stored and retrieved by the engine itself. The recursion is real – what would have taken months of context‑switching became continuous progress. We could hold complexity in our heads because the engine held it for us.

---

## Quick Start

### Requirements
- Node.js v18+ (v20+ recommended)
- PNPM package manager
- Minimum 1GB RAM (4GB+ recommended)
- 10GB free storage space

```bash
git clone https://github.com/RSBalchII/anchor-engine-node.git
cd anchor-engine-node
pnpm install
pnpm build
pnpm start
```

Then open `http://localhost:3160` and start ingesting your data.  
Full instructions in the [docs](docs/).

---

## Docker Deployment

For those who prefer containerized environments, we've got you covered.

### Quick Start with Docker

```bash
# Build the Docker image
docker build -t anchor-engine:latest .

# Run the container
docker run -d -p 3160:3160 --name anchor anchor-engine:latest
```

### Docker Compose (Recommended)

Using Docker Compose mounts persistent storage and your ingestion folders automatically.

```bash
# Start with persistent storage and inbox mounted
docker-compose up -d

# View logs
docker-compose logs -f

# Stop and remove data volume
docker-compose down -v
```

---

## Use Cases

- **AI agents** – give your agents persistent memory across sessions
- **Customer support bots** – remember past interactions without cloud costs
- **Personal assistants** – learn user preferences over time
- **Coding copilots** – maintain context across a whole project
- **Research tools** – compress large corpora into navigable graphs

---

## Built with Standards

Anchor Engine is built with rigorous architecture standards to ensure predictability and maintainability. You can review our active design documents in the [`specs/standards/`](specs/standards/) directory.

| Standard | Description |
|----------|-------------|
| **104** | Universal Semantic Search |
| **110** | Ephemeral Index (Disposable database pattern) |
| **094** | Smart Search Protocol |
| **065** | Graph Associative Retrieval |

---

## Documentation

- [Whitepaper](docs/STAR_Whitepaper.md) – deep dive into the STAR algorithm and benchmarks
- [Architecture Diagrams](docs/ARCHITECTURE_DIAGRAMS.md) – visual overview
- [API Reference](docs/api.md) – all endpoints
- [Standards](specs/standards/) – detailed design documents

---

## Community & Feedback

We're building this in the open and would love your input. If you've hit the walls of fuzzy retrieval, context limits, or cloud dependency – give Anchor Engine a spin.

- **Star the repo** – it helps others find it
- **Open an issue** – bug reports, feature requests, questions
- **Start a discussion** – share your use case, ask for integrations
- **Contribute** – PRs welcome!

We're especially interested in feedback from people building:

- RAG systems that need more reliability
- Local AI tools that must stay offline
- Agent frameworks that need persistent memory
- Anything where "probabilistic" isn't good enough

---

## License

AGPL-3.0 – see [LICENSE](LICENSE).

---

## Acknowledgments

Built with ❤️ by Robert Balch II and contributors.  
Inspired by the tireless experiments of the r/LocalLLaMA and r/aiagents communities.

---

*Your AI's anchor to reality.* ⚓
