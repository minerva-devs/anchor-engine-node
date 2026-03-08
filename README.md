# Anchor Engine ⚓

**Deterministic semantic memory for LLMs – local-first, graph traversal, <3GB RAM**

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

## Why Anchor Engine?

| Feature | What it means for you |
|--------|------------------------|
| **Deterministic** | Same query → same result, every time. No embedding drift, no probabilistic surprises. |
| **Inspectable** | You can trace exactly why something was retrieved. Every edge in the graph has a reason. |
| **Local‑first** | Runs entirely offline on your hardware. No API calls, no data leaving your machine. |
| **Model‑agnostic** | Works with any LLM – local models, cloud APIs, or anything in between. |
| **Lightweight** | <3GB RAM, runs on a Raspberry Pi or a $200 mini PC. |
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

## Performance Numbers

- **Memory usage:** <3GB RAM (tested on 500M+ token corpora)
- **Search latency:** <200ms for typical queries (p95)
- **Ingestion:** 25M tokens in under 5 minutes
- **Hardware:** Runs on Raspberry Pi 4, $200 mini PCs, and your laptop

Benchmarks against vector search are available in the [whitepaper](docs/STAR_Whitepaper.md).

---

## The Dogfooding Story

Anchor Engine wasn't built in a vacuum. The entire codebase was developed **using Anchor Engine as its own memory layer**. Every decision, every bug fix, every refactor was stored and retrieved by the engine itself. The recursion is real – what would have taken months of context‑switching became continuous progress. We could hold complexity in our heads because the engine held it for us.

---

## Quick Start

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

## Use Cases

- **AI agents** – give your agents persistent memory across sessions
- **Customer support bots** – remember past interactions without cloud costs
- **Personal assistants** – learn user preferences over time
- **Coding copilots** – maintain context across a whole project
- **Research tools** – compress large corpora into navigable graphs

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