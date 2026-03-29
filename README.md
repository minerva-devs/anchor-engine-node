# Anchor Engine ⚓

**Deterministic semantic memory for LLMs – local-first, graph traversal, <1GB RAM**

[![GitHub release](https://img.shields.io/github/v/release/RSBalchII/anchor-engine-node)](https://github.com/RSBalchII/anchor-engine-node/releases)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.18841399.svg)](https://doi.org/10.5281/zenodo.18841399)

---

## 🌟 Why Anchor Engine?

Modern AI memory is broken.

Vector databases demand GPUs, gigabytes of RAM, and cloud infrastructure. They're opaque, expensive, and fundamentally incompatible with personal, local‑first AI.

**Anchor Engine takes a different path.**

It's a **deterministic, explainable, CPU‑only memory engine** that runs on anything—from a $200 laptop to a workstation—and retrieves context using a physics‑inspired graph algorithm instead of dense vectors.

If you want:
- **Local‑first AI** – your data stays yours
- **Explainable retrieval** – know *why* something was returned
- **Deterministic results** – same query, same answer, every time
- **Zero cloud dependency** – no API keys, no servers
- **<1GB RAM usage** – runs alongside your browser
- **High‑speed ingestion** – 100MB in minutes

…then Anchor Engine is built for you.

---

## ⚡ Quick Start (One-Shot Install)

### Prerequisites
- **Node.js 18+** ([Download](https://nodejs.org/))
- **pnpm** (`npm install -g pnpm`)

### Linux / Termux / WSL

```bash
# 1. Clone repository
git clone https://github.com/RSBalchII/anchor-engine-node.git
cd anchor-engine-node

# 2. Run installer
chmod +x install.sh
./install.sh

# 3. Start the engine
pnpm start
```

### macOS

```bash
# 1. Clone repository
git clone https://github.com/RSBalchII/anchor-engine-node.git
cd anchor-engine-node

# 2. Run installer
chmod +x install-macos.sh
./install-macos.sh

# 3. Start the engine
pnpm start
```

### Windows (PowerShell)

```powershell
# 1. Clone repository
git clone https://github.com/RSBalchII/anchor-engine-node.git
cd anchor-engine-node

# 2. Run installer (may need ExecutionPolicy bypass)
PowerShell -ExecutionPolicy Bypass -File install.ps1

# 3. Start the engine
pnpm start
```

**That's it!** Open http://localhost:3160 in your browser.

### Manual Install (If Script Fails)

```bash
# 1. Clone & Install
git clone https://github.com/RSBalchII/anchor-engine-node.git
cd anchor-engine-node
pnpm install
pnpm build:all

# 2. Create directories
mkdir -p notebook/inbox notebook/external-inbox .anchor/mirrored_brain

# 3. Configure (edit user_settings.json)
cp user_settings.json.template user_settings.json

# 4. Start
pnpm start
```

That's it! You now have a sovereign memory system for your LLM.

### Data Directory Structure

All user data is stored in the project root:

| Directory | Role | Persistence |
|-----------|------|-------------|
| **`notebook/inbox/`** | **Source of Truth** ✅ | Permanent - your sovereign content (3.0x boost) |
| **`notebook/external-inbox/`** | **Source of Truth** ✅ | Permanent - external content (1.0x boost) |
| **`.anchor/mirrored_brain/`** | Rebuildable Cache 🔄 | Wiped on startup - cleaned content mirror |
| **`engine/context_data/`** | Ephemeral Index 🔄 | Wiped on startup - PGlite database |

**Key Principle:** The database is ephemeral and rebuilt from `notebook/inbox/` on every startup. Your data is safe in the source of truth directories.

**Configuration:** All settings centralized in `user_settings.json` at project root.

**Watchdog:** Disabled by default. Start manually from Settings UI when ready to ingest.

**Note:** `notebook/` and `.anchor/` directories are gitignored to protect your data. See [Standard 020](specs/current-standards/020-ephemeral-database.md) for details.

---

## 📊 Anchor Engine vs. Vector RAG

| Feature | Anchor Engine | Vector RAG |
|---------|---------------|------------|
| **Hardware** | CPU‑only | GPU preferred |
| **RAM Usage** | <1GB | 4–8GB |
| **Explainability** | Native (tags, hops, decay) | None (black box) |
| **Deterministic** | ✅ Yes | ❌ No |
| **Cloud Required** | ❌ No | Often |
| **Retrieval Complexity** | O(k·d̄) linear | O(n log n) |
| **License** | AGPL-3.0 (open) | Varies (often proprietary) |

---

## 🧠 The STAR Algorithm

Anchor Engine uses **STAR** (Semantic Temporal Associative Retrieval)—a physics‑inspired scoring equation that combines:

```
W(q,a) = |T(q) ∩ T(a)| · γ^d(q,a)  ×  e^(−λΔt)  ×  (1 − H(h_q, h_a)/64)
         ↑ Semantic Gravity         ↑ Temporal Decay   ↑ Structural Gravity
```

| Component | What It Does |
|-----------|--------------|
| **Semantic Gravity** | Shared tags × hop‑distance damping (γ = 0.85) |
| **Temporal Decay** | Recent memories pull harder (half-life ~115 min) |
| **Structural Gravity** | SimHash proximity (64-bit fingerprints) |

**Result:** O(k·d̄) retrieval—dramatically faster than vector ANN for personal datasets. Every atom includes **provenance**: shared tags, hop distance, recency, and byte‑range pointers.

---

## ⚓ Why "Anchor"?

> **Drop a query into your memory graph.**  
> **The Anchor finds the semantic bottom.**  
> **The chain plays out to your chosen radius.**  
> **What's retrieved is what's relevant—nothing more, nothing less.**  
> **Same anchor, same spot, same result. Every time.**  
> **This isn't a metaphor. It's the algorithm.**

| Anchor Quality | How It Maps to STAR |
|----------------|---------------------|
| **Drops to a point** | Query finds seed atoms (anchor discovery) |
| **Defines a radius** | Chain length = token budget (hop distance) |
| **Holds against drift** | Deterministic retrieval (no semantic drift) |
| **Connects to the ship** | Retrieved context → LLM (your ship) |
| **Works in deep water** | Scales from 10MB to 10GB graphs |

The name isn't marketing. It's architecture.

---

## 📥 Ingest Your Data

### Option 1: Web UI (Easiest)
1. Open http://localhost:3160
2. Click **"Manage Paths"** → Add folders to watch
3. Or use **"Paste & Ingest"** tab for quick text

### Option 2: API
```bash
curl -X POST http://localhost:3160/v1/research/upload-raw \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Your text here...",
    "filename": "notes.md",
    "bucket": "inbox"
  }'
```

### Option 3: MCP (Claude, Cursor, Qwen Code)
```
/anchor_ingest_text content="Meeting notes..." filename="meeting.md" bucket="inbox"
```

---

## 🔍 Search Your Memory

### Web UI
- Natural language queries
- Adjustable token budget slider
- Filter by buckets/tags

### API
```bash
curl -X POST http://localhost:3160/v1/memory/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What did we discuss about OAuth?",
    "token_budget": 2048
  }'
```

### MCP Tools
```
/anchor_query query="OAuth authentication setup"
/anchor_search_index query="career planning"
/anchor_fetch_session session_id="abc-123"
```

---

## 🧠 MCP Server – Memory for Your AI Agent

Anchor Engine can act as an **MCP (Model Context Protocol) server**, giving any MCP‑compatible agent persistent, deterministic memory.

### Install

```bash
# Install globally for CLI access
npm install -g @rbalchii/anchor-engine

# Or use npx directly
npx @rbalchii/anchor-engine
```

### Start the MCP Server

```bash
# Option 1: Use the dedicated MCP binary
anchor-mcp

# Option 2: Start via main CLI
anchor mcp

# Option 3: Run directly with npx
npx anchor-mcp
```

The server runs in **stdio mode**, communicating directly with your AI agent.

### Available Tools

| Tool | Description |
|------|-------------|
| `anchor_query` | Search memory with token budget and provenance tracking |
| `anchor_distill` | Create checkpoint summaries from sessions |
| `anchor_illuminate` | BFS graph traversal for exploration |
| `anchor_read_file` | Read files by line ranges (token-efficient) |
| `anchor_list_compounds` | List available source files |
| `anchor_get_stats` | Check engine health and database stats |
| `anchor_ingest_text` | Add raw text content (opt-in, disabled by default) |
| `anchor_ingest_file` | Ingest files from filesystem (opt-in) |

### Configuration

Create a `user_settings.json` in your project root:

```json
{
  "server": {
    "port": 3160,
    "api_key": "your-secret-key"
  },
  "mcp": {
    "allow_write_operations": false,
    "default_bucket_for_writes": "external-inbox",
    "rate_limit_requests_per_minute": 60,
    "max_query_results": 50
  }
}
```

Or set environment variables:
```bash
export ANCHOR_API_URL="http://localhost:3160"
export ANCHOR_API_KEY="your-secret-key"
```

### Agent Examples

#### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "anchor": {
      "command": "npx",
      "args": ["@rbalchii/anchor-engine", "mcp"]
    }
  }
}
```

Or if installed globally:
```json
{
  "mcpServers": {
    "anchor": {
      "command": "anchor-mcp"
    }
  }
}
```

#### Qwen Code

Qwen Code automatically detects MCP servers. Just run:
```bash
anchor-mcp
```

Then use tools in chat:
```
/anchor_query query="What did we decide about authentication?"
```

#### Cursor

Add to Cursor MCP settings:
```json
{
  "command": "anchor-mcp",
  "env": {
    "ANCHOR_API_URL": "http://localhost:3160"
  }
}
```

### Quick-Start Demo (2 Minutes)

```bash
# 1. Start the MCP server
anchor-mcp &

# 2. Ingest some text (via API for demo)
curl -X POST http://localhost:3160/v1/research/upload-raw \
  -H "Content-Type: application/json" \
  -d '{
    "content": "The STAR algorithm uses physics-based scoring with temporal decay.",
    "filename": "star-notes.md",
    "bucket": "inbox"
  }'

# 3. Search for it
curl -X POST http://localhost:3160/v1/memory/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "STAR algorithm physics scoring",
    "token_budget": 1024
  }'

# 4. Or use MCP tools in your AI agent
# In Claude/Qwen: "/anchor_query query=STAR algorithm"
```

### Security

- **Write operations disabled by default** – Must explicitly enable in settings
- **Rate limiting** – Configurable requests per minute
- **API key authentication** – Optional but recommended
- **Localhost restriction** – Only accept local connections by default
- **Bucket safety** – Defaults to `external-inbox` for untrusted content

See full documentation: **[mcp-server/README.md](mcp-server/README.md)**

---

## 🏛️ Our Philosophy: AI Memory Should Work Like Your Brain

Human memory is remarkably efficient. It runs on ~20 watts, forgets irrelevant details, and over time clarifies core truths rather than drowning in noise. It doesn't store raw experiences—it stores *patterns*, *relationships*, and *meaning*.

Most AI memory systems do the opposite: they hoard data, brute‑force compute similarity, and require massive infrastructure.

**Anchor Engine was built on a different premise: AI memory should work like the human mind—lightweight, connected, and self‑clarifying.**

| Principle | What It Means | How Anchor Implements It |
|-----------|---------------|--------------------------|
| **🧠 Forgetting is a feature** | The brain forgets constantly, leaving only what matters | `distill:` command removes redundancy; temporal decay |
| **🔗 Meaning lives in relationships** | We store how concepts connect, not isolated facts | Graph model with typed edges; STAR algorithm |
| **⚡ Low power, high efficiency** | The brain achieves its magic on ~20 watts | Pointer‑only database; content on disk; <1GB RAM |
| **💎 Clarity through distillation** | Memory builds higher‑level abstractions over time | Decision Records v2.0 extract the *why* |
| **🔍 Explainability builds trust** | You know *why* a memory came to mind | Provenance tracking; receipts with timestamps |

> **Why This Matters:** Most AI memory systems are built for **scale**, not for **sense**. Anchor Engine is designed for **sense‑making**—for agents that need to remember not just *what* happened, but *why*, and to get *clearer* over time.

---

## 🏗️ Architecture at a Glance

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

> ### ⚠️ CRITICAL: Database Stores POINTERS ONLY - NO CONTENT EVER
>
> **Database NEVER stores:**
> - ❌ `molecules.content` - NO full text content
> - ❌ `compounds.compound_body` - NO document bodies
> - ❌ `atoms.content` - NO content blobs
>
> **Database stores ONLY:**
> - ✅ `file_path` - path to file in `mirrored_brain/`
> - ✅ `start_byte`, `end_byte` - byte offsets for content extraction
> - ✅ `tags`, `timestamp`, `provenance` - metadata
>
> **Why?** Filesystem reading is **4x faster** than database reading for radial inflation.
> Content is read directly from `mirrored_brain/` using byte offsets—no database query overhead.
>
> This makes the database **disposable and rebuildable**—wipe it and restore in minutes.

---

## 📊 Benchmarks (Real Production Data)

**Dataset:** 91MB chat history (~25M tokens)

| Metric | Result |
|--------|--------|
| **Molecules** | 280,000 |
| **Atoms** | 151,876 |
| **Files** | 436 |
| **Ingestion Time** | 178 seconds |
| **Search Latency (p95)** | <200ms |
| **Memory (idle)** | ~600MB |
| **Memory (peak)** | ~1.6GB |
| **Restore Speed** | 281,690 atoms in 13.8 min |

**Hardware:** AMD Ryzen / Intel i7, 16GB RAM, NVMe SSD, no GPU.

---

## 🛠️ What's New in v4.8.0

### MCP Write Operations
- **`anchor_ingest_text`** - Ingest raw text directly
- **`anchor_ingest_file`** - Ingest files from filesystem
- Security toggle (opt-in via `user_settings.json`)

### Session Index
- **`anchor_search_index`** - Fast chat session lookup
- **`anchor_fetch_session`** - Targeted session retrieval
- Two-tier memory retrieval

### Web UI Improvements
- **Paste & Ingest** tab - Quick text ingestion
- Version badge (v4.8.0)
- Bucket selector (inbox vs external-inbox)

### Documentation Overhaul
- 5 new docs (API, Deployment, Troubleshooting, Source Overview, Testing)
- Philosophy embedded throughout
- 7 redundant files archived

---

## 📚 Documentation

### Getting Started
- **[Quick Start](#-quick-start-5-minutes)** - Install & first query
- **[docs/API.md](docs/API.md)** - Complete API reference
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Deployment guide (local, Docker, VPS, K8s)
- **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Common issues & fixes

### Deep Dive
- **[docs/whitepaper.md](docs/whitepaper.md)** - STAR algorithm whitepaper
- **[specs/spec.md](specs/spec.md)** - System specification with diagrams
- **[specs/current-standards/](specs/current-standards/)** - Active standards (001-010)
- **[engine/src/README.md](engine/src/README.md)** - Source code overview

### Integration
- **[mcp-server/README.md](mcp-server/README.md)** - MCP integration (Claude, Cursor, Qwen)
- **[tests/README.md](tests/README.md)** - Testing guide
- **[benchmarks/README.md](benchmarks/README.md)** - Performance benchmarks

---

## 🤝 Contributing

We're building in the open and welcome your input!

- **Star the repo** – Helps others find it
- **Open an issue** – Bugs, features, questions
- **Start a discussion** – Share use cases
- **Contribute** – PRs welcome!

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for guidelines.

**Community Health:**
- [`CODEOWNERS`](.github/CODEOWNERS) - Automatic reviewer assignment
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) - Community standards
- [`CONTRIBUTING.md`](CONTRIBUTING.md) - Contribution guide

---

## 📜 License

AGPL-3.0 – see [LICENSE](LICENSE).

---

## 🙏 Acknowledgments

Built with ❤️ by Robert Balch II and contributors.

**Citation:**
```bibtex
@software{anchor_engine,
  title = {STAR: Semantic Temporal Associative Retrieval},
  author = {Balch II, R.S.},
  version = {4.8.0},
  date = {2026-03-18},
  url = {https://github.com/RSBalchII/anchor-engine-node},
  doi = {10.5281/zenodo.18841399}
}
```

---

*Your AI's anchor to reality.* ⚓
