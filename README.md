# Anchor Engine ⚓

**Deterministic semantic memory for LLMs – local-first, graph traversal, <1GB RAM**

[![GitHub release](https://img.shields.io/github/v/release/RSBalchII/anchor-engine-node)](https://github.com/RSBalchII/anchor-engine-node/releases)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.18841399.svg)](https://doi.org/10.5281/zenodo.18841399)

---

## Quick Start

### Try It in 5 Minutes

```bash
# 1. Clone & Install
git clone https://github.com/RSBalchII/anchor-engine-node.git
cd anchor-engine-node
pnpm install
pnpm build

# 2. Start the engine
pnpm start

# 3. Open your browser
open http://localhost:3160
```

That's it! You now have a sovereign memory system for your LLMs.

### What Can You Do Now?

1. **Ingest your data** - Paste text, upload files, or point to folders
2. **Search your memory** - Natural language queries, instant results
3. **Connect your LLM** - Use via MCP (Claude, Cursor, Qwen Code) or REST API

---

## Installation Guide

### Prerequisites

- **Node.js** v18+ (v20+ recommended)
- **PNPM** package manager (`npm install -g pnpm`)
- **1GB RAM** minimum (4GB+ recommended)
- **10GB** free storage space

### Method 1: From Source (Recommended)

```bash
git clone https://github.com/RSBalchII/anchor-engine-node.git
cd anchor-engine-node
pnpm install
pnpm build
pnpm start
```

### Method 2: Docker

```bash
# Build
docker build -t anchor-engine:latest .

# Run
docker run -d -p 3160:3160 --name anchor anchor-engine:latest
```

### Method 3: Docker Compose (Best for Production)

```bash
docker-compose up -d
docker-compose logs -f  # View logs
```

---

## Usage Guide

### Step 1: Ingest Your Data

**Option A: Web UI (Easiest)**
1. Open http://localhost:3160
2. Click "Manage Paths" → Add folders to watch
3. Files auto-ingest into `inbox/` or `external-inbox/`

**Option B: Paste Text Directly**
1. Open Web UI → "Paste & Ingest" tab
2. Paste any text (notes, chats, articles)
3. Choose bucket: `inbox` (your content) or `external-inbox` (external content)
4. Click "Ingest"

**Option C: API**
```bash
curl -X POST http://localhost:3160/v1/research/upload-raw \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Your text here...",
    "filename": "notes.md",
    "bucket": "inbox"
  }'
```

### Step 2: Search Your Memory

**Via Web UI:**
- Type natural language queries
- Adjust token budget slider
- Filter by buckets/tags

**Via API:**
```bash
curl -X POST http://localhost:3160/v1/memory/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What did we discuss about OAuth?",
    "token_budget": 2048
  }'
```

**Via MCP (Claude, Cursor, Qwen Code):**
```
/anchor_query query="What did we discuss about OAuth?"
```

### Step 3: Connect Your LLM

**For Claude Desktop:**
```json
{
  "mcpServers": {
    "anchor": {
      "command": "node",
      "args": ["/path/to/anchor-engine-node/mcp-server/dist/index.js"],
      "env": {
        "ANCHOR_API_URL": "http://localhost:3160"
      }
    }
  }
}
```

**For Cursor:**
Add to `~/.cursor/mcp.json` (same format as above)

**For Qwen Code:**
Add to your MCP config or `.qwen/settings.json`

---

## Common Tasks

### Backup Your Memory
```bash
# Via Web UI
Click "Restore Backup" → "Create Backup"

# Via API
curl -X POST http://localhost:3160/v1/backup
```

### Distill Knowledge (Compress Corpus)
```bash
# Via Web UI
Click "Distill" → Enter seed topic → Run

# Via API
curl -X POST http://localhost:3160/v1/memory/distill \
  -H "Content-Type: application/json" \
  -d '{"seed": {"query": "AI agents"}, "radius": 3}'
```

### Check System Status
```bash
curl http://localhost:3160/health
```

---

## Troubleshooting

### Engine Won't Start
```bash
# Check if port 3160 is in use
lsof -i :3160

# Kill existing process
kill -9 <PID>

# Restart
pnpm start
```

### Out of Memory
```bash
# Reduce concurrent operations in user_settings.json
{
  "adaptive_concurrency": {
    "environment": "low_memory"
  }
}
```

### Can't Find My Data
1. Check ingestion logs: `engine/logs/server.log`
2. Verify paths in "Manage Paths"
3. Try manual ingest via "Paste & Ingest"

---

## Philosophy: AI Memory Should Work Like Your Brain

Human memory is remarkably efficient. It runs on ~20 watts, forgets irrelevant details, and over time clarifies core truths rather than drowning in noise. It doesn't store raw experiences—it stores *patterns*, *relationships*, and *meaning*.

Most AI memory systems do the opposite: they hoard data, brute‑force compute similarity, and require massive infrastructure.

**Anchor Engine was built on a different premise: AI memory should work like the human mind—lightweight, connected, and self‑clarifying.**

### Five Core Principles

| Principle | What It Means | How Anchor Implements It |
|-----------|---------------|--------------------------|
| **🧠 Forgetting is a feature** | The brain forgets constantly, leaving only what matters | `distill:` command removes redundancy; temporal decay |
| **🔗 Meaning lives in relationships** | We store how concepts connect, not isolated facts | Graph model with typed edges; STAR algorithm |
| **⚡ Low power, high efficiency** | The brain achieves its magic on ~20 watts | Pointer‑only database; <1GB RAM |
| **💎 Clarity through distillation** | Memory builds higher‑level abstractions over time | Decision Records v2.0 extract the *why* |
| **🔍 Explainability builds trust** | You know *why* a memory came to mind | Provenance tracking; receipts with timestamps |

---

## Technical Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         YOU                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
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

### Data Model: Compound → Molecule → Atom

- **Compound:** A source file (chat export, document, code file)
- **Molecule:** Semantic chunk with byte-offset pointers
- **Atom:** Tag/concept only (NOT content itself)

**Key Insight:** Content lives in `mirrored_brain/` filesystem. Database stores only pointers → disposable, rebuildable index.

### STAR Algorithm

Semantic Traversal And Associative Retrieval walks the graph deterministically using:
- **Semantic Gravity:** Shared tag count × graph distance damping
- **Temporal Decay:** Recent memories exert stronger pull (half-life ≈115 min)
- **Structural Gravity:** SimHash proximity (64-bit fingerprints)

Result: O(k·d̄) retrieval vs O(n log n) for vector ANN.

---

## Performance Benchmarks

### Production Numbers

- **Dataset:** ~25M tokens (~100MB chat history)
- **Restore Speed:** 281,690 atoms in 13.8 min (340 atoms/sec)
- **Search Latency:** <200ms (p95)
- **Memory Usage:** <1GB peak, <600MB typical
- **Ingestion:** ~25M tokens in <5 minutes

### v4.5.4 Improvements

- **Backup Restore:** 17x faster (14.4s → 847ms for 5000 atoms)
- **TagAuditor:** 11x faster (500ms → 45ms for 100 atoms)
- **Master Tags:** Instant reads with in-memory cache

Full benchmarks: [whitepaper](docs/STAR_Whitepaper.md)

---

## API Reference

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/memory/search` | POST | Semantic search |
| `/v1/memory/explore` | POST | Graph exploration |
| `/v1/memory/distill` | POST | Radial distillation |
| `/v1/files/read` | GET | Read files by line range |
| `/v1/buckets` | GET/POST | Manage buckets |
| `/v1/tags` | GET | List tags |
| `/v1/backup` | POST | Create backup |
| `/v1/backup/restore` | POST | Restore from backup |
| `/v1/stats` | GET | System statistics |

Full API docs: [`specs/API-ROUTE-MAP.md`](specs/API-ROUTE-MAP.md)

---

## MCP Tools

| Tool | Description |
|------|-------------|
| `anchor_query` | Search memory graph |
| `anchor_distill` | Run radial distillation |
| `anchor_illuminate` | BFS graph traversal |
| `anchor_read_file` | Read files with line ranges |
| `anchor_list_compounds` | List available compounds |
| `anchor_get_stats` | Get system statistics |
| `anchor_ingest_text` | Ingest raw text (opt-in) |
| `anchor_ingest_file` | Ingest file from filesystem (opt-in) |

Full MCP docs: [`mcp-server/README.md`](mcp-server/README.md)

---

## Built with Standards

Anchor Engine follows rigorous architecture standards:

| Standard | Description |
|----------|-------------|
| **001** | Memory-Safe File Ingestion |
| **004** | Streaming Search |
| **005** | Adaptive Concurrency Control |
| **008** | Radial Distillation |
| **010** | Radial Distillation v2.0 (Decision Records) |
| **126** | Pointer-Only Index Design |
| **128** | Illuminate BFS Traversal |

Full standards: [`specs/current-standards/`](specs/current-standards/)

---

## The Dogfooding Story

Anchor Engine wasn't built in a vacuum. The entire codebase was developed **using Anchor Engine as its own memory layer**. Every decision, bug fix, and refactor was stored and retrieved by the engine itself.

What would have taken months of context-switching became continuous progress. We could hold complexity in our heads because the engine held it for us.

---

## Documentation

- **[Whitepaper](docs/STAR_Whitepaper.md)** – STAR algorithm deep dive
- **[Architecture Diagrams](docs/ARCHITECTURE_DIAGRAMS.md)** – Visual overview
- **[API Reference](specs/API-ROUTE-MAP.md)** – All endpoints
- **[Standards](specs/current-standards/)** – Design documents
- **[MCP Server](mcp-server/README.md)** – MCP integration guide

---

## Community & Contributing

We're building in the open and welcome your input!

- **Star the repo** – Helps others find it
- **Open an issue** – Bugs, features, questions
- **Start a discussion** – Share use cases
- **Contribute** – PRs welcome!

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for guidelines.

---

## License

AGPL-3.0 – see [LICENSE](LICENSE).

---

*Your AI's anchor to reality.* ⚓
