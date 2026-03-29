# Anchor Engine - Documentation Index

**Version:** 4.8.0 | **Updated:** March 18, 2026 | **Status:** ✅ Production Ready

---

## 📚 Quick Navigation

### Getting Started
- **[README.md](../README.md)** - Quick start, installation, usage guide
- **[CHANGELOG.md](../CHANGELOG.md)** - Version history (latest: v4.8.0)
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - How to contribute

### Core Documentation
- **[docs/API.md](API.md)** - Complete API reference
- **[docs/DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment guide (local, Docker, VPS, K8s)
- **[docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Troubleshooting guide
- **[docs/whitepaper.md](whitepaper.md)** - STAR Algorithm whitepaper
- **[specs/spec.md](../specs/spec.md)** - System specification with architecture diagrams
- **[specs/current-standards/](../specs/current-standards/)** - Active architecture standards (001-010)

### Development
- **[engine/src/README.md](../engine/src/README.md)** - Source code overview
- **[tests/README.md](../tests/README.md)** - Testing guide
- **[benchmarks/README.md](../benchmarks/README.md)** - Benchmarking framework
- **[mcp-server/README.md](../mcp-server/README.md)** - MCP server integration
- **[specs/current-standards/022-documentation-hygiene.md](../specs/current-standards/022-documentation-hygiene.md)** - Documentation rules & hygiene

---

## 🎯 Documentation by Use Case

### "I want to install and run Anchor Engine"
→ Start with **[README.md](../README.md)** - Quick Start section

### "I need API documentation"
→ Read **[docs/API.md](API.md)** - Complete API reference with examples

### "I want to deploy to production"
→ Follow **[docs/DEPLOYMENT.md](DEPLOYMENT.md)** - All deployment options

### "Something's not working"
→ Check **[docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and fixes

### "I need to understand the system architecture"
→ Study **[specs/spec.md](../specs/spec.md)** - System specification with diagrams

### "I'm researching the theory behind Anchor Engine"
→ Read **[docs/whitepaper.md](whitepaper.md)** - Academic paper

### "I want to understand the search algorithm"
→ See **[specs/current-standards/004-streaming-search.md](../specs/current-standards/004-streaming-search.md)**

### "How does distillation work?"
→ Read **[specs/current-standards/010-radial-distillation-v2.md](../specs/current-standards/010-radial-distillation-v2.md)**

### "I want to contribute code"
→ Start with **[engine/src/README.md](../engine/src/README.md)** - Source overview

### "I need to write tests"
→ Follow **[tests/README.md](../tests/README.md)** - Testing guide

### "I want to connect via MCP"
→ See **[mcp-server/README.md](../mcp-server/README.md)** - MCP integration

---

## 📊 Key Metrics (v4.8.0)

| Metric | Value | Status |
|--------|-------|--------|
| **Context Retrieval** | 618k chars | ✅ +18% vs whitepaper |
| **Memory Peak** | 510MB | ✅ -70% vs whitepaper |
| **Search Latency** | <200ms (p95) | ✅ Optimized |
| **Ingestion Throughput** | 1,200 mol/sec | ✅ Verified |
| **Deduplication Rate** | 40-50% | ✅ With SimHash |
| **Session Index** | NEW in v4.8.0 | ✅ Two-tier retrieval |
| **MCP Write Ops** | NEW in v4.8.0 | ✅ Opt-in ingest |

---

## 🗂️ Document Structure

```
anchor-engine-node/
├── README.md                      # Start here - Quick start & usage
├── CHANGELOG.md                   # What's new (v4.8.0)
├── CONTRIBUTING.md                # How to contribute
│
├── docs/
│   ├── API.md                     # ✅ NEW - Complete API reference
│   ├── DEPLOYMENT.md              # ✅ NEW - Deployment guide
│   ├── TROUBLESHOOTING.md         # ✅ NEW - Troubleshooting
│   ├── whitepaper.md              # STAR algorithm paper
│   ├── code-patterns.md           # Code patterns
│   ├── INDEX.md                   # This file - navigation hub
│   └── arxiv/                     # arXiv submission docs
│
├── specs/
│   ├── spec.md                    # System spec with diagrams
│   ├── API-ROUTE-MAP.md           # Detailed API spec
│   ├── plan.md                    # Roadmap
│   ├── tasks.md                   # Current tasks
│   ├── current-standards/         # ✅ Active standards (001-010)
│   ├── archive-standards/         # Historical standards (059-200+)
│   └── archive-legacy/            # Legacy docs
│
├── engine/
│   └── src/
│       └── README.md              # ✅ NEW - Source code overview
│
├── tests/
│   └── README.md                  # ✅ NEW - Testing guide
│
├── benchmarks/
│   └── README.md                  # Benchmarking framework
│
└── mcp-server/
    └── README.md                  # MCP server integration
```

---

## 🎓 Learning Path

### Beginner (Just Getting Started)
1. **[README.md](../README.md)** - Installation & first query
2. **[docs/API.md](API.md)** - API basics
3. **[CHANGELOG.md](../CHANGELOG.md)** - Recent features

### Intermediate (Understanding the System)
1. **[specs/spec.md](../specs/spec.md)** - Full system specification
2. **[specs/current-standards/004-streaming-search.md](../specs/current-standards/004-streaming-search.md)** - Search algorithm
3. **[specs/current-standards/010-radial-distillation-v2.md](../specs/current-standards/010-radial-distillation-v2.md)** - Distillation v2.0
4. **[engine/src/README.md](../engine/src/README.md)** - Source overview

### Advanced (Deep Dive)
1. **[docs/whitepaper.md](whitepaper.md)** - Theoretical foundation
2. **[tests/README.md](../tests/README.md)** - Test suite
3. **[specs/current-standards/](../specs/current-standards/)** - All active standards
4. **[docs/DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment

### Contributor (Writing Code)
1. **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Contribution guidelines
2. **[engine/src/README.md](../engine/src/README.md)** - Source structure
3. **[tests/README.md](../tests/README.md)** - Testing requirements
4. **[specs/current-standards/](../specs/current-standards/)** - Architecture standards

---

## 🔬 Recent Updates (v4.8.0 - Mar 18, 2026)

### New Features
- **Session Index** - Two-tier memory retrieval (index → targeted fetch)
- **MCP Write Operations** - `anchor_ingest_text` and `anchor_ingest_file` tools
- **Paste & Ingest UI** - Quick text ingestion via Web UI
- **Philosophy Documentation** - Core principles embedded throughout docs

### New Documentation
- **docs/API.md** - Complete API reference
- **docs/DEPLOYMENT.md** - Deployment guide (all platforms)
- **docs/TROUBLESHOOTING.md** - Troubleshooting by category
- **engine/src/README.md** - Source code overview
- **tests/README.md** - Testing guide

### Documentation Consolidation
- Merged architecture diagrams into `specs/spec.md`
- Archived 7 redundant historical documents
- Updated all links to point to current docs

---

## 📁 Documentation Categories

### User-Facing
| Document | Audience | Purpose |
|----------|----------|---------|
| README.md | All users | Quick start & usage |
| docs/API.md | Developers | API reference |
| docs/DEPLOYMENT.md | DevOps | Deployment guide |
| docs/TROUBLESHOOTING.md | All users | Fix common issues |
| mcp-server/README.md | MCP users | MCP integration |

### Developer-Facing
| Document | Audience | Purpose |
|----------|----------|---------|
| engine/src/README.md | Contributors | Source overview |
| tests/README.md | Contributors | Testing guide |
| benchmarks/README.md | Contributors | Performance testing |
| specs/current-standards/ | Contributors | Architecture standards |

### Academic/Research
| Document | Audience | Purpose |
|----------|----------|---------|
| docs/whitepaper.md | Researchers | STAR algorithm paper |
| specs/spec.md | Architects | System specification |
| docs/arxiv/ | Researchers | arXiv submission |

---

## 🔗 External Resources

- **GitHub Repository:** https://github.com/RSBalchII/anchor-engine-node
- **License:** AGPL-3.0
- **NPM Packages:** @rbalchii/* (native modules)
- **DOI:** https://doi.org/10.5281/zenodo.18841399

---

## 📞 Support & Contribution

### Getting Help
- Check **[docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md)** for common issues
- Review **[specs/spec.md](../specs/spec.md)** for system understanding
- Read **[CHANGELOG.md](../CHANGELOG.md)** for recent fixes

### Contributing
1. Read **[CONTRIBUTING.md](../CONTRIBUTING.md)** for guidelines
2. Review **[engine/src/README.md](../engine/src/README.md)** for source structure
3. Follow **[specs/current-standards/](../specs/current-standards/)** for architecture
4. Run **[tests/README.md](../tests/README.md)** test suite before submitting

---

**Last Updated:** March 18, 2026  
**Version:** 4.8.0  
**Status:** ✅ Production Ready
